---
title: App User Retention Calculator
url: https://tools.usappteam.com/tools/app-retention-calculator/
date: 2026-09-16
---

# App User Retention Calculator

Turns your Day 1, Day 7 and Day 30 retention numbers into a projected curve out to a year, and checks
whether those three numbers even describe a smooth decay. Runs entirely in the browser, needs no
signup, and stores nothing.

## How to use it

1. Enter the size of the cohort you're measuring - how many users started on Day 0.
2. Enter your Day 1 retention percentage - the share still active a day later.
3. Enter your Day 7 and Day 30 retention percentages.
4. Read the projected curve out to Day 90, 180 and 365, and the fit check against your real Day 7
   number.

## How the calculation works

**It fits a power-law decay curve through exactly two points: Day 1 and Day 30.** Retention over time
for most apps follows a shape close to:

    retention(t) = Day1 x t^-b

where `t` is days since install and `b` is a decay exponent. Because `t=1` makes the exponent term
disappear, the curve passes through Day 1 exactly by construction. Solving the same equation at `t=30`
for `b` gives:

    b = log(Day1 / Day30) / log(30)

That single exponent then predicts retention at any day - 90, 180, 365, or any value in between.

**Day 7 is deliberately left out of the fit and used as a check instead.** The calculator plugs `t=7`
into the curve built from Day 1 and Day 30, and compares that prediction to the Day 7 percentage you
actually entered. A gap of a point or two means your retention is decaying smoothly and the longer-range
projections are probably reasonable. A gap of several points means something happened around the
one-week mark that a two-point curve cannot see - a push notification campaign, an app update, a change
in the kind of user you were acquiring that week - and the Day 90-plus numbers should be treated as
rougher than usual.

**Every projected day multiplies back to a user count** using the cohort size you entered, so "12
percent Day 90 retention" and "120 of your 1,000 users are still active on Day 90" are the same number
shown two ways.

## Why a curve instead of a straight line

A straight-line reading of "we lose about half our users a week" implies zero users left after a few
months, which almost never happens. Retention loss is front-loaded: the biggest drop is between Day 0
and Day 1, a smaller drop happens by Day 7, a smaller one still by Day 30, and the rate of loss keeps
shrinking. A power-law curve captures that shape - steep at first, flattening over time - far better
than any straight-line extrapolation of your early numbers.

## What it does not model

**A permanent floor above zero.** Almost no real app decays to nothing. Most flatten out once the users
who were only ever going to try it once are gone, leaving a small core of regulars who stick around far
longer than the curve predicts. Treat Day 90 as a reasonable lower bound and Day 180 and 365 as
increasingly rough - the gap between the model and reality widens the further out you look.

**Anything that changes retention mid-flight.** A product update, a marketing push, seasonal demand, or
a shift in acquisition channel can all move the real curve away from what two early data points predict.

**Reactivation.** Users who lapse and come back later are not represented - the model only ever loses
users, never regains them.

**Category norms.** The same Day 30 number can be weak for a game and strong for a niche utility. This
tool has no idea which one you're building, so read the projected numbers against your own category,
not a universal bar.

## Questions

**How does this project retention past Day 30?** It fits a power-law decay curve - retention(t) = Day1
x t^-b - through your Day 1 and Day 30 numbers, then reads Day 90, 180 and 365 off that same curve.
Power-law decay is the standard shape for app retention: steep losses in the first days, a long
flattening tail.

**What is the "fit check" number?** It plugs Day 7 into the curve fitted from your Day 1 and Day 30
numbers and compares that prediction to the Day 7 you actually entered. A close match means your
retention is decaying smoothly; a big gap usually means something happened around Day 7 specifically
that a two-point curve cannot see.

**Why does the model use Day 1 and Day 30, not Day 7 too?** Two points are enough to solve a power curve
exactly, and leaving Day 7 out of the fit is what lets it act as an independent check instead of being
baked in.

**Will my retention really keep decaying forever?** No - almost no real app does. Power-law decay pushes
toward zero, but most apps flatten at a small loyal-user floor above zero. Treat every projection past
Day 30 as a lower bound, not a prediction.

**What counts as good Day 1, Day 7 and Day 30 retention?** As a rough rule of thumb for consumer apps:
Day 1 above 25 to 30 percent, Day 7 above 10 to 12 percent, and Day 30 above 4 to 6 percent are
generally considered solid. Games and social apps typically run higher, utility apps often run lower -
retention benchmarks vary a lot by category.

**Is anything sent to a server?** No. It is JavaScript in your browser. Nothing is uploaded, nothing is
stored, and closing the tab erases it.

## About US APP Team

US APP Team builds custom iOS and Android apps for a fixed price, from one codebase to both stores. If
your retention numbers are strong enough to justify the next feature, start a brief at
https://usappteam.com/app-brief
