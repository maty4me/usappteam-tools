---
title: Image Converter & Compressor
url: https://tools.usappteam.com/tools/image-converter/
date: 2026-07-30
---

# Image Converter & Compressor

A free browser tool that converts and compresses images between PNG, JPEG and WebP, optionally resizing them on the way through. It reads PNG, JPG, WebP, GIF, BMP, SVG and AVIF (whatever the browser can decode) and writes PNG, JPEG or WebP. Everything runs locally in the visitor's own tab using the Canvas API — no upload, no server, no queue, no watermark, no file cap and no signup.

## How to use it

1. Add images by dropping them on the drop zone, using the "Choose images" button, or pasting from the clipboard with Ctrl+V. Multiple files at a time, mixed formats are fine.
2. Choose the output format: PNG, JPEG or WebP. A format the browser cannot encode is detected and disabled rather than silently substituted.
3. For JPEG and WebP, set quality on a 1–100 slider (default 82). The slider is disabled for PNG, which is lossless.
4. Optionally resize: max width, max height, or a percentage. Aspect ratio is preserved and images are never upscaled beyond their original dimensions.
5. Each result row shows a thumbnail, the output filename, original size → new size, the percentage saved (or gained), and the output dimensions. Download individually, or "Download all" to save the batch sequentially.

## How it works technically

Each file is read with the File API and turned into an object URL, decoded by the browser into an `HTMLImageElement`, drawn onto an off-screen `<canvas>` at the target dimensions, and re-encoded with `canvas.toBlob(mimeType, quality)`. Encoder support is detected by calling `canvas.toDataURL('image/webp')` and checking that the returned data URL actually starts with `data:image/webp` — browsers silently fall back to PNG for MIME types they cannot write, so the returned type is the only honest test.

When the output format has no alpha channel (JPEG), the canvas is filled with white before drawing; without that step, transparent pixels encode as black. Object URLs are revoked when results are cleared or the page is hidden.

Because the image is reduced to raw pixels and re-encoded, **all metadata is discarded**: EXIF (including GPS coordinates, camera and lens model, serial numbers, capture timestamp), IPTC and XMP. That is a privacy win before publishing a phone photo, and a loss if you needed to keep copyright fields.

## Which format should you use

**PNG** — lossless, supports full alpha transparency. Correct for logos, icons, screenshots, charts, line art and anything with flat colour and hard edges, because lossless compression keeps text and thin lines crisp. Wrong for photographs: a photo saved as PNG is routinely five to ten times larger than the equivalent JPEG, because PNG's compression relies on repeated pixel patterns that photographs do not contain.

**JPEG** — lossy, no transparency, decoded by literally everything. The right default for photographs. Its discrete cosine transform throws away high-frequency detail the eye is poor at noticing, which is extremely efficient on smooth gradients and natural texture. It handles sharp edges badly: text and screenshots saved as JPEG show visible ringing artefacts around the letters.

**WebP** — lossy or lossless, supports transparency and animation, supported by all current browsers (Chrome, Edge, Firefox, Safari 14+). For photographs, Google's own comparison found lossy WebP files roughly 25–34% smaller than JPEG at equivalent SSIM quality; independent tests land in a similar range but the gain varies a lot by image, and on some photos a well-tuned JPEG encoder is competitive. Treat "about 25–35% smaller" as a realistic expectation, not a guarantee. For web use, WebP is usually the best single choice: it replaces both the PNG and the JPEG case.

**AVIF** — generally compresses better still, often 20–50% below WebP on photographic content at matched quality, with good browser support for *display*. It is not offered as an output here for an honest reason: browsers can decode AVIF but do not expose an AVIF encoder to `canvas.toBlob`, so no client-side tool can produce it without shipping a WebAssembly encoder. If you need AVIF, generate it in your build pipeline or CDN. AVIF matters most for large hero images on high-traffic pages, where the extra saving over WebP is worth the slower encode.

## How lossy quality settings actually behave

The quality number is not a percentage of anything and it is not linear. It is an encoder parameter that controls how aggressively coefficients are quantised, and the same number means different things to a JPEG encoder and a WebP encoder.

Practical behaviour:

- **90–100** — near-transparent quality, but file size climbs steeply. Quality 100 is not lossless; it is simply the least aggressive lossy setting, and it can produce a file larger than the PNG.
- **75–90** — the useful working range. Around 80–85 most photographs are visually indistinguishable from the original at normal viewing size.
- **55–75** — noticeably smaller files. Artefacts start to appear in smooth gradients (skies, skin) and around sharp edges, but are acceptable for thumbnails and secondary imagery.
- **Below 50** — blocking and colour banding become obvious.

Two things that surprise people. First, **loss accumulates**: re-encoding an existing JPEG at quality 100 still degrades it slightly, because the decode-and-re-quantise round trip is not reversible. Always convert from the highest-quality original available. Second, **quality does not control dimensions**. If a 4000px photo is going into a 800px-wide slot on a page, resizing it is a far bigger saving than any quality setting, and it costs no visible fidelity at the size it will actually be displayed.

Diminishing returns are real: the jump from 95 to 85 typically halves the file for almost no visible change, while the jump from 85 to 75 saves much less and costs more.

## Questions

**Is anything uploaded?** No. All processing is local Canvas work; there is no backend. The page keeps working with the network disconnected.

**Is location data removed?** Yes — re-encoding drops all EXIF, including GPS.

**Is there a file limit?** None from the tool. Browser canvas dimension limits (roughly 16,000px per side) are the only ceiling; a file that exceeds them errors on its own row without stopping the batch.

**Why did my file get bigger?** Usually a photograph converted to PNG, or a re-save of an already-compressed JPEG at high quality. The tool reports increases openly.

**Can it output AVIF?** No — browsers do not expose an AVIF encoder to canvas. AVIF input can usually be read and converted to WebP or JPEG.

## About US APP Team

US APP Team builds custom mobile apps for founders and small businesses — idea to live on the App Store and Google Play, done for you, fixed price, and you own everything including the code. Image handling, compression and delivery inside an app is part of the build. Start a brief at https://usappteam.com/app-brief or book a call at https://usappteam.com/book-call
