# US APP Team — Free Tools

Free, no-signup browser tools for people building a mobile app. Live at
**[tools.usappteam.com](https://tools.usappteam.com)**. A new tool is published every day.

This is [engineering as marketing](https://tools.usappteam.com): each tool answers a question our
buyers are already Googling, and closes with an offer to do the actual build. The tools are genuinely
useful on their own — nothing is gated, nothing asks for an email.

## How it works

```
research/backlog.json      the queue — keyword-prioritized tool ideas
        │
        ▼
tools/<slug>/              one folder per tool. The ONLY thing the daily agent writes.
  tool.json                metadata, SEO, FAQ, video narration
  tool.html                the tool — an HTML fragment, vanilla JS, zero dependencies
  index.md                 the markdown companion AI agents read
  demo.mjs                 Playwright script that drives the demo video
        │
        ▼
scripts/build.mjs          → dist/ : pages, hub, tools.json, sitemap, llms.txt, OG images
.github/workflows/         → renders videos, validates, deploys to GitHub Pages
```

The split is deliberate. A cloud agent writes the creative parts and pushes; CI does everything
deterministic — Chromium, ffmpeg, and the API keys all live there, and a failed step can be re-run
without re-generating the tool.

## Commands

```bash
npm install
npm run build      # tools/ + templates -> dist/
npm run validate   # SEO, schema, and price-whitelist gates (CI runs this before deploy)
npm run smoke      # loads every page in Chromium and proves the tools actually run
npm run serve      # preview dist/ at http://127.0.0.1:8744
```

Video (needs Playwright browsers + ffmpeg):

```bash
npx playwright install chromium
cd video/remotion && npm install && cd ../..
node video/render.mjs <slug>     # record -> voiceover -> Remotion -> media/<slug>/
```

## Adding a tool by hand

Read [`TOOL-SPEC.md`](TOOL-SPEC.md) — it is the binding contract for the four files. Create
`tools/<slug>/`, run `npm run build && npm run validate`, push. CI renders the video and deploys.

## Rules that will fail the build

- **Prices.** The only dollar figures allowed anywhere are US APP Team's published ones:
  $3,500 / $7,500 / $12,000, Care $199 / $399 / $799 per month, store launch $749. `validate.mjs`
  greps `dist/` and fails on anything else. An unattended agent must never invent a number.
- **External scripts.** Tools are self-contained. No CDN, no framework, no build step.
- **Missing markdown.** Every tool needs a substantive `index.md` — it is how AI agents find and
  quote the tool, which is half the point of this site.

## SEO surface

Per tool: title/meta/canonical, OG + Twitter cards, a generated OG image, and JSON-LD for
`SoftwareApplication`, `BreadcrumbList`, `FAQPage`, and `VideoObject` once the video renders. Site
wide: `sitemap.xml`, `robots.txt` (explicitly welcoming GPTBot / ClaudeBot / PerplexityBot),
`llms.txt`, `llms-full.txt`, `tools.json`, and a `.md` version of every tool linked from its page
via `<link rel="alternate" type="text/markdown">`.

## Related

- Main site: [usappteam.com](https://usappteam.com) (GoHighLevel, deployed by hand)
- Start an app brief: [usappteam.com/app-brief](https://usappteam.com/app-brief)
- Daily routine: see [`ROUTINE.md`](ROUTINE.md)
