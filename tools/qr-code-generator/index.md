---
title: Free QR Code Generator
url: https://tools.usappteam.com/tools/qr-code-generator/
date: 2026-07-30
---

# Free QR Code Generator

A browser tool that encodes your data directly into a QR code — a *static* code with no redirect,
no account and no expiry. Supports website addresses, plain text, email, phone, SMS, WiFi logins,
contact cards and map locations, with PNG and SVG download. Nothing is uploaded; the encoder runs
on your own device.

## How to use it

1. **Pick the content type** — Website, Plain text, Email, Phone, SMS, WiFi, Contact card, or Location.
2. **Fill in the fields.** The preview redraws as you type; there is no generate button.
3. **Choose error correction** — L, M, Q or H. M is the default and is right for almost everything.
4. **Set colours** if you want. The tool warns you when the contrast drops below a scannable ratio,
   and again if the code ends up lighter than its background.
5. **Download** a PNG at 256, 512, 1024 or 2048 px, or an SVG for print. Both include the four-module
   quiet zone the specification requires.

## Static versus dynamic QR codes — the thing nobody explains

This is the single most important decision when you make a QR code, and most generators never
mention it.

A **static** QR code contains your data. The URL, the WiFi password, the contact details — the
actual characters are encoded into the black and white modules. A scanner reads them straight off
the printed surface. There is no network request to resolve the code, so it works offline, works
forever, and cannot be revoked, rate-limited, redirected or switched off by anyone. Nobody can
count the scans either, because there is nothing in the middle to do the counting.

A **dynamic** QR code contains a short link on the generator's domain — something like
`qr.example.com/a7Bx9`. Scanning it hits their server, which logs the scan and then redirects to
your real destination. That buys you two genuinely useful things: scan analytics, and the ability
to change the destination after the code is printed.

It also buys you a dependency. The code only works while that redirect keeps running. In practice
that means the code stops working when the free trial ends, when a monthly scan cap is reached,
when a card on file expires, when the provider changes its plans, or when the company is acquired
or shuts down. Thousands of printed menus, packaging runs and business cards have died exactly this
way. This is the part the word "free" on those sites is doing a lot of work to hide: the code is
free to *make*, not free to *keep working*.

The honest summary: choose static when the destination will not change and permanence matters —
WiFi cards, contact cards, packaging, signage, anything printed in volume. Choose dynamic only when
you truly need to redirect later or measure scans, and if you do, run the redirect on a domain you
own so nobody else holds the off switch. This tool only makes static codes, because that is the
version that keeps its promise.

## Printing guidance that actually matters

**Size.** The working rule is that a code should be about one tenth as wide as the distance it will
be scanned from. Arm's length — roughly 12 inches — needs about 1.2 inches of code. A wall poster
read from 10 feet needs about 12 inches. Do not go below roughly 0.8 inches for anything printed,
however short the data.

**Density.** More data means a higher QR version, which means more modules across the same square,
which means each module is physically smaller. A version 1 code is 21×21 modules; version 10 is
57×57; version 40 is 177×177. The tool shows the version and module count so you can see this
happening. Shortening a URL is the cheapest way to make a code easier to scan.

**Quiet zone.** The blank margin around the code — four modules wide — is part of the code, not
decoration. Scanners use it to find the edges. Every download here includes it; do not crop it, and
do not place artwork inside it.

**Contrast and polarity.** Dark modules on a light background is what scanners are built for.
Aim for a contrast ratio of at least 4.5:1 and prefer much more. Inverted codes — light on dark —
are read by many phones and refused by many others, so avoid them on anything that matters. Avoid
gradients, busy photo backgrounds, and low-contrast brand-colour pairs.

**Error correction.** L rebuilds ~7% damage, M ~15%, Q ~25%, H ~30%. Higher levels survive scuffs
and logos, but consume capacity, so the same content produces a denser code that must be printed
larger. M is the sensible default. H is required when a logo covers the centre.

**Proof it.** Print one at final size on the final material and scan it with an old phone in poor
light before you order a thousand.

## How the encoder works

Everything is implemented in the page, in plain JavaScript, with no library and no API call. The
text is encoded as UTF-8 in byte mode; the smallest of the 40 versions that fits is chosen
automatically; Reed–Solomon error-correction codewords are computed over GF(256) and interleaved
across the correct block structure for that version and level; the finder, timing and alignment
patterns, format information and version information are drawn; and all eight data masks are
evaluated with the standard penalty rules, with the lowest-scoring one applied.

## Privacy

Everything happens locally. Your text, WiFi passwords, contact details and any logo image you add
stay on your device — nothing is uploaded, nothing is stored, and there is no email field or account
anywhere on the page. The resulting code contains no reference to this site.

## Questions

**Do these QR codes expire?** No. There is no redirect and no server, so there is nothing that can
be switched off.

**Can I track scans?** No. That is the tradeoff for permanence — tracking requires a redirect, and a
redirect is the thing that can break.

**What size should I print it?** About one tenth of the intended scan distance, and never under
about 0.8 inches.

**Which error-correction level?** M unless you have a reason. Q outdoors, H with a logo.

**Can I use them commercially?** Yes. The QR Code standard is open and the relevant patents have
lapsed. The images are yours, unwatermarked.

## About US APP Team

US APP Team builds custom mobile apps for founders and small businesses — idea to live on the App
Store and Google Play, done for you, at a fixed price, and you own everything. Start a brief at
https://usappteam.com/app-brief or book a free intro call at https://usappteam.com/book-call
