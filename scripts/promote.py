# promote.py — publish ONE tool's demo video as a social post for US APP Team.
#
# The "video carousel" promo routine: each run promotes exactly one tool —
# FB Page video post (native 16:9) + IG Reel (padded to 9:16) — walking the
# library in shipped order (first-commit date), then picking up new tools as
# they ship. State lives in scripts/promo/state.json (local, gitignored);
# a slug is never posted twice.
#
# Credentials: op://Claude/Meta - USApp/{credential,page_id,ig_business_id}
# via the global 1Password helper. Never hardcoded, never printed.
#
# Usage:
#   python scripts/promote.py --status                 # queue + what's next
#   python scripts/promote.py --next                   # print next slug + metadata (for the caption writer)
#   python scripts/promote.py --captions cap.json      # publish next tool with these captions
#   python scripts/promote.py --captions cap.json --slug <slug>   # publish a specific tool
#   ... --preflight    validate everything, publish nothing
#   ... --only fb|ig   single platform
#
# cap.json: {"fb": "...", "ig": "..."}  (UTF-8)
#
# Guardrail (same ethos as validate.mjs): any $ figure in a caption outside the
# BRD §6 whitelist fails preflight. Better no price than an invented one.

import argparse
import atexit
import json
import os
import re
import subprocess
import sys
import time
from pathlib import Path

import requests

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
sys.stderr.reconfigure(encoding="utf-8", errors="replace")
sys.path.insert(0, r"C:\Users\mathi\.claude\helpers")
from op_secrets import get as op_get  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
PROMO = ROOT / "scripts" / "promo"
STATE = PROMO / "state.json"
GRAPH = "https://graph.facebook.com/v19.0"
GRAPH_VIDEO = "https://graph-video.facebook.com/v19.0"
RUPLOAD = "https://rupload.facebook.com/ig-api-upload/v19.0"
SITE = "https://tools.usappteam.com"

PRICE_WHITELIST = {"3,500", "3500", "7,500", "7500", "12,000", "12000",
                   "199", "399", "799", "749"}


def creds():
    token = op_get("op://Claude/Meta - USApp/credential", env="META_USAPP_TOKEN")
    page_id = op_get("op://Claude/Meta - USApp/page_id", env="META_USAPP_PAGE_ID")
    ig_id = op_get("op://Claude/Meta - USApp/ig_business_id", env="META_USAPP_IG_ID")
    if not (token and page_id and ig_id):
        sys.exit("FATAL: Meta - USApp credentials not resolvable from 1Password/env")
    return token, page_id, ig_id


def load_state():
    if STATE.is_file():
        return json.loads(STATE.read_text(encoding="utf-8"))
    return {"posted": {}}


def save_state(state):
    PROMO.mkdir(parents=True, exist_ok=True)
    STATE.write_text(json.dumps(state, indent=2), encoding="utf-8")


def shipped_order():
    """Tool slugs ordered by the date tools/<slug>/tool.json first hit git."""
    out = []
    for d in sorted((ROOT / "tools").iterdir()):
        if not (d / "tool.json").is_file():
            continue
        ts = subprocess.run(
            ["git", "log", "--diff-filter=A", "--format=%ct", "--",
             f"tools/{d.name}/tool.json"],
            cwd=ROOT, capture_output=True, text=True).stdout.strip().splitlines()
        first = int(ts[-1]) if ts else 0
        out.append((first or 2**62, d.name))  # uncommitted tools sort last
    return [slug for _, slug in sorted(out)]


def queue(state):
    """Slugs with a rendered video that have not been posted yet, in order."""
    return [s for s in shipped_order()
            if s not in state["posted"]
            and (ROOT / "media" / s / "demo.mp4").is_file()]


def tool_meta(slug):
    return json.loads((ROOT / "tools" / slug / "tool.json").read_text(encoding="utf-8"))


def check_caption(label, text):
    problems = []
    if not text.strip():
        problems.append(f"caption {label}: empty")
        return problems
    for m in re.finditer(r"\$ ?([\d,]+)", text):
        if m.group(1) not in PRICE_WHITELIST:
            problems.append(f"caption {label}: non-whitelisted price ${m.group(1)}")
    if f"{SITE}/tools/" not in text:
        problems.append(f"caption {label}: missing the tool's URL")
    if len(text) > 2100:
        problems.append(f"caption {label}: too long ({len(text)} chars)")
    return problems


def make_vertical(slug):
    """Pad the 16:9 demo onto a 1080x1920 brand-background canvas for Reels."""
    src = ROOT / "media" / slug / "demo.mp4"
    PROMO.mkdir(parents=True, exist_ok=True)
    dst = PROMO / f"{slug}-vertical.mp4"
    if dst.is_file() and dst.stat().st_mtime >= src.stat().st_mtime:
        return dst
    # -video_track_timescale 90000 is load-bearing: IG's rupload rejects the
    # 1080x1920 pad with ffmpeg's default 15360 timescale ("ProcessingFailed",
    # bisected 2026-08-03) but accepts the identical encode at 90k.
    r = subprocess.run(
        ["ffmpeg", "-y", "-i", str(src),
         "-vf", "scale=1080:-2,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:color=0xF6F7F9",
         "-c:v", "libx264", "-preset", "medium", "-crf", "22",
         "-video_track_timescale", "90000", "-c:a", "aac", "-b:a", "128k",
         "-movflags", "+faststart", str(dst)],
        capture_output=True, text=True)
    if r.returncode != 0:
        sys.exit(f"FATAL: ffmpeg vertical render failed:\n{r.stderr[-1500:]}")
    return dst


def publish_fb(token, page_id, video, caption):
    with open(video, "rb") as fh:
        r = requests.post(
            f"{GRAPH_VIDEO}/{page_id}/videos",
            data={"description": caption, "access_token": token},
            files={"source": (Path(video).name, fh, "video/mp4")},
            timeout=1800)
    r.raise_for_status()
    return r.json()


def publish_ig(token, ig_id, video, caption, poll_s=10, max_wait=900):
    r = requests.post(
        f"{GRAPH}/{ig_id}/media",
        data={"media_type": "REELS", "upload_type": "resumable",
              "caption": caption, "share_to_feed": "true",
              "access_token": token},
        timeout=120)
    r.raise_for_status()
    container = r.json()["id"]

    size = Path(video).stat().st_size
    with open(video, "rb") as fh:
        up = requests.post(
            f"{RUPLOAD}/{container}",
            headers={"Authorization": f"OAuth {token}",
                     "offset": "0", "file_size": str(size)},
            data=fh.read(), timeout=1800)
    up.raise_for_status()

    waited = 0
    while waited < max_wait:
        st = requests.get(f"{GRAPH}/{container}",
                          params={"fields": "status_code,status",
                                  "access_token": token},
                          timeout=60).json()
        code = st.get("status_code")
        if code == "FINISHED":
            break
        if code == "ERROR":
            raise RuntimeError(f"IG container error: {st}")
        time.sleep(poll_s)
        waited += poll_s
    else:
        raise RuntimeError("IG container never finished processing")

    pub = requests.post(f"{GRAPH}/{ig_id}/media_publish",
                        data={"creation_id": container, "access_token": token},
                        timeout=300)
    pub.raise_for_status()
    return {"container_id": container, **pub.json()}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--status", action="store_true")
    ap.add_argument("--next", action="store_true")
    ap.add_argument("--slug")
    ap.add_argument("--captions")
    ap.add_argument("--preflight", action="store_true")
    ap.add_argument("--only", choices=["fb", "ig"])
    args = ap.parse_args()

    state = load_state()
    q = queue(state)

    if args.status:
        print(f"posted: {len(state['posted'])}  queued: {len(q)}")
        for s in q:
            print("  todo:", s)
        return

    slug = args.slug or (q[0] if q else None)
    if not slug:
        print("QUEUE EMPTY — every rendered tool has been promoted. "
              "New tools join the queue automatically once their video renders.")
        return
    done = state["posted"].get(slug, {})
    if "fb" in done and "ig" in done and not args.preflight:
        sys.exit(f"ABORT: {slug} was already fully posted on "
                 f"{done.get('date')} — refusing a duplicate. (IG does not "
                 "dedupe.) A partial entry resumes the missing platform only.")

    meta = tool_meta(slug)
    if args.next:
        print(json.dumps({
            "slug": slug,
            "title": meta.get("title"),
            "tagline": meta.get("tagline"),
            "description": meta.get("description"),
            "url": f"{SITE}/tools/{slug}/",
            "queued_after": q[1:4],
        }, indent=2))
        return

    if not args.captions:
        sys.exit("FATAL: --captions <file> required to publish "
                 "(use --next to get the tool metadata first)")
    caps = json.loads(Path(args.captions).read_text(encoding="utf-8-sig"))
    problems = []
    for k in ("fb", "ig"):
        problems += check_caption(k, caps.get(k, ""))
    video_fb = ROOT / "media" / slug / "demo.mp4"
    if not video_fb.is_file():
        problems.append(f"video missing: {video_fb}")
    if problems:
        print("PREFLIGHT FAILED:")
        for p in problems:
            print("  -", p)
        sys.exit(1)

    video_ig = make_vertical(slug)
    print(f"preflight OK — {slug}: fb={video_fb.stat().st_size/1e6:.1f}MB "
          f"ig={video_ig.stat().st_size/1e6:.1f}MB")
    if args.preflight:
        return

    # Cross-process lock: the duplicate-IG-post failure mode is real (TP,
    # 2026-07-12..15). IG cannot delete a Reel via API.
    lock = PROMO / f"{slug}.lock"
    try:
        fd = os.open(lock, os.O_CREAT | os.O_EXCL | os.O_WRONLY)
        os.write(fd, str(os.getpid()).encode())
        os.close(fd)
    except FileExistsError:
        if time.time() - lock.stat().st_mtime < 1800:
            sys.exit(f"ABORT: another promote of {slug} appears to be running.")
        lock.unlink()
        fd = os.open(lock, os.O_CREAT | os.O_EXCL | os.O_WRONLY)
        os.close(fd)
    atexit.register(lambda: lock.unlink(missing_ok=True))

    token, page_id, ig_id = creds()
    entry = state["posted"].get(slug, {})
    entry["date"] = time.strftime("%Y-%m-%d")

    if args.only != "ig" and "fb" not in entry:
        print("FB: uploading…")
        entry["fb"] = publish_fb(token, page_id, video_fb, caps["fb"])
        state["posted"][slug] = entry
        save_state(state)
        print("FB:", entry["fb"])

    if args.only != "fb" and "ig" not in entry:
        print("IG: uploading…")
        entry["ig"] = publish_ig(token, ig_id, video_ig, caps["ig"])
        state["posted"][slug] = entry
        save_state(state)
        print("IG:", entry["ig"])

    print(f"DONE: {slug} promoted. Remaining queue: {len(queue(state))}")


if __name__ == "__main__":
    main()
