# Free Tools — Keyword Backlog

**Method:** the "engineering as marketing" playbook (Starter Story / Bhanu, SiteGPT), run with free
data sources instead of Ahrefs.

1. 33 seed keywords drawn from what US APP Team actually sells (app cost, app naming, MVP scope,
   store submission, revenue).
2. Expanded via Google + Bing autocomplete — alphabet soup (`seed a`…`seed z`) plus modifier soup
   (`free`, `calculator`, `generator`, `checker`, `template`, `estimator`, `tool`, `online`).
   1,190 queries → **5,393 unique keywords**.
3. Filtered to app-relevant *tool intent* (calculator/generator/checker/estimator/template/maker),
   3–6 words, junk verticals removed → **948 candidates**.
4. Clustered by head noun to find where the demand actually sits.
5. Difficulty judged by reading the live SERP for each finalist (who ranks, how entrenched).

Volume is a **relative bucket**, not a fake absolute number — H/M/L reflects cluster size in the
autocomplete corpus, which tracks real query frequency.

## Cluster sizes (autocomplete corpus)

| Cluster | Candidates | Read |
|---|---|---|
| icon | 168 | Biggest demand, most crowded SERP |
| cost | 122 | Highest commercial intent, agency-dominated SERP |
| name | 112 | Big, generic-AI-namer SERP |
| screenshot | 45 | Launch-stage, design-tool SERP |
| privacy policy | 45 | Compliance-stage, big-SaaS SERP with soft spots |
| revenue | 22 | Planning-stage, thin SERP |
| wireframe | 21 | Crowded by design SaaS |
| idea | 19 | Thin, low intent |
| logo / quote / terms / requirements | 8 / 7 / 6 / 5 | Long tail |

## Prioritized backlog

Priority = relevance to the offer × low difficulty × low build effort × volume.

| # | Keyword / tool | Volume | Difficulty | Effort | Relevance | Slug | Status |
|---|---|---|---|---|---|---|---|
| 1 | app development cost calculator | H | M — SERP is all dev agencies (Uptech, Agicent, ScienceSoft, Simpalm, Axon) running this same play; beatable with a faster, honest tool | S | 5 — the estimate *is* the qualifying question | `app-cost-calculator` | todo |
| 2 | app name generator | H | M — generic AI namers dominate; few check availability | S | 4 — pre-build stage, exactly our buyer | `app-name-generator` | todo |
| 3 | app privacy policy generator | M-H | M — big paid SaaS (Termly, TermsFeed) but the #1 result is a hobby Firebase app, so the SERP is not locked | S | 4 — store-submission stage | `app-privacy-policy-generator` | todo |
| 4 | app store screenshot generator | M | M — design-tool SERP, mostly paid | M | 4 — launch stage | `app-screenshot-generator` | todo |
| 5 | app icon generator | H | H — appicon.co, makeappicon, easyappicon, convertico all entrenched | M | 3 — build stage | `app-icon-generator` | todo |
| 6 | app revenue calculator | M | L — thin SERP, mostly blog posts, no real tool | S | 4 — business-case stage | `app-revenue-calculator` | todo |
| 7 | app maintenance cost calculator | M | L — almost no dedicated tools | S | 5 — maps to the Care plans | `app-maintenance-cost-calculator` | todo |
| 8 | mvp feature scope / must-have vs nice-to-have | M | L — no tool exists, only blog posts | S | 5 — this *is* the brief conversation | `mvp-scope-planner` | todo |
| 9 | app store description generator | M | M | S | 3 | `app-store-description-generator` | todo |
| 10 | app launch checklist | M | L | S | 3 | `app-launch-checklist` | todo |
| 11 | app store keyword / ASO checker | M | M | M | 3 | `aso-keyword-checker` | todo |
| 12 | subscription revenue / break-even calculator | M | L | S | 4 | `subscription-breakeven-calculator` | todo |
| 13 | app terms of service generator | M | M | S | 3 | `app-terms-generator` | todo |
| 14 | app development timeline estimator | L-M | L | S | 4 | `app-timeline-estimator` | todo |
| 15 | app user retention calculator | L-M | L | S | 3 | `app-retention-calculator` | todo |

## CTA design (playbook step 6)

Every tool closes with the same move: the tool answers the question, then the CTA offers to do the
actual work. Button label **"Start your app brief"** → `https://usappteam.com/app-brief`.

The cost calculator is the sharpest version of this — it ends on a real US APP Team price tier, so
the CTA is the obvious next click rather than an ad bolted onto the bottom.

## Re-running this

`node research/expand.mjs` regenerates the corpus. Re-run monthly, or whenever the backlog drops
below ~10 items — the daily routine does this automatically and appends new candidates.
