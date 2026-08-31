# Build routine

A scheduled task ships one new free tool on Monday, Wednesday and Friday. This file is the routine's
instruction set — the schedule points at it, so editing this file changes tomorrow's behaviour.

**Schedule:** Windows scheduled task `usappteam-free-tool` — **Monday, Wednesday, Friday at 07:00**,
via `scripts/daily.ps1`. `StartWhenAvailable` is set, so a sleeping machine catches up rather than
skipping. Change the cadence with `.\scripts\daily.ps1 -Install -Days Monday,Thursday -Time 08:00`.

**Authentication — the thing that breaks it.** A scheduled shell does not inherit an interactive
`claude` login. Every run between 2026-08-06 and 08-07 died on *"Not logged in"* before building
anything. Headless runs need a long-lived token:

```
claude setup-token          # once, in an interactive terminal
```

then set what it issues as the **`CLAUDE_CODE_OAUTH_TOKEN`** user environment variable so the task
inherits it. `daily.ps1` now probes auth before it builds and exits 2 with that instruction rather
than burning the slot.

**Repo:** `maty4me/usappteam-tools`
**Live:** https://tools.usappteam.com

## Sequence

1. **Pull** `main`.

2. **Resume before you start.** In order:
   - Any item in `research/backlog.json` with `status: "building"` — a previous run died mid-flight.
     Finish it instead of starting something new.
   - Any open GitHub issue labelled `video-failed` — re-run its render with
     `gh workflow run publish.yml -f rerender=<slug>`, close the issue when the video lands, then
     continue to a new tool.

3. **Pick the next tool.** First `status: "todo"` in `research/backlog.json` (the file is already
   ordered by priority: relevance × low difficulty × low effort × volume). Set it to `"building"`.

   **Before you build, check `tools/<slug>/` does not already exist.** The folder on disk is the
   truth, not the backlog — a run that shipped a tool but died before writing the status back would
   otherwise rebuild it and overwrite good work. If the folder is there, mark that item `"live"`,
   commit the correction, and move to the next `todo`.

   If nothing is `todo`, run the research step instead (see below), notify, and stop for the day.

4. **Build it.** Read `TOOL-SPEC.md` and create `tools/<slug>/` with all four files. This is the
   creative work — the tool must be genuinely good, not a stub. It should be better than whatever is
   currently ranking for the keyword, and it must be honest about its limits.

   The tool does **not** have to be about building apps — file converters, generators and everyday
   utilities all count, and the CTA at the bottom is what ties the library back to the business.

   Non-negotiables:
   - Vanilla JS, self-contained, no external scripts, works at 375px, accessible.
   - Nothing uploaded, nothing stored — and say so on the page.
   - **Never invent a price.** Only $3,500 / $7,500 / $12,000 / $199 / $399 / $799 / $749.
   - `index.md` carries real knowledge, not a summary of the page.

5. **Verify locally.** `npm install && npm run build && npm run validate`. Both must be green.
   Smoke-test the tool's JS actually runs (`npm run serve`, load the page, exercise it).

   If validate fails three times on the same tool, set the backlog item to `"skipped"` with a
   `reason`, move to the next `todo`, and mention it in the notification.

6. **Push** to `main` with a conventional commit (`feat(tools): add <slug>`).

   If the push is rejected for **authentication** rather than for being behind, stop and say so
   plainly in your report — retrying will not help. Leave the backlog item as `"building"` so
   tomorrow resumes it, and include the tool's four files in your report so nothing you wrote is
   lost. Do include them even if they are large: the container is destroyed when the run ends, and a
   report without them means the work is gone.

   **Known instance of this, 2026-07-30.** A run built the App Store Screenshot Generator, verified
   it, and could not ship it: `git push` returned **HTTP 403 on git-receive-pack** while fetch
   worked fine, and the GitHub App path failed identically with *"Resource not accessible by
   integration"*. Re-attaching the repo with `access: "push"` returned `already_present` and changed
   nothing. Cause: the Claude GitHub App installation has read access to this repo but not
   `contents: write`. It is a permission grant, not a transient failure, and it blocks every run
   until an owner fixes it — see SETUP.md.

   If the push is rejected as **non-fast-forward**, `git pull --rebase origin main` and push again.

7. **Watch CI.** `gh run watch` on the triggered `publish.yml`, 30-minute timeout. The render job is
   `continue-on-error` — a video failure does not stop the deploy, it opens a `video-failed` issue
   and the page ships without a video block.

8. **Verify live.** Run `npm run audit`. It checks the deployed site — every tool must have a page
   carrying its `<h1>`, a video, a captions track, a card preview, a markdown companion, and be
   listed in the hub, the sitemap and `llms.txt`. It exits non-zero if anything is missing, and CI
   runs it after every deploy too.

   Do not treat a rendered video as proof of a good video. Two tools once shipped with digitally
   silent audio and empty caption files because a voiceover failure fell through to a silent render;
   that path is now fatal, and the audit checks the captions track precisely because an empty one is
   the tell.

9. **Update the backlog.** Set the item to `"live"` with the publish date. Append a line to
   `research/shipped.md`.

10. **Notify Mathias** with: tool name and URL, whether the video rendered, how many `todo` items
    remain, and anything that needed a human. Keep it to a few lines.

## When the backlog runs dry

Re-run the keyword research rather than inventing ideas:

```bash
node research/expand.mjs           # google + bing autocomplete expansion
```

Then filter for tool intent — app-related or any everyday utility people search for by name — judge
difficulty by reading the live SERP for each finalist (who ranks, how entrenched), and append at
least 5 scored candidates to
`research/backlog.json` and the table in `research/keyword-backlog.md`. Same method as the original
run — it is documented at the top of `keyword-backlog.md`.

## Failure handling, summarised

| What broke | What the routine does |
|---|---|
| Video render | Ship the page without a video; `video-failed` issue is opened by CI; retry tomorrow |
| Deploy | Leave the item `"building"`, report the failing step's log; do **not** blind-retry the push |
| `validate` fails 3× | Mark `"skipped"` with a reason, move to the next item, flag it |
| Backlog empty | Run the research step, notify, stop |
| Live check fails | Report it — do not mark the item `"live"` |

## Things that stay manual

- DNS for `tools.usappteam.com` (GoHighLevel domain settings).
- Adding the "Free Tools" link and teaser page to the GoHighLevel site — that site deploys by hand.

## When the routines go quiet, check these three things

Both routines died silently from 2026-08-03 to 08-06 and shipped nothing. Three separate faults,
each of which produced no error anyone would see:

1. **The .ps1 files did not parse.** They were UTF-8 with no BOM and contained an em-dash. Task
   Scheduler runs `powershell.exe` (Windows PowerShell 5.1), which reads a BOM-less script as
   cp1252 — the em-dash decoded into a stray smart quote, which PowerShell treats as a real string
   delimiter, so the file failed to parse. A parse error happens before line 1 runs, so no log was
   written, which made "no logs" look like "never ran". **Keep these scripts ASCII-only and BOM'd.**
2. **git's stderr aborted the run.** With `$ErrorActionPreference = 'Stop'`, ordinary git progress
   chatter on stderr raises `NativeCommandError` and kills the script. Git calls now go through a
   wrapper that checks the exit code instead.
3. **The `claude` CLI is not logged in.** `~/.claude/.credentials.json` has `expiresAt: 0`, and
   `claude -p` answers `Not logged in · Please run /login` even with a clean environment. The
   routine's build step is a `claude -p` handoff, so it cannot work until someone runs `claude`
   interactively once and signs in. **This is a human step — no script can do it.**

`scripts/healthcheck.ps1` (task `usappteam-routine-healthcheck`, 18:00 daily) now checks all of
this: it parse-tests every routine script under 5.1, verifies the tools are on PATH for a
`-NoProfile` run, reports any non-zero task exit code, and fails if no tool has been committed in
two days. Run it by hand any time you suspect the pipeline is asleep.

### The second silent outage, 2026-08-05 to 08-13 (nine days, no social posts)

The promo routine failed identically every day for nine days and nobody was told. Fixed 08-14:

1. **The alarm was already crying wolf.** `healthcheck.ps1` checked a scheduled task named
   `usappteam-free-tool-daily`, which has never existed - the build task is `usappteam-free-tool`.
   So the healthcheck exited 1 on a false positive *every single day*, and a permanently red check
   carries no information. That is the real reason nine days passed unnoticed. **When you add a
   check here, verify it can also pass.**
2. **`promote-daily.ps1` had no auth preflight.** `daily.ps1` got one on 08-07; the promo script did
   not. Every run hit `Not logged in` at the `claude -p` handoff and logged only
   `FAILED: <slug> did not publish`, which reads like an upload problem and sends you looking in the
   wrong place. It now probes auth first and exits **2** (distinct from a publish failure).
3. **A token can exist and still not be seen.** A process keeps the environment block it was born
   with, so a shell started before `CLAUDE_CODE_OAUTH_TOKEN` was set never sees it - a valid token
   looks exactly like "not logged in". Both scripts now read the persisted User/Machine value onto
   their own environment before probing. Assign it to `$env:` and let children inherit; never pass a
   token as a command-line argument.
4. **Nothing reached a human.** A red `LastTaskResult` is invisible unless you open Task Scheduler.
   The healthcheck now pushes real problems to the phone over the same ntfy topic the lead watcher
   uses (`op://Claude/ntfy - USAppTeam/credential`).
5. **The healthcheck watched shipping but not posting.** It now also fails when the newest entry in
   `scripts/promo/state.json` is two or more days old *while tools are queued* - an empty queue is
   not a fault. This is the check that would have said "no post since the 5th" on the 7th.
6. **A dirty tree stopped the queue advancing.** `pull --rebase` refuses outright on unstaged
   changes, and the promo queue is built from rendered videos in `media/<slug>/`, so a tree that
   never pulls never sees a newly shipped tool. `mvp-scope-planner` was invisible to the queue for
   this reason. Now `pull --rebase --autostash` - **not** a bare `git stash push`, because
   `research/backlog.json` carries live `"building"` state that a stash nobody pops would roll
   backwards.

Logs are also written `-Encoding utf8` now; the old default interleaved UTF-16 bytes into an ASCII
file, which is why the failure line rendered as `N o t   l o g g e d   i n` and nothing could grep
these logs for a reason.

## The promo routine (separate, 12:30 daily)

`scripts/promote-daily.ps1`, Windows scheduled task `usappteam-free-tool-promo`. It publishes **one
tool per post** — never a roundup — as an FB Page video plus an IG Reel, walking the library in
shipped order and picking up each new tool automatically once its video renders.

`scripts/promote.py` owns the queue, the captions guardrail and the publish; Claude only writes the
caption text. Splitting it that way keeps the irreversible step deterministic.

```bash
python scripts/promote.py --status     # queue + what is next
python scripts/promote.py --next       # next tool's metadata, for the caption writer
python scripts/promote.py --captions <file> --preflight
```

State is `scripts/promo/state.json` (gitignored, local). A slug that has fully posted is refused a
second time — **IG cannot delete a Reel via API**, so duplicates are unrecoverable. A partial entry
(FB landed, IG did not) resumes only the missing platform.

Two things that cost real time on 2026-08-03 and will again:

- **IG rupload rejects the vertical pad at ffmpeg's default timescale.** The 1080×1920 padded encode
  returns `ProcessingFailedError` — no useful detail — until `-video_track_timescale 90000` is set.
  Identical encode, same everything else, 400 vs 200. Bisected against the unpadded source, which
  always uploaded fine.
- **IG also rejects this account's Reels past ~45s.** Bisected 2026-08-14: 38s and 45s uploaded,
  50s/55s/58s failed even at reduced bitrate, so it is duration and not filesize. `app-cost-calculator`'s
  59s Reel went through on 08-03, so the ceiling is recent and on Meta's side. Every demo we ship runs
  52–62s, so **all of them** hit it. `make_vertical()` now fits the IG cut to `IG_MAX_SECONDS` by
  speeding it up (`setpts` + `atempo`, which preserves pitch) rather than truncating — a hard cut at
  45s would drop the last ten seconds of every Reel, which is where the CTA is. Facebook still gets
  the original full-length video. If ffprobe cannot read the duration it falls back to a hard `-t`
  cap, on the grounds that losing the tail beats not posting.
- **The FB post can succeed while IG fails.** The state file is written after each platform for
  exactly that reason; re-running resumes rather than reposting.

### The posts looked like blank tiles in the feed (fixed 2026-08-14)

Both platforms take the **first frame** of the video as the feed thumbnail, and the demos open on an
empty canvas — frame zero is byte-identical across every tool and encodes to 4.6 KB. So every post
scrolled past looking blank.

`promote.py` now builds a **social cut** for each platform rather than posting the raw file, and
Facebook gets one too (it was posting `media/<slug>/demo.mp4` directly, so it had the same problem):

- `pick_still()` samples the middle 20–80% of the demo and takes the busiest frame. That band skips
  the intro and the outro CTA card, and "busiest" is a good proxy for "the tool is on screen doing
  something" — a dense screenshot encodes larger than a near-empty one. No per-tool configuration,
  which matters as new tools ship. Verified across all nine queued tools.
- That still is held opaque for `HOLD_SECONDS` (0.5s) and then dissolved out, so the video opens on a
  real screenshot instead of nothing.
- The dissolve length is measured in **demo seconds** (`INTRO_COVER_DEMO_S`), not output seconds,
  because the IG cut is sped up and the FB cut is not — the same moment lands at two different
  wall-clock times on the two cuts. Getting this wrong is how an earlier attempt ended its crossfade
  exactly inside the blank gap described below.

**Do not raise `INTRO_COVER_DEMO_S` past 1.0 without looking at the result.** The demo intro is not
dead air: a branded title card (`FREE TOOL / <name> / tools.usappteam.com`) fades up and is fully
legible by 1.0s. The still is timed to dissolve exactly as that card arrives, so the branding
survives. Covering further buries it.

**Known and deliberately left alone:** every demo fades its title card out to a *fully blank frame*
at 1.80–1.85s before cutting to the page at 1.90s. In the finished cut that is 2–3 frames and reads
as a hard cut. It is a flaw in the demo render, not in the posting, and papering over it would mean
covering the title card. Fixing it belongs in the video pipeline.

Derived cuts are cached in `scripts/promo/` (gitignored) and rebuild automatically when the recipe
changes — `_fresh()` compares against `promote.py`'s own mtime, so an edit here invalidates them
rather than silently serving cuts built by the old recipe.

## Video format

Voiceover + screen walkthrough only. The avatar corner card (Mathias in the bottom-right) was
removed 2026-07-30 at Mathias's request — do not re-add it or any facecam/presenter overlay.
