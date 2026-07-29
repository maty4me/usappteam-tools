---
title: Image Converter & Compressor
url: https://tools.usappteam.com/tools/image-converter/
date: 2026-07-30
---

# Image Converter & Compressor

A free browser tool that converts and compresses images between PNG, JPEG and WebP, optionally resizing them on the way through. It reads PNG, JPG, WebP, GIF, BMP, SVG and AVIF — whatever the browser can decode — and writes PNG, JPEG or WebP. Everything runs locally in the visitor's own tab via the Canvas API: no upload, no server, no queue, no watermark, no file cap, no signup.

## How to use it

1. Add images by drag-and-drop, the "Choose images" button, or pasting with Ctrl+V. Many at a time; mixed formats are fine.
2. Pick the output format (one the browser cannot encode is disabled, not silently substituted), set quality 1–100 for JPEG and WebP, and optionally resize by max width, max height or percentage. Aspect ratio is preserved and images are never upscaled.
3. Each row shows a thumbnail, the output filename, original size → new size, percentage saved or gained, and output dimensions. Download individually, or "Download all" to save the batch sequentially — the browser may ask permission for multiple downloads.

Changing any setting re-converts everything on screen from the **original** file, never from the previous output, so adjusting the slider repeatedly does not stack compression loss.

## How it works technically

Each file is read with the File API, decoded into an `HTMLImageElement`, drawn onto an off-screen `<canvas>` at the target size, and re-encoded with `canvas.toBlob(mimeType, quality)`. Encoder support is tested by checking `canvas.toDataURL('image/webp')` really returns a `data:image/webp` URL, since browsers silently fall back to PNG for types they cannot write. For JPEG the canvas is filled with white first, or transparent pixels encode as black.

Reducing the image to raw pixels discards **all metadata**: EXIF (GPS coordinates, camera and lens model, serial numbers, timestamp), IPTC and XMP. A privacy win before publishing a phone photo; a loss if you needed the copyright fields.

## Which format should you use

**PNG** — lossless, full alpha transparency. Correct for logos, icons, screenshots, charts and line art, because lossless compression keeps text and thin lines crisp. Wrong for photographs: a photo saved as PNG is routinely five to ten times larger than the equivalent JPEG, since PNG relies on repeated pixel patterns photographs do not contain.

**JPEG** — lossy, no transparency, decoded by everything. The right default for photographs: it discards high-frequency detail the eye is poor at noticing, which is very efficient on smooth gradients and natural texture. It handles sharp edges badly — text and screenshots show visible ringing around the letters.

**WebP** — lossy or lossless, supports transparency and animation, supported by all current browsers (Chrome, Edge, Firefox, Safari 14+). For photographs, Google's own comparison found lossy WebP roughly 25–34% smaller than JPEG at equivalent SSIM; the gain varies a lot by image, and on some photos a well-tuned JPEG encoder is competitive. Treat "about 25–35% smaller" as a realistic expectation, not a guarantee. For web use it is usually the best single choice — it covers both the PNG and the JPEG case.

**AVIF** — better still, often 20–50% below WebP on photographs at matched quality, with good browser support for *display*. Not offered as an output here for an honest reason: browsers decode AVIF but expose no AVIF encoder to `canvas.toBlob`, so no client-side tool can produce it without shipping a WebAssembly encoder. Generate it in your build pipeline or CDN. It matters most for large hero images on high-traffic pages.

## How lossy quality settings actually behave

The quality number is not a percentage of anything and it is not linear. It is an encoder parameter controlling how aggressively coefficients are quantised, and the same number means different things to JPEG and WebP.

- **90–100** — near-transparent quality, but size climbs steeply. Quality 100 is not lossless; it is the least aggressive lossy setting, and can exceed the PNG.
- **75–90** — the useful working range. Around 80–85 most photographs are indistinguishable from the original at normal viewing size.
- **55–75** — noticeably smaller. Artefacts appear in smooth gradients (skies, skin) and around edges, but are fine for thumbnails and secondary imagery.
- **Below 50** — blocking and colour banding become obvious.

Returns diminish sharply: 95 to 85 typically halves the file for almost no visible change, while 85 to 75 saves much less and costs more.

Two things surprise people. **Loss accumulates** — re-encoding a JPEG at quality 100 still degrades it, because the decode-and-re-quantise round trip is not reversible; always start from the highest-quality original. And **quality does not control dimensions** — for a 4000px photo going into an 800px slot, resizing saves far more than any quality setting, at no visible cost.

## Questions

**Is anything uploaded?** No. All processing is local Canvas work; there is no backend. The page keeps working with the network disconnected.

**Is location data removed?** Yes — re-encoding drops all EXIF, including GPS.

**Is there a file limit?** None from the tool. Browser canvas limits (roughly 16,000px per side) are the only ceiling; a file exceeding them errors on its own row without stopping the batch.

**Why did my file get bigger?** Usually a photograph converted to PNG, or an already-compressed JPEG re-saved at high quality. Increases are reported openly.

## About US APP Team

US APP Team builds custom mobile apps for founders and small businesses — idea to live on the App Store and Google Play, done for you, fixed price, and you own everything including the code. Image handling, compression and delivery inside an app is part of the build. Start a brief at https://usappteam.com/app-brief or book a call at https://usappteam.com/book-call
