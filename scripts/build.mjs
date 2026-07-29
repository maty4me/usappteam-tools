#!/usr/bin/env node
/* Build tools/<slug>/ + templates -> dist/
 *
 * Everything derives from each tool's tool.json. The daily routine only ever
 * writes a tools/<slug>/ folder; this script produces the pages, hub, search
 * index, sitemap, and the llms.txt files that make the tools findable by agents.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { marked } from 'marked';
import { SITE, BASE, esc, head, page, ctaBlock } from '../site/templates/layout.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
const p = (...s) => path.join(ROOT, ...s);

const exists = async (f) => !!(await fs.stat(f).catch(() => null));
const readJSON = async (f) => JSON.parse(await fs.readFile(f, 'utf8'));

async function copyDir(from, to) {
  if (!(await exists(from))) return;
  await fs.cp(from, to, { recursive: true });
}

/* ---------------- load tools ---------------- */

async function loadTools() {
  const dir = p('tools');
  if (!(await exists(dir))) return [];
  const slugs = (await fs.readdir(dir, { withFileTypes: true }))
    .filter((d) => d.isDirectory())
    .map((d) => d.name);

  const tools = [];
  for (const slug of slugs) {
    const metaFile = p('tools', slug, 'tool.json');
    if (!(await exists(metaFile))) {
      console.warn(`  ! skipping ${slug}: no tool.json`);
      continue;
    }
    const meta = await readJSON(metaFile);
    meta.slug ||= slug;
    if (meta.draft) { console.log(`  - ${slug} is draft, skipped`); continue; }

    // A half-written folder (an agent mid-flight, a bad commit) must not take
    // the whole site down — skip it loudly instead.
    const missing = [];
    for (const f of ['tool.html', 'index.md']) {
      if (!(await exists(p('tools', slug, f)))) missing.push(f);
    }
    if (missing.length) {
      console.warn(`  ! skipping ${slug}: missing ${missing.join(', ')}`);
      continue;
    }

    meta.html = await fs.readFile(p('tools', slug, 'tool.html'), 'utf8');
    meta.markdown = await fs.readFile(p('tools', slug, 'index.md'), 'utf8');
    meta.url = `${SITE.origin}/tools/${slug}/`;
    meta.mdUrl = `/tools/${slug}.md`;
    meta.hasVideo =
      meta.video?.status === 'rendered' && (await exists(p('media', slug, 'demo.mp4')));
    tools.push(meta);
  }
  // newest first
  tools.sort((a, b) => String(b.datePublished).localeCompare(String(a.datePublished)));
  return tools;
}

/* ---------------- schema.org ---------------- */

function toolSchemas(t) {
  const s = [
    {
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      name: t.title,
      description: t.description,
      url: t.url,
      applicationCategory: 'BusinessApplication',
      operatingSystem: 'Any (web browser)',
      browserRequirements: 'Requires JavaScript',
      datePublished: t.datePublished,
      isAccessibleForFree: true,
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
      publisher: {
        '@type': 'Organization',
        name: SITE.name,
        url: SITE.main,
        logo: `${SITE.origin}/logo-A-512.png`,
      },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Free Tools', item: `${SITE.origin}/` },
        { '@type': 'ListItem', position: 2, name: t.title, item: t.url },
      ],
    },
  ];

  if (t.faq?.length) {
    s.push({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: t.faq.map((f) => ({
        '@type': 'Question',
        name: f.q,
        acceptedAnswer: { '@type': 'Answer', text: f.a },
      })),
    });
  }

  if (t.hasVideo) {
    s.push({
      '@context': 'https://schema.org',
      '@type': 'VideoObject',
      name: `How to use the ${t.title}`,
      description: `A short walkthrough of the free ${t.title} from US APP Team.`,
      thumbnailUrl: [`${SITE.origin}/media/${t.slug}/poster.jpg`],
      uploadDate: t.video.renderedAt || t.datePublished,
      contentUrl: `${SITE.origin}/media/${t.slug}/demo.mp4`,
      embedUrl: t.url,
      ...(t.video.durationISO ? { duration: t.video.durationISO } : {}),
    });
  }
  return s;
}

/* ---------------- tool page ---------------- */

function toolPage(t) {
  const headHtml = head({
    title: `${t.title} — Free Tool | US APP Team`,
    description: t.description,
    canonical: t.url,
    ogImage: `/og/${t.slug}.png`,
    markdownUrl: BASE + t.mdUrl,
    schemas: toolSchemas(t),
  });

  const intro = t.intro ? marked.parse(t.intro) : '';
  const steps = t.howTo?.length
    ? `<section class="sec-sm prose">
  <h2>How to use it</h2>
  <ol>${t.howTo.map((s) => `<li>${esc(s)}</li>`).join('')}</ol>
</section>`
    : '';

  const video = t.hasVideo
    ? `<section class="video-block">
  <h2>Watch: how to use this tool</h2>
  <div class="video-frame">
    <video controls preload="none" playsinline poster="${BASE}/media/${t.slug}/poster.jpg" width="1280" height="720">
      <source src="${BASE}/media/${t.slug}/demo.mp4" type="video/mp4">
      <track kind="captions" srclang="en" label="English" src="${BASE}/media/${t.slug}/captions.vtt" default>
      Your browser does not support embedded video. <a href="${BASE}/media/${t.slug}/demo.mp4">Download the walkthrough</a>.
    </video>
  </div>
</section>`
    : '';

  const faq = t.faq?.length
    ? `<section class="sec-sm">
  <h2>Questions</h2>
  ${t.faq
    .map(
      (f) => `<details class="faq-item">
    <summary>${esc(f.q)}</summary>
    <div class="faq-a">${esc(f.a)}</div>
  </details>`
    )
    .join('\n  ')}
</section>`
    : '';

  const body = `<div class="wrap">
  <section class="tool-hero">
    <p class="breadcrumb"><a href="${BASE}/">Free Tools</a> <span aria-hidden="true">/</span> ${esc(t.title)}</p>
    <h1>${esc(t.title)}</h1>
    <p class="lede">${esc(t.tagline)}</p>
    <div class="prose">${intro}</div>
  </section>

  <div class="tool-shell">
${t.html}
  </div>

${video}
${steps}
${faq}
${ctaBlock(t.cta?.label || 'Start your app brief')}
</div>`;

  return page({ headHtml, body });
}

/* ---------------- hub ---------------- */

function hubPage(tools) {
  const categories = [...new Set(tools.map((t) => t.category).filter(Boolean))].sort();

  const schemas = [
    {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: `${SITE.hubTitle} | ${SITE.name}`,
      description:
        'A growing library of free, no-signup web tools for people building or planning a mobile app. New tool every day.',
      url: `${SITE.origin}/`,
    },
    {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      itemListElement: tools.map((t, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        name: t.title,
        url: t.url,
      })),
    },
  ];

  const headHtml = head({
    title: `${SITE.hubTitle} — Free, No Signup | US APP Team`,
    description:
      'Free calculators, generators and checkers for anyone building a mobile app. No signup, no email required. A new tool is published every day.',
    canonical: `${SITE.origin}/`,
    ogImage: '/og/hub.png',
    schemas,
  });

  const cards = tools
    .map(
      (t) => `<a class="card" href="${BASE}/tools/${t.slug}/" data-slug="${esc(t.slug)}" data-category="${esc(t.category || '')}" data-search="${esc([t.title, t.tagline, t.description, ...(t.keywords || [])].join(' ').toLowerCase())}">
    <div class="card-thumb">${
      t.hasVideo
        ? `<img src="${BASE}/media/${t.slug}/poster.jpg" alt="" loading="lazy" width="1280" height="720">`
        : `<span class="glyph" aria-hidden="true">${esc((t.title || '?')[0])}</span>`
    }</div>
    <div class="card-body">
      <h3>${esc(t.title)}</h3>
      <p>${esc(t.tagline)}</p>
      <div class="card-meta">
        <span class="badge free">Free</span>
        <span class="badge">${esc(t.category || 'tool')}</span>
      </div>
    </div>
  </a>`
    )
    .join('\n  ');

  const body = `<div class="wrap">
  <section class="hub-hero">
    <p class="eyebrow">A new tool every day</p>
    <h1>Free tools for people building apps</h1>
    <p class="lede">Calculators, generators and checkers that answer the questions founders actually ask before they build. No signup. No email. Nothing to install.</p>

    <div class="search-row">
      <div class="search-box">
        <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
        <label class="skip-link" for="tool-search">Search tools</label>
        <input id="tool-search" type="search" placeholder="Search tools — try &ldquo;cost&rdquo; or &ldquo;name&rdquo;" autocomplete="off">
      </div>
    </div>
    ${
      categories.length > 1
        ? `<div class="chips" role="group" aria-label="Filter by category">
      <button class="chip" type="button" data-cat="" aria-pressed="true">All</button>
      ${categories.map((c) => `<button class="chip" type="button" data-cat="${esc(c)}" aria-pressed="false">${esc(c)}</button>`).join('\n      ')}
    </div>`
        : ''
    }
    <p class="result-count" id="result-count" aria-live="polite">${tools.length} tool${tools.length === 1 ? '' : 's'}</p>
  </section>

  <div class="grid" id="tool-grid">
  ${cards}
  </div>
  <p class="empty" id="empty-state" hidden>No tools match that search yet. Try a broader word &mdash; or <a href="${SITE.brief}">tell us what you need built</a>.</p>

  ${ctaBlock()}
</div>`;

  const bodyEnd = `<script>
(function () {
  var input = document.getElementById('tool-search');
  var grid = document.getElementById('tool-grid');
  var count = document.getElementById('result-count');
  var empty = document.getElementById('empty-state');
  var chips = Array.prototype.slice.call(document.querySelectorAll('.chip'));
  var cards = Array.prototype.slice.call(grid.querySelectorAll('.card'));
  var cat = '';

  function apply() {
    var q = (input.value || '').trim().toLowerCase();
    var terms = q ? q.split(/\\s+/) : [];
    var shown = 0;
    cards.forEach(function (c) {
      var hay = c.getAttribute('data-search') || '';
      var okCat = !cat || c.getAttribute('data-category') === cat;
      var okQ = terms.every(function (t) { return hay.indexOf(t) !== -1; });
      var show = okCat && okQ;
      c.hidden = !show;
      if (show) shown++;
    });
    count.textContent = shown + (shown === 1 ? ' tool' : ' tools');
    empty.hidden = shown !== 0;
  }

  var timer;
  input.addEventListener('input', function () {
    clearTimeout(timer);
    timer = setTimeout(apply, 120);
  });

  chips.forEach(function (chip) {
    chip.addEventListener('click', function () {
      cat = chip.getAttribute('data-cat') || '';
      chips.forEach(function (c) { c.setAttribute('aria-pressed', String(c === chip)); });
      apply();
    });
  });
})();
</script>`;

  return page({ headHtml, body, bodyEnd });
}

function notFoundPage() {
  const headHtml = head({
    title: 'Not found — US APP Team Free Tools',
    description:
      'That page does not exist on the US APP Team free tools site. Browse the full library of free, no-signup calculators and generators for app founders instead.',
    canonical: `${SITE.origin}/404.html`,
    ogImage: '/og/hub.png',
  });
  return page({
    headHtml,
    body: `<div class="wrap sec">
  <h1>That page moved or never existed</h1>
  <p class="lede">Nothing here. The tool library is one click away.</p>
  <a class="btn-primary" href="${BASE}/">Browse free tools <span aria-hidden="true">&rarr;</span></a>
</div>`,
  });
}

/* ---------------- agent-facing text files ---------------- */

function llmsTxt(tools) {
  return `# US APP Team — Free Tools

> Free, no-signup web tools for founders and small businesses planning or building a mobile app.
> Published by US APP Team (${SITE.main}), an app-development-as-a-service company that takes an
> idea to a live app on the App Store and Google Play. A new free tool is published every day.

Every tool below is a self-contained browser tool. Nothing is stored, no account is needed, and each
tool has a plain-markdown version linked next to it for machine reading.

## Tools

${tools
  .map(
    (t) =>
      `- [${t.title}](${t.url}): ${t.description} — markdown: ${SITE.origin}${t.mdUrl}`
  )
  .join('\n')}

## About US APP Team

- Homepage: ${SITE.main}
- How it works: ${SITE.main}/how-it-works
- Pricing: ${SITE.main}/pricing
- Start an app brief: ${SITE.brief}
- Book a call: ${SITE.bookCall}
- Contact: ${SITE.email}

## Full content

- [Everything, concatenated](${SITE.origin}/llms-full.txt)
`;
}

function llmsFullTxt(tools) {
  return `# US APP Team — Free Tools (full text)

Generated ${new Date().toISOString().slice(0, 10)}. Source: ${SITE.origin}

${tools.map((t) => `\n---\n\n# ${t.title}\n\nURL: ${t.url}\n\n${t.markdown.replace(/^---[\s\S]*?---\n/, '').trim()}`).join('\n')}

---

## About US APP Team

US APP Team builds custom mobile apps for founders and small businesses: idea to live on the
App Store and Google Play, done for you, fixed price, and the client owns everything.
Start a brief at ${SITE.brief} or book a call at ${SITE.bookCall}.
`;
}

function sitemap(tools) {
  const today = new Date().toISOString().slice(0, 10);
  const urls = [
    { loc: `${SITE.origin}/`, pri: '1.0', lastmod: today },
    ...tools.map((t) => ({ loc: t.url, pri: '0.8', lastmod: t.datePublished || today })),
  ];
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (u) => `  <url>
    <loc>${u.loc}</loc>
    <lastmod>${u.lastmod}</lastmod>
    <priority>${u.pri}</priority>
  </url>`
  )
  .join('\n')}
</urlset>
`;
}

function robotsTxt() {
  return `User-agent: *
Allow: /

# The whole point of this site is to be read by AI agents. Explicitly welcome them.
User-agent: GPTBot
Allow: /
User-agent: OAI-SearchBot
Allow: /
User-agent: ChatGPT-User
Allow: /
User-agent: ClaudeBot
Allow: /
User-agent: Claude-User
Allow: /
User-agent: PerplexityBot
Allow: /
User-agent: Google-Extended
Allow: /
User-agent: Applebot-Extended
Allow: /

Sitemap: ${SITE.origin}/sitemap.xml
`;
}

/* ---------------- OG images ---------------- */

async function buildOgImages(tools) {
  let sharp;
  try {
    ({ default: sharp } = await import('sharp'));
  } catch {
    console.log('  - sharp not installed, using the static OG fallback for every page');
    const fallback = p('site', 'static', 'og-default.png');
    if (await exists(fallback)) {
      await fs.mkdir(path.join(DIST, 'og'), { recursive: true });
      for (const name of ['hub', ...tools.map((t) => t.slug)]) {
        await fs.copyFile(fallback, path.join(DIST, 'og', `${name}.png`));
      }
    }
    return;
  }

  await fs.mkdir(path.join(DIST, 'og'), { recursive: true });
  const wrapText = (s, per) => {
    const words = String(s).split(/\s+/);
    const lines = [];
    let line = '';
    for (const w of words) {
      if ((line + ' ' + w).trim().length > per) { lines.push(line.trim()); line = w; }
      else line += ' ' + w;
    }
    if (line.trim()) lines.push(line.trim());
    return lines.slice(0, 3);
  };

  const card = (title, kicker) => {
    const lines = wrapText(title, 26);
    return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#2E9BC7"/><stop offset="45%" stop-color="#2380B8"/><stop offset="100%" stop-color="#A83268"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="#F6F7F9"/>
  <rect x="0" y="0" width="1200" height="10" fill="url(#g)"/>
  <text x="80" y="132" font-family="Space Grotesk, Segoe UI, sans-serif" font-size="26" font-weight="700" fill="#2380B8" letter-spacing="4">${esc(kicker)}</text>
  ${lines
    .map(
      (l, i) =>
        `<text x="80" y="${232 + i * 78}" font-family="Space Grotesk, Segoe UI, sans-serif" font-size="66" font-weight="700" fill="#17202B">${esc(l)}</text>`
    )
    .join('\n  ')}
  <text x="80" y="546" font-family="Inter, Segoe UI, sans-serif" font-size="30" fill="#5A6675">Free &#183; no signup &#183; tools.usappteam.com</text>
  <rect x="0" y="620" width="1200" height="10" fill="url(#g)"/>
</svg>`);
  };

  await sharp(card('Free tools for people building apps', 'US APP TEAM'))
    .png()
    .toFile(path.join(DIST, 'og', 'hub.png'));
  for (const t of tools) {
    await sharp(card(t.title, 'FREE TOOL')).png().toFile(path.join(DIST, 'og', `${t.slug}.png`));
  }
}

/* ---------------- main ---------------- */

async function main() {
  console.log('build: start');
  await fs.rm(DIST, { recursive: true, force: true });
  await fs.mkdir(DIST, { recursive: true });

  const tools = await loadTools();
  console.log(`build: ${tools.length} tool(s)`);

  // static passthrough
  await copyDir(p('site', 'static'), DIST);
  await copyDir(p('site', 'styles'), path.join(DIST, 'styles'));
  await copyDir(p('media'), path.join(DIST, 'media'));

  // pages
  await fs.writeFile(path.join(DIST, 'index.html'), hubPage(tools));
  await fs.writeFile(path.join(DIST, '404.html'), notFoundPage());

  for (const t of tools) {
    const dir = path.join(DIST, 'tools', t.slug);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(dir, 'index.html'), toolPage(t));
    // markdown companion, served at /tools/<slug>.md for agents
    await fs.writeFile(path.join(DIST, 'tools', `${t.slug}.md`), t.markdown);
  }

  // machine-readable index
  await fs.writeFile(
    path.join(DIST, 'tools.json'),
    JSON.stringify(
      {
        site: SITE.origin,
        updated: new Date().toISOString().slice(0, 10),
        count: tools.length,
        tools: tools.map((t) => ({
          slug: t.slug,
          title: t.title,
          tagline: t.tagline,
          description: t.description,
          category: t.category,
          keywords: t.keywords || [],
          url: t.url,
          markdown: SITE.origin + t.mdUrl,
          datePublished: t.datePublished,
          video: t.hasVideo ? `${SITE.origin}/media/${t.slug}/demo.mp4` : null,
        })),
      },
      null,
      2
    )
  );

  await fs.writeFile(path.join(DIST, 'sitemap.xml'), sitemap(tools));
  await fs.writeFile(path.join(DIST, 'robots.txt'), robotsTxt());
  await fs.writeFile(path.join(DIST, 'llms.txt'), llmsTxt(tools));
  await fs.writeFile(path.join(DIST, 'llms-full.txt'), llmsFullTxt(tools));
  // Emitting CNAME makes Pages serve ONLY the custom domain, so it must wait
  // until the DNS record exists — otherwise the site is unreachable everywhere.
  // Set CUSTOM_DOMAIN=1 (repo variable) once tools.usappteam.com resolves.
  if (process.env.CUSTOM_DOMAIN === '1') {
    await fs.writeFile(path.join(DIST, 'CNAME'), 'tools.usappteam.com\n');
  } else {
    console.log('  - CNAME withheld (set CUSTOM_DOMAIN=1 once DNS is live)');
  }
  await fs.writeFile(path.join(DIST, '.nojekyll'), '');

  await buildOgImages(tools);

  console.log(`build: done -> dist/ (${tools.length} tools)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
