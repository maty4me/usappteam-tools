---
title: App Store Screenshot Generator
url: https://tools.usappteam.com/tools/app-screenshot-generator/
date: 2026-07-30
---

# App Store Screenshot Generator

Turns raw simulator or device screenshots into captioned store images at the exact pixel dimensions Apple and Google publish. Runs entirely in the browser — nothing is uploaded, nothing is stored, there is no watermark and no signup.

## How to use it

1. Drop in your screenshots, or use the file picker. Multiple at once. Pick order is preserved, which matters because the stores display screenshots in sequence.
2. Choose a store slot. Each shows its exact pixel size, the devices it covers, and whether it is required or optional.
3. Choose the exact accepted size, if the slot offers more than one, and the orientation.
4. Caption each slide, choose a background, optionally turn on a device frame.
5. Export one slide or the whole batch. JPEG by default.

## Reference: every accepted size

These numbers are transcribed from the primary sources — Apple's [Screenshot specifications](https://developer.apple.com/help/app-store-connect/reference/screenshot-specifications/) page in App Store Connect Help, and Google's [Add preview assets to showcase your app](https://support.google.com/googleplay/android-developer/answer/9866151) page in Play Console Help. Landscape is the portrait pair swapped unless noted.

### App Store — iPhone

| Slot | Accepted portrait sizes | Devices covered | Required? |
|---|---|---|---|
| 6.9" | 1320×2868, 1290×2796, 1260×2736 | iPhone Air, 17 Pro Max, 16 Pro Max, 16 Plus, 15 Pro Max, 15 Plus, 14 Pro Max | **Yes** if the app runs on iPhone (this slot or 6.5") |
| 6.5" | 1284×2778, 1242×2688 | iPhone 14 Plus, 13 Pro Max, 12 Pro Max, 11 Pro Max, 11, XS Max, XR | **Yes** if 6.9" is not provided |
| 6.3" | 1206×2622, 1179×2556 | iPhone 17 Pro, 17, 16 Pro, 16, 15 Pro, 15, 14 Pro | Optional — Apple scales 6.5" down |
| 6.1" | 1170×2532, 1125×2436, 1080×2340 | iPhone 17e, 16e, 14, 13 Pro, 13, 13 mini, 12 Pro, 12, 12 mini, 11 Pro, XS, X | Optional — Apple scales 6.5" down |
| 5.5" | 1242×2208 | iPhone 8/7/6S/6 Plus | Optional |
| 4.7" | 750×1334 | iPhone SE (3rd, 2nd gen), 8, 7, 6S, 6 | Optional |
| 4" | 640×1136 (with status bar), 640×1096 (without) | iPhone SE (1st gen), 5S, 5C, 5 | Optional |
| 3.5" | 640×960 (with status bar), 640×920 (without) | iPhone 4S, 4 | Optional |

### App Store — iPad

| Slot | Accepted portrait sizes | Devices covered | Required? |
|---|---|---|---|
| 13" | 2064×2752, 2048×2732 | iPad Pro (M5, M4), iPad Pro (6th–1st gen), iPad Air (M4, M3, M2) | **Yes** if the app runs on iPad |
| 12.9" | 2048×2732 | iPad Pro (2nd gen) | Optional |
| 11" | 1488×2266, 1668×2420, 1668×2388, 1640×2360 | iPad Pro (M5, M4, 4th–1st gen), iPad Air (M4, M3, M2, 5th–4th gen), iPad (A16, 10th gen), iPad mini (A17 Pro, 6th gen) | Optional |
| 10.5" | 1668×2224 | iPad Pro, iPad Air (3rd gen), iPad (9th–7th gen) | Optional |
| 9.7" | 1536×2048 / 1536×2008, 768×1024 / 768×1004 | iPad Pro, iPad Air, Air 2, iPad, iPad 2, iPad (6th–3rd gen), iPad mini (5th gen), mini 4/3/2 | Optional |

### App Store — other Apple platforms

| Slot | Accepted sizes | Required? |
|---|---|---|
| Mac | 1280×800, 1440×900, 2560×1600, 2880×1800 (all 16:10) | **Yes** for Mac apps |
| Apple TV | 1920×1080, 3840×2160 | **Yes** for tvOS apps |
| Apple Vision Pro | 3840×2160 | **Yes** for visionOS apps |
| Apple Watch | 422×514 (Ultra 3), 410×502 (Ultra 2, Ultra), 416×496 (Series 11, 10), 396×484 (Series 9–7), 368×448 (Series 6–4, SE 3, SE), 312×390 (Series 3) | **Yes** for watchOS apps — same size across all localisations |

Apple's general rules: **1 to 10 screenshots**, `.jpeg` / `.jpg` / `.png`, and **no alpha channels or transparencies**.

### Google Play

| Slot | Sizes / rules | Required? |
|---|---|---|
| Phone / tablet screenshot | 9:16 portrait or 16:9 landscape, minimum 1080px recommended (1080×1920 / 1920×1080). Up to 8 per device type | **Minimum 2 across device types to publish** |
| Chromebook / large screen | 16:9 or 9:16, Google says 1,080–7,680px | **Minimum 4** |
| Wear OS (apps and watch faces) | 1:1, minimum 384×384. No device frames, no added text or graphics, no transparent backgrounds | **At least 1** |
| Android TV | At least one screenshot; Google publishes no exact size, so the general rule applies. A TV banner is also required | **At least 1** |
| Android Automotive OS | At least 2 portrait at 800×1,280 and 2 landscape at 1,024×768 | Required outside the parked-app categories |
| Android XR | 4 to 8 screenshots, 8:5, PNG or JPEG up to 8MB each. 3840×2400 recommended, 1920×1200 minimum | **4–8** |
| Feature graphic | 1024×500, JPEG or 24-bit PNG, no alpha | **Yes** |
| App icon | 512×512, 32-bit PNG with alpha, max 1024KB | **Yes** |
| Android TV banner | 1280×720, JPEG or 24-bit PNG, no alpha | Yes, for Android TV |

Google's general screenshot rules: **JPEG or 24-bit PNG (no alpha)**, minimum dimension **320px**, maximum dimension **3840px**, and *the maximum dimension cannot be more than twice the minimum*. Worth noting that Google's own large-screen advice ("1,080 to 7,680px") sits above that 3840px cap on the same page — staying at or under 3840 satisfies both readings.

For Play promotion slots: apps need at least four screenshots at 1080px or better; games need at least three 16:9 landscape (min 1920×1080) or three 9:16 portrait (min 1080×1920).

## The cross-store trap

An App Store screenshot is not automatically legal on Google Play. A 1320×2868 iPhone screenshot has a long side 2.17 times its short side, which exceeds Play's "no more than twice the minimum dimension" rule. Export separately for each store rather than reusing one file. The tool flags this on the slot info card when the size you have chosen would fail Play.

## Common rejection causes

- **Wrong dimensions.** App Store Connect compares your file against the accepted list exactly. Off by one pixel is a rejection, not a warning. This is the single most common cause.
- **Alpha channel present.** Apple's spec forbids alpha channels and transparencies. Any PNG written from an HTML canvas is RGBA, so it carries an alpha channel even when every pixel is opaque. Exporting JPEG avoids the problem entirely, because JPEG has no alpha channel — that is why this tool defaults to it. If you must ship PNG, flatten it to 24-bit RGB first.
- **Too few screenshots.** Play will not let you publish with fewer than two across device types; Chromebook and tablet listings want four; Wear OS, Android TV and Android XR each have their own minimums. Apple needs at least one in a required slot per platform.
- **Text unreadable at thumbnail size.** Screenshots appear in search results and on homepages at a fraction of full size. A headline that reads fine at 1320×2868 can be illegible in a search row. Keep captions to a few large words, and put the important UI in the first two or three screenshots — Google explicitly asks you to prioritise UI in the first three.
- **Frames or chrome where they are forbidden.** Google rejects Wear OS screenshots positioned in device frames or with added text, graphics or backgrounds, and asks you to keep device imagery out of the feature graphic.
- **Content that isn't the app.** Both stores require screenshots to depict the actual in-app experience. Google also prohibits performance, ranking, award or promotional claims in the feature graphic — no "Best", "#1", "Top", "New", "Free".

## How the composition works

The source screenshot is decoded to pixels in your browser, then drawn onto a canvas sized to the exact target dimensions. Scaling is uniform: the scale factor is the smaller of `targetWidth / sourceWidth` and `targetHeight / sourceHeight` inside the padded content box, so the aspect ratio you captured is never distorted. Whatever space is left is filled by the background — a solid colour or a diagonal two-stop gradient — so the image is fully opaque edge to edge and a JPEG has no black corners. Captions are measured with the canvas text API and word-wrapped to the content width; text size is a percentage of image height, so a caption occupies the same visual proportion at 640×1136 as it does at 2064×2752. Any device frame is a rounded rectangle, a rim stroke and a pill-shaped cutout drawn as canvas paths — no device photograph is embedded, so there is nothing in the output you cannot ship.

## Questions

**What size do App Store screenshots have to be?** See the tables above. The short answer for a new iPhone app is 1320×2868 portrait for the 6.9-inch slot, plus 2064×2752 for the 13-inch iPad slot if the app runs on iPad.

**How many do I need?** Apple: 1–10 per localisation, with the 6.9-inch (or 6.5-inch) iPhone slot filled, and 13-inch iPad if applicable. Google: minimum 2 across device types.

**Why JPEG and not PNG?** A browser canvas is RGBA, so canvas PNGs carry an alpha channel. Apple rejects screenshots with alpha; Google asks for 24-bit PNG without it. JPEG has no alpha channel at all.

**Do I need a device frame?** No. Neither store requires one, many shipped listings use none, and Google forbids frames on Wear OS.

**Can I use a simulator screenshot?** Yes. A simulator booted to the right device captures at exactly the size the store expects, and its status bar is usually cleaner than a real device's.

**Is anything uploaded?** No. Everything happens in your browser via the Canvas API. Go offline after the page loads and it still works.

## About US APP Team

US APP Team builds custom mobile apps for founders and small businesses in the United States — native iOS and Android, designed, built, submitted and supported. If you would rather hand the whole store submission over, including the screenshots, that is part of what we do. Start a brief at https://usappteam.com/app-brief
