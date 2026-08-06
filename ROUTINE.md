# Daily routine

A scheduled Claude cloud agent ships one new free tool every morning. This file is the routine's
instruction set — the schedule points at it, so editing this file changes tomorrow's behaviour.

**Schedule:** cron `0 12 * * *`, which is 07:00 America/Chicago through the summer.
Cloud routines only take UTC, so this becomes 06:00 once the clocks go back — shift the cron to
`0 13 * * *` in November if the earlier slot ever matters.
**Also runs locally:** `scripts/daily.ps1`, Windows scheduled task `usappteam-free-tool-daily` at
07:00. That is the path that actually works today — see SETUP.md for why the cloud one cannot push.
**Repo:** `maty4me/usappteam-tools`
**Live:** https://tools.usappteam.com
**Routine:** "Free Tool of the Day" at `claude.ai/code/routines`

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
- **The FB post can succeed while IG fails.** The state file is written after each platform for
  exactly that reason; re-running resumes rather than reposting.

## Video format

Voiceover + screen walkthrough only. The avatar corner card (Mathias in the bottom-right) was
removed 2026-07-30 at Mathias's request — do not re-add it or any facecam/presenter overlay.
