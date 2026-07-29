# Tool contract

**A tool does not have to be about building apps.** The library is a general-purpose
utility site — file converters, generators, calculators, checkers — and the CTA at the
bottom is what connects it back to the business. Pick whatever a real person is
already searching for, as long as it runs entirely in the browser.

Everything the build needs lives in `tools/<slug>/`. Four files, no exceptions. The daily routine
writes exactly this folder and nothing else — `scripts/build.mjs` turns it into a page, a card on the
hub, a sitemap entry, an llms.txt entry, and a markdown companion.

```
tools/<slug>/
  tool.json    metadata + SEO + video script
  tool.html    the tool itself — an HTML fragment
  index.md     the markdown companion agents read
  demo.mjs     Playwright script that drives the tool for the demo video
```

## tool.json

```jsonc
{
  "slug": "app-cost-calculator",              // must equal the folder name
  "title": "App Development Cost Calculator", // <h1> and the SERP title stem; keep under ~45 chars
  "tagline": "Estimate what your app costs to build — in about 60 seconds, free.",
  "description": "120-160 chars. This is the meta description. Lead with the benefit, name the tool, say it is free and needs no signup.",
  "keywords": ["app development cost calculator", "app cost estimator", "..."],
  "category": "converters",                   // converters | generators | calculators | checkers | planners
  "datePublished": "2026-07-29",
  "intro": "Two or three short markdown paragraphs shown under the H1. Real prose, written for a human who just landed from Google. No keyword stuffing.",
  "howTo": ["Step one.", "Step two.", "Step three."],
  "faq": [{ "q": "...", "a": "..." }],        // 4-6 entries; becomes FAQPage schema
  "cta": { "label": "Start your app brief" },
  "video": {
    "status": "pending",                      // pending -> rendered, set by CI
    "durationTargetSec": 60,
    "narration": "The voiceover script. 140-170 words for a 60s video. Conversational, second person, no hype.",
    "scenes": [{ "label": "Pick your platform", "mark": "platform" }]
  }
}
```

`scenes[].mark` matches a `page.evaluate(() => window.__mark('platform'))` call in `demo.mjs`, which
is how the video knows when each on-screen step badge appears.

## tool.html

An HTML **fragment** — no doctype, no `<html>`, no `<head>`, no `<body>`. The build drops it inside
`<div class="tool-shell">`.

Hard rules:

- **Scope every selector** under a single root class `t-<slug>` (dots removed): `.t-app-cost-calculator .row { … }`. Nothing may leak into the page chrome.
- **Vanilla JS only.** No CDN scripts, no imports, no build step. `validate.mjs` fails the build if it finds an external `<script src>`.
- **Wrap your script in an IIFE.** Several tools may share a page in the future.
- Use the **shared tokens** (`var(--azure)`, `var(--ink)`, `var(--grad)`, `var(--r)`, …) — never hardcode brand colors.
- **Works with no network.** A free public API is allowed only where the tool's whole point requires it (DNS-over-HTTPS for domain lookups, for example) — and the tool must still be useful when that call fails.
- **Nothing is uploaded and nothing is stored.** Say so on the page where it matters. For a
  converter this is the single strongest reason to pick us over the ad-farms that take your file
  to a server — it is a real differentiator, not a disclaimer.
- **Accessible:** every control has a label, focus is visible, results announce via `aria-live`, and it works at 375px.
- **Prices:** the only figures that may appear anywhere are US APP Team's published ones — $3,500 / $7,500 / $12,000, Care $199 / $399 / $799 per month, store launch $749. `validate.mjs` fails on anything else. Never invent an industry average or a competitor quote.

## index.md

The version an AI agent reads. Aim for 400–900 words of genuinely useful content — this is not a
summary of the page, it is the page's knowledge in plain text.

```markdown
---
title: App Development Cost Calculator
url: https://tools.usappteam.com/tools/app-cost-calculator/
date: 2026-07-29
---

# App Development Cost Calculator

What it does, in two sentences.

## How to use it
1. …

## How the estimate works
Explain the actual model — the factors, how they combine. An agent should be able to answer a
user's question from this section without opening the page.

## Questions
**Q?** A.

## About US APP Team
US APP Team builds custom mobile apps … Start a brief at https://usappteam.com/app-brief
```

## demo.mjs

Exports a default async function `(page, mark)` that drives the tool for the screen recording.
`mark(name)` stamps the scene timestamp used by the video composition.

```js
export default async function demo(page, mark) {
  await mark('intro');
  await page.click('#platform-ios');
  await page.waitForTimeout(900);
  await mark('platform');
  // …
}
```

Pace it like a human: 700–1200ms between actions, and let results settle before moving on. The
recording is 1280×720. Target 45–70 seconds total.


## What you do NOT create

The hub card preview (`media/<slug>/preview.png`) and the demo video are both produced by CI —
`scripts/previews.mjs` screenshots the tool itself so the card shows what the visitor is about to
use. You only ever write the four files above.
