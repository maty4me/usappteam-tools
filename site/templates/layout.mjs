/* Shared page chrome: <head>, nav, footer.
   Every page is assembled from these — there is no runtime framework. */

export const SITE = {
  origin: 'https://tools.usappteam.com',
  main: 'https://usappteam.com',
  brief: 'https://usappteam.com/app-brief',
  bookCall: 'https://usappteam.com/book-call',
  name: 'US APP Team',
  hubTitle: 'Free Tools for App Founders',
  email: 'contact@mail.usappteam.com',
};

export const esc = (s = '') =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const jsonld = (obj) =>
  `<script type="application/ld+json">${JSON.stringify(obj).replace(/</g, '\\u003c')}</script>`;

export function head({ title, description, canonical, ogImage, markdownUrl, schemas = [] }) {
  return `<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${esc(canonical)}">
<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1">
<meta name="theme-color" content="#F6F7F9">
<meta property="og:type" content="website">
<meta property="og:site_name" content="${esc(SITE.name)}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${esc(canonical)}">
<meta property="og:image" content="${esc(SITE.origin + ogImage)}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(description)}">
<meta name="twitter:image" content="${esc(SITE.origin + ogImage)}">
${markdownUrl ? `<link rel="alternate" type="text/markdown" href="${esc(markdownUrl)}" title="Markdown version for AI agents">` : ''}
<link rel="icon" href="/favicon.ico" sizes="any">
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="stylesheet" href="/styles/tokens.css">
<link rel="stylesheet" href="/styles/site.css">
${schemas.map(jsonld).join('\n')}`;
}

export function nav() {
  return `<a class="skip-link" href="#main">Skip to content</a>
<header class="nav">
  <div class="wrap nav-in">
    <a class="nav-brand" href="/">
      <img src="/logo-A-128.png" alt="" width="30" height="30">
      <span>US APP TEAM</span>
    </a>
    <nav class="nav-menu" aria-label="Main">
      <a href="/">Free Tools</a>
      <a class="hide-sm" href="${SITE.main}/how-it-works">How it works</a>
      <a class="hide-sm" href="${SITE.main}/pricing">Pricing</a>
      <a class="nav-cta" href="${SITE.brief}">Start your app brief</a>
    </nav>
  </div>
</header>`;
}

export function footer() {
  const year = new Date().getUTCFullYear();
  return `<footer class="foot">
  <div class="wrap">
    <div class="foot-in">
      <div class="foot-brand">
        <a class="nav-brand" href="/">
          <img src="/logo-A-128.png" alt="" width="30" height="30">
          <span>US APP TEAM</span>
        </a>
        <p>Free tools for founders with app ideas. We turn ideas into live apps on the App Store and Google Play &mdash; done for you, fixed price, you own everything.</p>
      </div>
      <div class="foot-cols">
        <div class="foot-col">
          <h4>Free Tools</h4>
          <a href="/">All tools</a>
          <a href="/llms.txt">llms.txt</a>
          <a href="/sitemap.xml">Sitemap</a>
        </div>
        <div class="foot-col">
          <h4>US APP Team</h4>
          <a href="${SITE.main}/how-it-works">How it works</a>
          <a href="${SITE.main}/pricing">Pricing</a>
          <a href="${SITE.main}/portfolio">Portfolio</a>
          <a href="${SITE.main}/faq">FAQ</a>
        </div>
        <div class="foot-col">
          <h4>Start</h4>
          <a href="${SITE.brief}">Start your app brief</a>
          <a href="${SITE.bookCall}">Book a call</a>
          <a href="mailto:${SITE.email}">${SITE.email}</a>
        </div>
      </div>
    </div>
    <div class="foot-legal">
      <span>&copy; ${year} US APP Team &middot; Ai Automate Ltd Co.</span>
      <span>
        <a href="${SITE.main}/privacy">Privacy</a> &nbsp;
        <a href="${SITE.main}/terms">Terms</a>
      </span>
    </div>
  </div>
</footer>`;
}

export function page({ headHtml, body, bodyEnd = '' }) {
  return `<!doctype html>
<html lang="en">
<head>
${headHtml}
</head>
<body>
${nav()}
<main id="main">
${body}
</main>
${footer()}
${bodyEnd}
</body>
</html>`;
}

/** CTA block that closes every tool page — the whole point of the free-tools play. */
export function ctaBlock(label = 'Start your app brief') {
  return `<section class="cta-block">
  <p class="eyebrow">Built by US APP Team</p>
  <h2>Need more than a free tool?</h2>
  <p>We build custom mobile apps for founders and small businesses &mdash; idea to live on the App Store and Google Play. Fixed price, no surprises, and you own the code.</p>
  <a class="btn-primary" href="${SITE.brief}">${esc(label)} <span aria-hidden="true">&rarr;</span></a>
  <span class="cta-sub">Takes about 3 minutes &middot; or <a href="${SITE.bookCall}">book a free intro call</a></span>
</section>`;
}
