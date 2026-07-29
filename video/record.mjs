#!/usr/bin/env node
/* Record a screen demo of one tool.
 *
 * Serves dist/ locally, opens the tool page, and runs the tool's own demo.mjs
 * against it. The demo script calls mark(name) at each step; those timestamps
 * are what the Remotion composition uses to place the step badges, so the
 * overlays stay in sync even when the recording drifts.
 *
 * Usage: node video/record.mjs <slug> [--out video/out/<slug>]
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const slug = process.argv[2];
if (!slug) {
  console.error('usage: node video/record.mjs <slug>');
  process.exit(1);
}
const outDir = path.join(ROOT, 'video', 'out', slug);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.svg': 'image/svg+xml',
  '.mp4': 'video/mp4',
  '.vtt': 'text/vtt',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.xml': 'application/xml',
};

function serve(dir) {
  return new Promise((resolve) => {
    const server = http.createServer(async (req, res) => {
      try {
        let rel = decodeURIComponent(req.url.split('?')[0]);
        if (rel.endsWith('/')) rel += 'index.html';
        const file = path.join(dir, rel);
        if (!file.startsWith(dir)) throw new Error('traversal');
        const buf = await fs.readFile(file);
        res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
        res.end(buf);
      } catch {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('not found');
      }
    });
    server.listen(0, '127.0.0.1', () => resolve({ server, port: server.address().port }));
  });
}

/* The demo runs against the real page. We hide the site chrome so the frame is
   all tool — the nav and footer are noise in a 60-second walkthrough. */
const FOCUS_CSS = `
  .nav, .foot, .cta-block, .video-block, .breadcrumb { display: none !important; }
  body { background: #F6F7F9 !important; }
  main { padding-top: 18px; }
  * { scrollbar-width: none; }
  ::-webkit-scrollbar { display: none; }
`;

const CURSOR_JS = `
(() => {
  const c = document.createElement('div');
  c.id = '__cursor';
  c.style.cssText = 'position:fixed;width:22px;height:22px;border-radius:50%;' +
    'background:rgba(35,128,184,.28);border:2px solid #2380B8;pointer-events:none;' +
    'z-index:2147483647;transform:translate(-50%,-50%);transition:left .45s cubic-bezier(.16,1,.3,1),' +
    'top .45s cubic-bezier(.16,1,.3,1),transform .15s ease;left:-100px;top:-100px;';
  document.documentElement.appendChild(c);
  window.__cursorTo = (x, y) => { c.style.left = x + 'px'; c.style.top = y + 'px'; };
  window.__cursorPulse = () => {
    c.style.transform = 'translate(-50%,-50%) scale(.7)';
    setTimeout(() => { c.style.transform = 'translate(-50%,-50%) scale(1)'; }, 150);
  };
  window.__marks = [];
  window.__t0 = performance.now();
  window.__mark = (name) => {
    window.__marks.push({ name, at: (performance.now() - window.__t0) / 1000 });
  };
})();
`;

async function main() {
  const { chromium } = await import('playwright');
  const dist = path.join(ROOT, 'dist');
  if (!(await fs.stat(dist).catch(() => null))) {
    console.error('record: dist/ not found — run `npm run build` first');
    process.exit(1);
  }

  await fs.rm(outDir, { recursive: true, force: true });
  await fs.mkdir(outDir, { recursive: true });

  const { server, port } = await serve(dist);
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    deviceScaleFactor: 2,
    recordVideo: { dir: outDir, size: { width: 1280, height: 720 } },
    reducedMotion: 'no-preference',
  });
  const page = await context.newPage();

  await page.addInitScript(CURSOR_JS);
  await page.goto(`http://127.0.0.1:${port}/tools/${slug}/`, { waitUntil: 'networkidle' });
  await page.addStyleTag({ content: FOCUS_CSS });

  // Move the real mouse and the visible cursor together so clicks look intentional.
  const origClick = page.click.bind(page);
  page.click = async (sel, opts) => {
    const el = await page.waitForSelector(sel, { state: 'visible', timeout: 15000 });
    const box = await el.boundingBox();
    if (box) {
      const x = box.x + box.width / 2;
      const y = box.y + box.height / 2;
      await page.evaluate(([x, y]) => window.__cursorTo(x, y), [x, y]);
      await page.mouse.move(x, y, { steps: 12 });
      await page.waitForTimeout(480);
      await page.evaluate(() => window.__cursorPulse());
    }
    return origClick(sel, opts);
  };

  const mark = async (name) => {
    await page.evaluate((n) => window.__mark(n), name);
    console.log(`  mark: ${name}`);
  };

  await page.waitForTimeout(1200);

  const demoPath = path.join(ROOT, 'tools', slug, 'demo.mjs');
  const { default: demo } = await import(pathToFileURL(demoPath).href);
  await demo(page, mark);

  await page.waitForTimeout(1400);

  const marks = await page.evaluate(() => window.__marks);
  const video = page.video();
  await context.close();
  await browser.close();
  server.close();

  const raw = await video.path();
  const dest = path.join(outDir, 'screen.webm');
  if (path.resolve(raw) !== path.resolve(dest)) {
    await fs.rename(raw, dest).catch(async () => {
      await fs.copyFile(raw, dest);
    });
  }
  await fs.writeFile(path.join(outDir, 'scenes.json'), JSON.stringify({ slug, marks }, null, 2));

  console.log(`record: ${slug} -> ${dest} (${marks.length} marks)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
