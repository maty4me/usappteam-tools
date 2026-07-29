#!/usr/bin/env node
/* Screenshot each tool's actual interface for its hub card.
 *
 * The card used to fall back to the video poster, which is the branded end
 * card — so every card looked identical and showed nothing about the tool.
 * A card should show the thing you are about to use.
 *
 * Captures the tool shell only (no nav, no prose, no CTA), 16:9, at the card's
 * display density. Writes media/<slug>/preview.png.
 *
 * Usage: node scripts/previews.mjs [slug ...]     (no args = every tool)
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

/* Hide everything that is not the tool, and give the shell a fixed 16:9 window
   so the crop is predictable regardless of how tall the tool actually is.

   960px rather than 1280: the card renders about 360px wide, so a wider capture
   shrinks the controls into an unreadable smear. This keeps the tool legible at
   card size while staying above most tools' mobile breakpoint. */
const FRAME_CSS = `
  .nav, .foot, .cta-block, .video-block, .breadcrumb, .tool-hero .prose,
  .sec-sm, .faq-item, h1 + .lede { display: none !important; }
  body { background: #F6F7F9 !important; }
  main { padding: 0 !important; }
  .wrap { width: 100% !important; max-width: none !important; }
  .tool-shell {
    margin: 0 !important;
    border: 0 !important;
    border-radius: 0 !important;
    box-shadow: none !important;
    width: 960px !important;
    height: 540px !important;
    overflow: hidden !important;
    padding: 28px !important;
  }
  * { scrollbar-width: none !important; }
  ::-webkit-scrollbar { display: none !important; }
`;

async function main() {
  const { chromium } = await import('playwright');
  if (!(await fs.stat(DIST).catch(() => null))) {
    console.error('previews: dist/ not found — run `npm run build` first');
    process.exit(1);
  }

  const index = JSON.parse(await fs.readFile(path.join(DIST, 'tools.json'), 'utf8'));
  const want = process.argv.slice(2);
  const tools = want.length ? index.tools.filter((t) => want.includes(t.slug)) : index.tools;
  if (!tools.length) {
    console.log('previews: nothing to do');
    return;
  }

  const { s, port } = await serve(DIST);
  const browser = await chromium.launch();

  for (const t of tools) {
    const ctx = await browser.newContext({
      viewport: { width: 960, height: 540 },
      deviceScaleFactor: 2,
      reducedMotion: 'reduce',
    });
    const page = await ctx.newPage();
    await page.goto(`http://127.0.0.1:${port}/tools/${t.slug}/`, { waitUntil: 'networkidle' });
    await page.addStyleTag({ content: FRAME_CSS });
    // Let the tool paint its initial state (many compute a default result on load).
    await page.waitForTimeout(1400);

    const shell = page.locator('.tool-shell');
    if (!(await shell.count())) {
      console.warn(`  ! ${t.slug}: no .tool-shell, skipped`);
      await ctx.close();
      continue;
    }

    const out = path.join(ROOT, 'media', t.slug, 'preview.png');
    await fs.mkdir(path.dirname(out), { recursive: true });
    await shell.screenshot({ path: out });
    const kb = Math.round((await fs.stat(out)).size / 1024);
    console.log(`  ${t.slug} -> media/${t.slug}/preview.png (${kb} KB)`);
    await ctx.close();
  }

  await browser.close();
  s.close();
  console.log(`previews: ${tools.length} captured`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
