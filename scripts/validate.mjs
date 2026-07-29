#!/usr/bin/env node
/* Pre-deploy gate. Runs against dist/ after build.mjs.
 *
 * The price check is the important one: US APP Team's published prices live in
 * the BRD and nowhere else. An unattended daily agent writing marketing copy
 * must never invent a number, so any dollar figure outside the whitelist fails
 * the build rather than shipping.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');

// BRD §6 — the only prices allowed to appear anywhere.
const ALLOWED_PRICES = ['3,500', '7,500', '12,000', '199', '399', '749', '799', '0'];

const errors = [];
const warnings = [];
const fail = (m) => errors.push(m);
const warn = (m) => warnings.push(m);

async function walk(dir, out = []) {
  for (const e of await fs.readdir(dir, { withFileTypes: true })) {
    const f = path.join(dir, e.name);
    if (e.isDirectory()) await walk(f, out);
    else out.push(f);
  }
  return out;
}

const rel = (f) => path.relative(DIST, f).replace(/\\/g, '/');

function checkHtml(file, html) {
  const name = rel(file);

  const h1 = html.match(/<h1[\s>]/g) || [];
  if (h1.length !== 1) fail(`${name}: expected exactly 1 <h1>, found ${h1.length}`);

  const title = html.match(/<title>([\s\S]*?)<\/title>/)?.[1] || '';
  if (!title) fail(`${name}: missing <title>`);
  else if (title.length > 65) warn(`${name}: title is ${title.length} chars (>65 may truncate in SERPs)`);

  const desc = html.match(/<meta name="description" content="([^"]*)"/)?.[1] || '';
  if (!desc) fail(`${name}: missing meta description`);
  else if (desc.length < 110 || desc.length > 165)
    warn(`${name}: meta description is ${desc.length} chars (aim for 120-160)`);

  if (!/<link rel="canonical"/.test(html)) fail(`${name}: missing canonical link`);
  if (!/<meta property="og:image"/.test(html)) fail(`${name}: missing og:image`);

  // JSON-LD must parse
  const blocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
  if (name !== '404.html' && blocks.length === 0) fail(`${name}: no JSON-LD`);
  blocks.forEach((b, i) => {
    try {
      JSON.parse(b[1].replace(/\\u003c/g, '<'));
    } catch (e) {
      fail(`${name}: JSON-LD block ${i + 1} does not parse — ${e.message}`);
    }
  });

  // no external scripts — tools must be self-contained
  const ext = [...html.matchAll(/<script[^>]+src="(https?:)?\/\/([^"]+)"/g)].map((m) => m[2]);
  if (ext.length) fail(`${name}: external script(s) not allowed: ${ext.join(', ')}`);

  // price whitelist
  for (const m of html.matchAll(/\$\s?([\d][\d,]*(?:\.\d+)?)/g)) {
    const n = m[1].replace(/\.00$/, '');
    if (!ALLOWED_PRICES.includes(n))
      fail(`${name}: price "$${m[1]}" is not in the BRD whitelist (${ALLOWED_PRICES.join(', ')})`);
  }
}

async function main() {
  if (!(await fs.stat(DIST).catch(() => null))) {
    console.error('validate: dist/ not found — run `npm run build` first');
    process.exit(1);
  }

  const files = await walk(DIST);
  const htmlFiles = files.filter((f) => f.endsWith('.html'));

  if (!htmlFiles.length) fail('no HTML pages were built');

  for (const f of htmlFiles) checkHtml(f, await fs.readFile(f, 'utf8'));

  // required artifacts
  for (const req of ['index.html', 'sitemap.xml', 'robots.txt', 'llms.txt', 'llms-full.txt', 'tools.json', '404.html']) {
    if (!files.some((f) => rel(f) === req)) fail(`missing required file: ${req}`);
  }

  // CNAME only exists once the custom domain is switched on — see build.mjs.
  if (process.env.CUSTOM_DOMAIN === '1') {
    const cname = await fs.readFile(path.join(DIST, 'CNAME'), 'utf8').catch(() => '');
    if (cname.trim() !== 'tools.usappteam.com')
      fail(`CNAME is "${cname.trim()}", expected tools.usappteam.com`);
  }

  const index = JSON.parse(await fs.readFile(path.join(DIST, 'tools.json'), 'utf8').catch(() => '{"tools":[]}'));
  const sitemapXml = await fs.readFile(path.join(DIST, 'sitemap.xml'), 'utf8').catch(() => '');
  const llms = await fs.readFile(path.join(DIST, 'llms.txt'), 'utf8').catch(() => '');
  const robots = await fs.readFile(path.join(DIST, 'robots.txt'), 'utf8').catch(() => '');

  if (!robots.includes('Sitemap:')) fail('robots.txt does not reference the sitemap');

  for (const t of index.tools || []) {
    if (!sitemapXml.includes(t.url)) fail(`sitemap.xml is missing ${t.url}`);
    if (!llms.includes(t.url)) fail(`llms.txt is missing ${t.url}`);
    const md = path.join(DIST, 'tools', `${t.slug}.md`);
    const stat = await fs.stat(md).catch(() => null);
    if (!stat) fail(`missing markdown companion: tools/${t.slug}.md`);
    else if (stat.size < 400) fail(`tools/${t.slug}.md is only ${stat.size} bytes — too thin to be useful to an agent`);
    const og = path.join(DIST, 'og', `${t.slug}.png`);
    if (!(await fs.stat(og).catch(() => null))) fail(`missing OG image: og/${t.slug}.png`);
  }

  if (!(index.tools || []).length) fail('tools.json contains no tools');

  for (const w of warnings) console.warn(`  warn  ${w}`);
  for (const e of errors) console.error(`  FAIL  ${e}`);

  if (errors.length) {
    console.error(`\nvalidate: ${errors.length} error(s), ${warnings.length} warning(s)`);
    process.exit(1);
  }
  console.log(`validate: OK — ${htmlFiles.length} page(s), ${(index.tools || []).length} tool(s), ${warnings.length} warning(s)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
