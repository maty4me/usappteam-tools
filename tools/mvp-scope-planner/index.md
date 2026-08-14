---
title: MVP Scope Planner
url: https://tools.usappteam.com/tools/mvp-scope-planner/
date: 2026-08-14
---

# MVP Scope Planner

Turns a feature wish list into three honest buckets - ship in v1, fast-follow, and later - by
scoring each feature's impact against how much it costs to build. It runs entirely in the browser,
needs no signup, and stores nothing.

## How to use it

1. Start from the pre-filled example list, or clear it and add your own features with "+ Add
   feature".
2. For each feature, rate its **impact** on users (Low, Medium, High) and the **effort** to build
   it (Small, Medium, Large).
3. Check **"Required to launch"** for anything the app cannot function without - account creation
   on a social app, for example. It skips scoring and goes straight into the MVP.
4. Read the three buckets: Ship in v1 (MVP), Fast-follow (v1.1), and Later / backlog.
5. Check the suggested starting price tier at the bottom, based on how much your MVP bucket
   actually costs to build.

## How the scoring works

**Every feature scores impact divided by effort.** Impact and effort are each rated Low/Medium/High
(or Small/Medium/Large for effort) and mapped to 1, 2 or 3. The score is impact over effort - the
same bang-for-the-buck ratio behind the ICE and RICE prioritization frameworks used by real product
teams. A High-impact, Small-effort feature scores 3; a Low-impact, Large-effort feature scores
0.33. Higher scores ship sooner.

**The score sorts into three buckets, not two.** A binary "in or out" list hides real information -
a feature can be a poor fit for launch without being worthless. The thresholds are:

- **Ship in v1 (MVP)** - score of 1.5 or higher. High impact for the effort it costs.
- **Fast-follow (v1.1)** - score between 0.75 and 1.5. Worth building soon after launch, once the
  MVP is out the door.
- **Later / backlog** - score below 0.75. Either the impact doesn't justify the effort yet, or it's
  a genuinely low-impact feature on its own.

**"Required to launch" is separate from scoring entirely.** Some features aren't optional no matter
how they'd score - a marketplace app can't launch without payments, a social app can't launch
without account creation. Checking this box on a feature skips the impact/effort math and puts it
straight into the MVP bucket, tagged "Required" instead of a score-based reason. This keeps
non-negotiable infrastructure from getting mis-sorted by a scoring model that was never meant to
judge it.

**The suggested tier is a starting point, not a quote.** The planner totals the effort points of
everything actually in your MVP bucket (Small = 1, Medium = 2, Large = 3) and maps that total to US
APP Team's own pricing tiers: 6 points or fewer suggests a Simple app ($3,500), up to 12 points
suggests a Standard app ($7,500), and anything above that suggests a Complex app ($12,000). It only
counts what you're actually shipping first, not your whole wish list - which is the entire point of
scoping an MVP in the first place.

## Why effort is rated Small/Medium/Large instead of hours

Before anything is built, a precise hour estimate is false precision - nobody actually knows yet.
Three buckets are honest about what's knowable this early, and they're enough to tell a quick win
from a multi-week feature. If a single feature is a project on its own, it's worth scoping as its
own release rather than one line in this list.

## Questions

**How does the planner decide what's in the MVP?** Impact divided by effort, using the same logic
behind ICE and RICE prioritization. Anything marked "Required to launch" skips scoring and goes
straight in regardless of how it would score.

**What's the difference between Fast-follow and Later?** Fast-follow is worth building soon after
launch - usually real impact that costs a bit more than a quick win, or a low-effort feature with
modest impact. Later is everything else: high effort for what it returns right now, or low impact
on its own. Neither bucket means "never," just "not this release."

**Should a genuinely huge feature just be rated Large?** Yes - rate it Large and let the score do
its job. A high-effort feature needs an outsized impact to earn a place in v1, and the planner will
push it toward Fast-follow or Later unless it truly justifies the cost.

**How is the suggested starting tier calculated?** It totals the effort points of everything in the
MVP bucket and maps that total to US APP Team's own pricing tiers - Simple ($3,500), Standard
($7,500), or Complex ($12,000). It's a rough starting point tied to your actual v1 scope, not a
quote.

**Is anything sent to a server?** No. The whole thing is JavaScript running in your browser.
Nothing is uploaded, nothing is saved, and closing the tab erases it.

## About US APP Team

US APP Team builds custom iOS and Android apps for a fixed price, from one codebase to both stores.
Once you know what your MVP actually is, start a brief at https://usappteam.com/app-brief
