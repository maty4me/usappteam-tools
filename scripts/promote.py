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
import shutil
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


# The demos open on an empty canvas and fade in over about two seconds, so
# frame zero is blank - and frame zero is exactly what both platforms use as the
# feed thumbnail. Every post therefore scrolled past looking like a blank tile.
# Holding a real screenshot of the tool over the opening fixes the thumbnail and
# the scroll-past impression in one move, on both platforms.
HOLD_SECONDS = 0.5

# ...but a hard cut at 0.5s would land straight back on the blank canvas the
# demo is still fading up from - screenshot, flash of nothing, content. So the
# still is held opaque for HOLD_SECONDS and then dissolved out across the rest
# of the intro, reaching zero only once the demo is showing real content. Only
# HOLD_SECONDS is added to the runtime; the crossfade overlaps the demo.
#
# Measured in DEMO seconds, not output seconds, because the IG cut is sped up
# and the FB cut is not - the same moment lands at two different wall-clock
# times.
#
# Deliberately stops at 1.0s. The demo's intro is not dead air: a branded title
# card ("FREE TOOL / <name> / tools.usappteam.com") fades up and is fully
# legible by 1.0s, and covering it would throw away the branding. Only the
# blank frames before it are the problem, so the still dissolves out exactly as
# the card arrives. The intro is identical in every demo the pipeline renders -
# frame zero is byte-identical across tools - so one figure fits all.
#
# Not covered, deliberately: each demo also fades the title card out to a fully
# blank frame at 1.80-1.85s before cutting to the page at 1.90s. That is ~3
# frames and reads as a hard cut, and it is a flaw in the demo render rather
# than in the posting. Stretching the still over it would bury the title card.
INTRO_COVER_DEMO_S = 1.0

# Narration starts at 00:00:00.000, so trimming the blank intro is not an
# option - it would cut the first words. Covering it is.

# Bump when the encode recipe changes so cached cuts in scripts/promo/ rebuild
# instead of silently serving the old recipe. Comparing against this file's own
# mtime means that happens automatically on any edit here.
RECIPE_MTIME = Path(__file__).stat().st_mtime


def _fresh(dst, src):
    """True when dst is newer than both the source video and this recipe."""
    return dst.is_file() and dst.stat().st_mtime >= max(src.stat().st_mtime, RECIPE_MTIME)


# IG's rupload rejects this account's padded Reels past roughly 45 seconds.
# Bisected 2026-08-14 on app-name-generator: 38s and 45s uploaded, 50s/55s/58s
# all returned ProcessingFailedError even at reduced bitrate, which rules out
# filesize. app-cost-calculator's 59s Reel went through on 08-03, so the ceiling
# is recent and on Meta's side. Capping here rather than hand-trimming each time.
IG_MAX_SECONDS = 45


def duration_s(path):
    """Source duration in seconds, or None if ffprobe cannot tell us.

    Only ever used to decide whether to WARN. The cap itself is applied
    unconditionally, so a missing or broken ffprobe costs us the message, not
    the upload.
    """
    try:
        r = subprocess.run(
            ["ffprobe", "-v", "error", "-show_entries", "format=duration",
             "-of", "default=noprint_wrappers=1:nokey=1", str(path)],
            capture_output=True, text=True)
        return float(r.stdout.strip())
    except (OSError, ValueError):
        return None


def pick_still(slug, src):
    """Pick a frame that actually shows the tool, to open the social cut with.

    Deliberately samples only the middle 20-80% of the clip: the front is the
    fade-in from an empty canvas (the very thing we are fixing) and the tail is
    the outro CTA card, which is mostly flat background. Within that band the
    busiest frame is the best proxy for "the tool is on screen and doing
    something" - a dense screenshot encodes larger than a near-empty one - and
    it needs no per-tool configuration, which matters for a routine that has to
    keep working as new tools ship.
    """
    dst = PROMO / f"{slug}-still.png"
    if _fresh(dst, src):
        return dst

    dur = duration_s(src)
    lo, span = (dur * 0.2, dur * 0.6) if dur else (2.0, 20.0)
    tmp = PROMO / f"_{slug}-cand"
    if tmp.is_dir():
        shutil.rmtree(tmp, ignore_errors=True)
    tmp.mkdir(parents=True, exist_ok=True)

    subprocess.run(
        ["ffmpeg", "-v", "error", "-y", "-ss", f"{lo:.2f}", "-t", f"{span:.2f}",
         "-i", str(src), "-vf", "fps=1/2", "-frames:v", "24",
         str(tmp / "c%03d.png")], capture_output=True, text=True)
    cands = sorted(tmp.glob("*.png"), key=lambda p: p.stat().st_size)

    if cands:
        shutil.copyfile(cands[-1], dst)
    else:
        # Sampling failed for some reason; a fixed offset still beats the blank
        # first frame we are here to get rid of.
        subprocess.run(
            ["ffmpeg", "-v", "error", "-y", "-ss", f"{max((dur or 10) * 0.35, 1):.2f}",
             "-i", str(src), "-frames:v", "1", str(dst)],
            capture_output=True, text=True)
    shutil.rmtree(tmp, ignore_errors=True)
    return dst if dst.is_file() else None


def make_cut(slug, vertical):
    """Build the social cut: HOLD_SECONDS of a real screenshot, then the demo.

    Both platforms take the first frame as the feed thumbnail, so both get the
    held frame. Only the IG cut is reframed to 9:16 and fitted to the duration
    ceiling; Facebook keeps the native 16:9 at full length.
    """
    src = ROOT / "media" / slug / "demo.mp4"
    PROMO.mkdir(parents=True, exist_ok=True)
    dst = PROMO / (f"{slug}-vertical.mp4" if vertical else f"{slug}-fb.mp4")
    if _fresh(dst, src):
        return dst

    still = pick_still(slug, src)
    dur = duration_s(src)

    if vertical:
        frame = ("scale=1080:-2,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:color=0xF6F7F9,"
                 "setsar=1,fps=30,format=yuv420p")
    else:
        frame = "scale=1280:720,setsar=1,fps=30,format=yuv420p"

    # Every demo we ship runs 52-62s, so all of them exceed IG's ceiling.
    # Cutting at 45s would drop the last ten seconds of every Reel, which is
    # where the CTA lives. Speeding the whole thing up to fit keeps the full
    # walkthrough and the ending; at 1.2-1.4x a screen demo still reads fine,
    # and atempo preserves pitch so the voiceover stays human. The held frame
    # is part of the budget, so the body has to fit the ceiling minus the hold.
    speed, budget = 1.0, IG_MAX_SECONDS - HOLD_SECONDS
    hard_cap = []
    if vertical:
        if dur and dur > budget:
            speed = dur / budget
            print(f"NOTE: {slug} demo is {dur:.0f}s, over IG's {IG_MAX_SECONDS}s "
                  f"ceiling for this account; the IG cut is sped {speed:.2f}x to fit "
                  f"with nothing removed. The FB post keeps the original {dur:.0f}s.")
        elif not dur:
            # Duration unknown (ffprobe missing or unparseable). Hard-cap so we
            # can never blow the ceiling; losing the tail beats not posting.
            hard_cap = ["-t", f"{budget}"]

    # Convert the cover window from demo seconds to output seconds. At the end
    # of the crossfade the demo is INTRO_COVER_DEMO_S into itself whatever the
    # speed, so the still always outlasts the blank intro on both cuts.
    xfade = INTRO_COVER_DEMO_S / speed
    intro_cover = HOLD_SECONDS + xfade

    # xfade consumes its duration as overlap, so the body's video and its audio
    # both begin at HOLD_SECONDS and stay in sync: video via the xfade offset,
    # audio via the silence prepended ahead of it.
    fc = (
        f"[0:v]{frame}[v0];"
        f"[1:v]setpts=PTS/{speed:.6f},{frame}[v1];"
        f"[v0][v1]xfade=transition=fade:"
        f"duration={xfade:.6f}:offset={HOLD_SECONDS}[v];"
        f"anullsrc=channel_layout=stereo:sample_rate=48000,"
        f"atrim=duration={HOLD_SECONDS}[a0];"
        f"[1:a]atempo={speed:.6f},"
        f"aformat=sample_fmts=fltp:sample_rates=48000:channel_layouts=stereo[a1];"
        f"[a0][a1]concat=n=2:v=0:a=1[a]"
    )

    # -video_track_timescale 90000 is load-bearing: IG's rupload rejects the
    # 1080x1920 pad with ffmpeg's default 15360 timescale ("ProcessingFailed",
    # bisected 2026-08-03) but accepts the identical encode at 90k.
    r = subprocess.run(
        ["ffmpeg", "-y", "-loop", "1", "-t", f"{intro_cover:.6f}", "-i", str(still),
         "-i", str(src), "-filter_complex", fc, "-map", "[v]", "-map", "[a]",
         *hard_cap,
         "-c:v", "libx264", "-preset", "medium", "-crf", "22",
         "-video_track_timescale", "90000", "-c:a", "aac", "-b:a", "128k",
         "-movflags", "+faststart", str(dst)],
        capture_output=True, text=True)
    if r.returncode != 0:
        kind = "vertical" if vertical else "horizontal"
        sys.exit(f"FATAL: ffmpeg {kind} render failed:\n{r.stderr[-1500:]}")
    return dst


def make_vertical(slug):
    return make_cut(slug, vertical=True)


def make_horizontal(slug):
    return make_cut(slug, vertical=False)


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
    source = ROOT / "media" / slug / "demo.mp4"
    if not source.is_file():
        problems.append(f"video missing: {source}")
    if problems:
        print("PREFLIGHT FAILED:")
        for p in problems:
            print("  -", p)
        sys.exit(1)

    # Facebook gets a built cut too, not the raw demo: it takes the first frame
    # as the feed thumbnail exactly like IG does, and the raw demo's first frame
    # is the blank canvas the fade-in starts from.
    video_fb = make_horizontal(slug)
    video_ig = make_vertical(slug)
    print(f"preflight OK — {slug}: fb={video_fb.stat().st_size/1e6:.1f}MB "
          f"ig={video_ig.stat().st_size/1e6:.1f}MB "
          f"(both open on a {HOLD_SECONDS}s held screenshot)")
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
