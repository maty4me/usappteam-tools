# Daily routine

A scheduled Claude cloud agent ships one new free tool every morning. This file is the routine's
instruction set — the schedule points at it, so editing this file changes tomorrow's behaviour.

**Schedule:** 07:00 America/Chicago, daily.
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
   plainly in your report — the cloud environment's GitHub credentials need fixing and no amount of
   retrying will help. Leave the backlog item as `"building"` so tomorrow resumes it, and include
   the tool's four files as a diff in your report so nothing you wrote is lost.

   If the push is rejected as **non-fast-forward**, `git pull --rebase origin main` and push again.

7. **Watch CI.** `gh run watch` on the triggered `publish.yml`, 30-minute timeout. The render job is
   `continue-on-error` — a video failure does not stop the deploy, it opens a `video-failed` issue
   and the page ships without a video block.

8. **Verify live.** All of these must pass before the run is considered done:
   - `https://tools.usappteam.com/tools/<slug>/` returns 200 and contains the `<h1>`
   - `/sitemap.xml` and `/llms.txt` both list the new URL
   - `/tools/<slug>.md` returns 200 and is non-trivial
   - `/media/<slug>/demo.mp4` returns 200 (or the video-failed issue is open)

9. **Update the backlog.** Set the item to `"live"` with the publish date. Append a line to
   `research/shipped.md`.

10. **Notify Mathias** with: tool name and URL, whether the video rendered, how many `todo` items
    remain, and anything that needed a human. Keep it to a few lines.

## When the backlog runs dry

Re-run the keyword research rather than inventing ideas:

```bash
node research/expand.mjs           # google + bing autocomplete expansion
```

Then filter for app-relevant tool intent, judge difficulty by reading the live SERP for each
finalist (who ranks, how entrenched), and append at least 5 scored candidates to
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
- Reviewing the Veo avatar loops before they are committed.
