---
title: App Icon Generator
url: https://tools.usappteam.com/tools/app-icon-generator/
date: 2026-07-31
---

# App Icon Generator

Takes one square source image and produces every icon file iOS and Android ask for — the Xcode asset-catalog
slots, the five Android launcher densities, both Android adaptive-icon layers, the Play Store icon and an
optional favicon set. Everything runs on the Canvas API inside the browser tab: nothing is uploaded, nothing
is stored, and the PNG bytes are written by the page itself so the iOS files can be guaranteed free of an
alpha channel.

## How to use it

1. Drop in artwork that is square and at least 1024 × 1024. PNG, JPG, WebP and SVG all work.
2. Choose whether to keep transparency. iOS files are always flattened onto the colour you pick.
3. Set how much of the square the artwork fills, and preview the mask shapes.
4. Tick the export sets you need, then click **Generate every size**.
5. Download individually, or all in sequence. Each row shows the filename and the folder it belongs in.

## Complete size reference

### iOS — single 1024 (modern Xcode)

Folder: `Assets.xcassets/AppIcon.appiconset/`

| Pixels | Filename | Used for |
|---|---|---|
| 1024 × 1024 | `AppIcon-1024.png` | Xcode 14 and later generate every other iOS size from this one file |

### iOS — full legacy AppIcon set

Folder: `Assets.xcassets/AppIcon.appiconset/`

| Pixels | Filename | Slot |
|---|---|---|
| 20 | `Icon-App-20x20@1x.png` | iPad notifications, 20 pt @1x |
| 40 | `Icon-App-20x20@2x.png` | Notifications, 20 pt @2x |
| 60 | `Icon-App-20x20@3x.png` | Notifications, 20 pt @3x |
| 29 | `Icon-App-29x29@1x.png` | iPad settings, 29 pt @1x |
| 58 | `Icon-App-29x29@2x.png` | Settings, 29 pt @2x |
| 87 | `Icon-App-29x29@3x.png` | Settings, 29 pt @3x |
| 40 | `Icon-App-40x40@1x.png` | iPad Spotlight, 40 pt @1x |
| 80 | `Icon-App-40x40@2x.png` | Spotlight, 40 pt @2x |
| 120 | `Icon-App-40x40@3x.png` | Spotlight, 40 pt @3x |
| 120 | `Icon-App-60x60@2x.png` | iPhone Home Screen, 60 pt @2x |
| 180 | `Icon-App-60x60@3x.png` | iPhone Home Screen, 60 pt @3x |
| 76 | `Icon-App-76x76@1x.png` | iPad Home Screen, 76 pt @1x |
| 152 | `Icon-App-76x76@2x.png` | iPad Home Screen, 76 pt @2x |
| 167 | `Icon-App-83.5x83.5@2x.png` | iPad Pro Home Screen, 83.5 pt @2x |
| 1024 | `ItunesArtwork@2x.png` | App Store listing |

### Android — legacy launcher icons (48 dp)

| Pixels | Filename | Folder |
|---|---|---|
| 48 | `ic_launcher.png` | `app/src/main/res/mipmap-mdpi/` |
| 72 | `ic_launcher.png` | `app/src/main/res/mipmap-hdpi/` |
| 96 | `ic_launcher.png` | `app/src/main/res/mipmap-xhdpi/` |
| 144 | `ic_launcher.png` | `app/src/main/res/mipmap-xxhdpi/` |
| 192 | `ic_launcher.png` | `app/src/main/res/mipmap-xxxhdpi/` |

### Android — adaptive icon layers (108 dp)

Both layers are exported at every density, into the same `mipmap-<density>` folders as above:
108, 162, 216, 324 and 432 px for mdpi, hdpi, xhdpi, xxhdpi and xxxhdpi respectively.

| Filename | Notes |
|---|---|
| `ic_launcher_foreground.png` | Transparent, artwork centred inside the 66 dp safe zone |
| `ic_launcher_background.png` | Opaque, full bleed |
| `mipmap-anydpi-v26/ic_launcher.xml` | The `<adaptive-icon>` element that points at both layers |

### Store and web

| Pixels | Filename | Folder |
|---|---|---|
| 512 | `ic_launcher-playstore.png` | Play Console → Store listing → App icon (32-bit PNG, under 1024 KB) |
| 16 | `favicon-16x16.png` | `public/` |
| 32 | `favicon-32x32.png` | `public/` |
| 180 | `apple-touch-icon.png` | `public/` |
| 192 | `icon-192.png` | `public/` |
| 512 | `icon-512.png` | `public/` |

**Sources.** The iOS slots are Xcode's `AppIcon.appiconset` layout; Apple's Human Interface Guidelines "App
icons" page confirms the 1024 × 1024 requirement and lists transparency as "No" for iOS and iPadOS. The
Android density multipliers come from Android's "Support different pixel densities", which specifies the
3:4:6:8:12:16 ratio across ldpi–xxxhdpi, so a 48 dp launcher icon is 48/72/96/144/192 px and a 108 dp
adaptive layer is 108/162/216/324/432 px. The adaptive geometry comes from Android's "Adaptive icons" page.
The 512 × 512 Play icon and its 1024 KB ceiling come from Play Console's own preview-asset requirements.

One honest caveat: Apple's HIG size table and Xcode's asset catalog do not describe the notification icon
identically. The HIG lists a rendered notification icon of 76 × 76 and 114 × 114 px, while the asset catalog
slot is 20 pt at @2x and @3x — 40 and 60 px. This tool follows the asset catalog, because that is what the
filenames and the `Contents.json` actually need.

## Android adaptive icons, properly explained

An adaptive icon is two images, not one: a **background** layer and a **foreground** layer. Both are sized
to a **108 × 108 dp** canvas. You hand both to the system, and the system composites them.

The launcher then applies a mask. That mask covers only the **middle 72 × 72 dp** of the 108 dp canvas — the
outer **18 dp on each of the four sides is drawn but never guaranteed to be visible**. That margin is not
wasted space: it is what lets the launcher slide the two layers against each other for parallax when you drag
an icon, and pulse it when you tap, without ever exposing an empty edge.

Within that 72 dp viewport, the mask shape itself is chosen by the device manufacturer — a circle on one
phone, a squircle on another, a rounded square on a third. Because the shape varies, Android defines a
smaller **66 × 66 dp safe zone** that no OEM mask clips. Anything you need people to see — your logo, your
letterform — belongs inside that 66 dp box. Android's guidance also puts a floor on it: the logo should be at
least 48 × 48 dp, so it does not read as a speck inside a large field of background.

What happens if you ignore the safe zone: on a device with a circular mask, the corners of a 72 dp-wide mark
get sliced off, and the amount sliced differs by device, so you cannot even test your way to safety on one
phone. The usual symptom is a wordmark whose first and last letters are clipped on some handsets and intact
on others.

Two more rules that come straight from Android's documentation and are easy to miss. The layers must not
contain their own mask or a drop shadow around the outline — the system draws those, and a baked-in one
double-renders. And the background layer should be full-bleed and opaque; a transparent background layer
leaves the launcher compositing your foreground onto nothing.

## Questions

**Why does my icon look soft?** Your source was smaller than 1024 × 1024 and had to be upscaled. Re-export
from the original vector.

**Should I round the corners myself?** No. Export square. iOS and Android each apply their own mask, and a
pre-rounded icon double-rounds.

**Why can't iOS icons be transparent?** Apple lists transparency as unsupported for iOS and iPadOS app
icons, and App Store Connect rejects an alpha channel with error ITMS-90717. A browser canvas is always
RGBA, so this tool writes the PNG bytes itself and emits colour type 2 — 24-bit RGB, no alpha channel in the
file.

**Do I need the legacy set?** Only if your asset catalog lists the individual slots. A project created in
Xcode 14 or later has a single 1024 slot and needs one file.

## About US APP Team

US APP Team builds custom mobile apps for US small businesses — fixed scope, fixed price, and a real launch
date. Start a brief at https://usappteam.com/app-brief
