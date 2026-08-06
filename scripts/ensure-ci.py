# ensure-ci.py - make sure CI actually picked up the current commit.
#
# On 2026-08-06 four pushes to main produced ZERO github-actions runs while a
# manual workflow_dispatch on the same commit ran fine. GitHub created a check
# suite for the push but never started the workflow. The tool page still
# deploys, but nothing renders its demo video, and the failure is invisible -
# there is no run to go red.
#
# So: after a push, wait for a run on this commit. If none appears, dispatch
# the workflow explicitly. Cheap, idempotent, and a no-op when push triggers
# are behaving.
#
# Token comes from Git Credential Manager (the same credential that pushes),
# never from a file and never printed.
#
# Usage: python scripts/ensure-ci.py [--wait 120] [--rerender <slug>]
# Exit 0 = a run exists (or was started). Exit 1 = could not get one going.

import argparse
import json
import subprocess
import sys
import time
import urllib.error
import urllib.request

REPO = "maty4me/usappteam-tools"
WORKFLOW = "publish.yml"


def token():
    p = subprocess.run(["git", "credential", "fill"],
                       input="protocol=https\nhost=github.com\n\n",
                       capture_output=True, text=True)
    for line in p.stdout.splitlines():
        if line.startswith("password="):
            return line.split("=", 1)[1]
    sys.exit("FATAL: no GitHub credential available from Git Credential Manager")


def api(tok, path, method="GET", body=None):
    req = urllib.request.Request(
        "https://api.github.com/repos/" + REPO + path,
        data=json.dumps(body).encode() if body is not None else None,
        method=method)
    req.add_header("Authorization", "Bearer " + tok)
    req.add_header("Accept", "application/vnd.github+json")
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            raw = r.read().decode() or "{}"
            return r.status, (json.loads(raw) if raw.strip() else {})
    except urllib.error.HTTPError as e:
        return e.code, {"error": e.read().decode()[:300]}


def runs_for(tok, sha):
    st, body = api(tok, f"/actions/runs?head_sha={sha}&per_page=5")
    if st != 200:
        return None
    return body.get("workflow_runs", [])


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--wait", type=int, default=120,
                    help="seconds to wait for a push-triggered run before dispatching")
    ap.add_argument("--rerender", default="")
    args = ap.parse_args()

    sha = subprocess.run(["git", "rev-parse", "HEAD"],
                         capture_output=True, text=True).stdout.strip()
    tok = token()

    waited = 0
    while waited < args.wait:
        found = runs_for(tok, sha)
        if found:
            print(f"ensure-ci: run already started for {sha[:7]} -> {found[0]['html_url']}")
            return 0
        time.sleep(10)
        waited += 10

    print(f"ensure-ci: no run appeared for {sha[:7]} in {args.wait}s - dispatching manually")
    st, body = api(tok, f"/actions/workflows/{WORKFLOW}/dispatches", "POST",
                   {"ref": "main", "inputs": ({"rerender": args.rerender}
                                              if args.rerender else {})})
    if st != 204:
        print(f"ensure-ci: dispatch FAILED {st} {body}")
        return 1

    # A dispatch run is not attached to our sha, so confirm by freshness instead.
    for _ in range(12):
        time.sleep(10)
        s2, b2 = api(tok, "/actions/runs?event=workflow_dispatch&per_page=1")
        if s2 == 200 and b2.get("workflow_runs"):
            r = b2["workflow_runs"][0]
            print(f"ensure-ci: dispatched run {r['html_url']} ({r['status']})")
            return 0
    print("ensure-ci: dispatch accepted but no run surfaced")
    return 1


if __name__ == "__main__":
    sys.exit(main())
