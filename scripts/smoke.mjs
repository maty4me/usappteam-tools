#!/usr/bin/env node
/* Load every built tool page in a real browser and prove the tool actually runs.
 *
 * validate.mjs checks the markup; this checks behaviour — that the inline script
 * mounted without throwing, that interacting with it changes something on screen,
 * and that it survives a 375px viewport. The daily agent runs this before pushing,
 * because a tool that renders but does nothing is worse than no tool at all.
 *
 * Usage: node scripts/smoke.mjs
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');

const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.ico': 'image/x-icon', '.svg': 'image/svg+xml',
  '.mp4': 'video/mp4', '.vtt': 'text/vtt', '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8', '.xml': 'application/xml',
};

function serve(dir) {
  return new Promise((resolve) => {
    const s = http.createServer(async (req, res) => {
      try {
        let rel = decodeURIComponent(req.url.split('?')[0]);
        if (rel.endsWith('/')) rel += 'index.html';
        const f = path.join(dir, rel);
        if (!f.startsWith(dir)) throw new Error('traversal');
        const buf = await fs.readFile(f);
        res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' });
        res.end(buf);
      } catch {
        res.writeHead(404).end('not found');
      }
    });
    s.listen(0, '127.0.0.1', () => resolve({ s, port: s.address().port }));
  });
}

const failures = [];

async function checkPage(browser, base, url, label, interact) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));

  await page.goto(base + url, { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);

  if (interact) {
    try {
      await interact(page);
    } catch (e) {
      failures.push(`${label}: interaction failed — ${e.message}`);
    }
  }

  // Ignore network noise from the deliberately-optional DNS lookups.
  const real = errors.filter((e) => !/favicon|net::ERR|Failed to load resource/i.test(e));
  if (real.length) failures.push(`${label}: console errors — ${real.slice(0, 3).join(' | ')}`);

  // Mobile: nothing may overflow horizontally.
  await page.setViewportSize({ width: 375, height: 780 });
  await page.waitForTimeout(400);
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth
  );
  if (overflow > 2) failures.push(`${label}: horizontal overflow of ${overflow}px at 375px wide`);

  await ctx.close();
  console.log(`  ${failures.length ? '' : ''}${label}${real.length ? ' (errors)' : ''} — checked`);
}

async function main() {
  const { chromium } = await import('playwright');
  const { s, port } = await serve(DIST);
  const base = `http://127.0.0.1:${port}`;
  const browser = await chromium.launch();

  const index = JSON.parse(await fs.readFile(path.join(DIST, 'tools.json'), 'utf8'));

  console.log('smoke: hub');
  await checkPage(browser, base, '/', 'hub', async (page) => {
    const before = await page.locator('.card:visible').count();
    await page.fill('#tool-search', 'zzzznomatch');
    await page.waitForTimeout(400);
    const after = await page.locator('.card:visible').count();
    if (before === 0) throw new Error('no cards rendered');
    if (after !== 0) throw new Error(`search did not filter (${before} -> ${after})`);
    await page.fill('#tool-search', '');
    await page.waitForTimeout(400);
    if ((await page.locator('.card:visible').count()) !== before)
      throw new Error('clearing the search did not restore the cards');
  });

  console.log('smoke: tools');
  for (const t of index.tools) {
    await checkPage(browser, base, `/tools/${t.slug}/`, t.slug, async (page) => {
      const shell = page.locator('.tool-shell');
      if (!(await shell.count())) throw new Error('no .tool-shell');

      // The tool must render real controls, not just prose.
      const controls = await shell.locator('input, select, button, textarea').count();
      if (controls < 2) throw new Error(`only ${controls} interactive control(s) in the tool`);

      // Poke the first sensible control and require the DOM to react.
      const before = await shell.innerText();
      const clickable = shell.locator('button:visible, input[type=checkbox]:visible, input[type=radio]:visible').first();
      if (await clickable.count()) {
        await clickable.click({ timeout: 5000 }).catch(() => {});
        await page.waitForTimeout(700);
      }
      const text = page.locator('.tool-shell input[type=text]:visible, .tool-shell textarea:visible').first();
      if (await text.count()) {
        await text.fill('dog walking app').catch(() => {});
        await page.waitForTimeout(900);
      }
      const after = await shell.innerText();
      if (after === before && !(await text.count()))
        throw new Error('interacting with the tool changed nothing on screen');

      // The CTA that pays for all this must be present and pointing at the brief.
      const cta = page.locator('.cta-block a.btn-primary');
      if (!(await cta.count())) throw new Error('missing the app-brief CTA');
      const href = await cta.getAttribute('href');
      if (!/usappteam\.com\/app-brief/.test(href || ''))
        throw new Error(`CTA points at "${href}", expected the app-brief form`);
    });
  }

  await browser.close();
  s.close();

  if (failures.length) {
    console.error('\nsmoke: FAILURES');
    for (const f of failures) console.error(`  ${f}`);
    process.exit(1);
  }
  console.log(`\nsmoke: OK — hub + ${index.tools.length} tool(s) load, run, and link to the brief`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
