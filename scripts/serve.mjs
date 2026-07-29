#!/usr/bin/env node
/* Static preview of dist/ — `npm run serve`, then open http://127.0.0.1:8744 */
import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';

const DIST = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist');
const PORT = Number(process.env.PORT) || 8744;

const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.ico': 'image/x-icon', '.svg': 'image/svg+xml',
  '.mp4': 'video/mp4', '.vtt': 'text/vtt', '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8', '.xml': 'application/xml',
};

http
  .createServer(async (req, res) => {
    let rel = decodeURIComponent(req.url.split('?')[0]);
    if (rel.endsWith('/')) rel += 'index.html';
    const file = path.join(DIST, rel);
    try {
      if (!file.startsWith(DIST)) throw new Error('traversal');
      const buf = await fs.readFile(file);
      res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
      res.end(buf);
    } catch {
      const nf = await fs.readFile(path.join(DIST, '404.html')).catch(() => 'not found');
      res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(nf);
    }
  })
  .listen(PORT, '127.0.0.1', () => console.log(`serve: http://127.0.0.1:${PORT}`));
