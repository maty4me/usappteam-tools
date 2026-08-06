---
title: App Revenue Calculator
url: https://tools.usappteam.com/tools/app-revenue-calculator/
date: 2026-08-06
---

# App Revenue Calculator

Models what a mobile app actually earns, after subscribers cancel and after the app store takes its
commission. It runs entirely in the browser, needs no signup, and stores nothing.

## How to use it

1. Pick the monetization model: subscription, one-time purchase, or free with ads.
2. Enter the new downloads you expect in a typical month.
3. Set the share of downloads that convert to paying users, and your price.
4. For subscriptions, set monthly churn.
5. Choose the store commission tier and read the 12-month projection.

## How the projection works

**Subscriptions accumulate and decay.** Each month, the paying base carries forward, loses the churn
percentage, and gains the new payers that month's downloads produced:

    subscribers(t) = subscribers(t-1) x (1 - churn) + downloads x conversion

That recurrence converges. The ceiling is `new payers / churn`, and it is the single most useful
number the calculator produces. If 5,000 downloads convert at 3 percent, that is 150 new subscribers
a month; at 6 percent monthly churn the app stops growing at 2,500 subscribers, because 6 percent of
2,500 is exactly the 150 arriving. No amount of time changes that - only churn or conversion does.

This is why retention work usually beats acquisition spend. Halving churn doubles the ceiling.
Doubling downloads also doubles it, but doubling downloads normally costs money, whereas the churn
fix is a product problem.

**One-time purchases do not accumulate.** Revenue in any month is just that month's downloads times
conversion times price. The base resets every month, which is why a paid-once app lives or dies on a
constant flow of new installs.

**Ad revenue tracks attention, not installs.** The active-user base behaves like the subscriber base
- it accumulates new installs and loses a share each month to drop-off - and revenue is:

    active users x impressions per user per month / 1000 x eCPM

**Then the store takes its cut.** Apple and Google both operate a reduced commission for smaller
developers: 15 percent on the first million dollars of earnings per year, 30 percent above that.
Google applies the reduced rate to subscription revenue regardless of the threshold. Most launching
developers are on the 15 percent tier.

**Ad revenue is not commissioned.** The stores take a share of in-app purchases and subscriptions
processed through their billing systems. Money paid by a third-party ad network is not an in-app
purchase, so it arrives whole. Calculators that apply a 30 percent haircut to ad revenue are wrong,
and the difference is large.

## Why this gives lower numbers than other calculators

Most app revenue calculators multiply downloads by price. That is gross revenue in a world where
nobody cancels and the store works for free. Two corrections separate that fantasy from a plan:
churn caps the paying base, and commission removes 15 to 30 percent of what is left. On a
subscription app both together routinely cut the naive figure by more than half.

## What it does not model

Marketing and user-acquisition spend, free trials that never convert, refunds and chargebacks,
taxes, payment processing outside the stores, and your own hosting and support costs. It reports
revenue, not profit, and it assumes the downloads entered actually arrive.

## Questions

**What churn rate should I use?** Five to eight percent monthly is a reasonable consumer app.
Above fifteen percent the ceiling arrives so quickly that growth is effectively capped from month
one.

**What conversion rate is realistic?** Two to five percent of downloads becoming paying subscribers
is typical for consumer apps. It moves the result more than price does, so guessing high here is the
fastest way to build a projection you cannot hit.

**Does the calculator know my app's category?** No, and it deliberately does not pretend to.
Benchmarks vary so widely by category and country that a built-in "average" would be a made-up
number wearing a lab coat. You supply the assumptions; the tool does the arithmetic honestly.

**Is anything sent to a server?** No. It is JavaScript in your browser. Nothing is uploaded, nothing
is stored, and closing the tab erases it.

## About US APP Team

US APP Team builds custom iOS and Android apps for a fixed price, from one codebase to both stores.
If the projection above suggests the app is worth building, start a brief at
https://usappteam.com/app-brief
