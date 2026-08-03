#!/usr/bin/env node
/* Does every live tool actually have all of its parts?
 *
 * validate.mjs checks the built output before deploy; this checks the deployed
 * site afterwards. It answers the question that actually matters — "did today's
 * tool ship complete?" — rather than "did the build produce files".
 *
 * A tool is complete when it has all eight:
 *   page      the tool page returns 200 and carries its <h1>
 *   video     demo.mp4 is present and a plausible size
 *   captions  a .vtt track alongside it
 *   preview   the hub card screenshot
 *   markdown  the AI-agent companion, and not a stub
 *   hub       it is listed on the homepage
 *   sitemap   it is in sitemap.xml
 *   llms      it is in llms.txt
 *
 * Usage: node scripts/audit-live.mjs [origin]
 * Exits non-zero if anything is incomplete, so it can gate the daily run.
 */
const ORIGIN = (process.argv[2] || 'https://tools.usappteam.com').replace(/\/$/, '');

async function get(path) {
  try {
    const res = await fetch(ORIGIN + path, { signal: AbortSignal.timeout(30000) });
    const body = res.ok ? await res.arrayBuffer() : new ArrayBuffer(0);
    return { status: res.status, bytes: body.byteLength, text: () => new TextDecoder().decode(body) };
  } catch {
    return { status: 0, bytes: 0, text: () => '' };
  }
}

const CHECKS = [
  'page', 'video', 'captions', 'preview', 'markdown', 'hub', 'sitemap', 'llms',
];

async function main() {
  const indexRes = await get('/tools.json');
  if (indexRes.status !== 200) {
    console.error(`audit: cannot read ${ORIGIN}/tools.json (status ${indexRes.status})`);
    process.exit(1);
  }
  const index = JSON.parse(indexRes.text());

  const [hub, sitemap, llms] = await Promise.all([get('/'), get('/sitemap.xml'), get('/llms.txt')]);
  const hubHtml = hub.text();
  const sitemapXml = sitemap.text();
  const llmsTxt = llms.text();

  console.log(`audit: ${ORIGIN} — ${index.count} tool(s)\n`);
  console.log(`${'tool'.padEnd(32)}${CHECKS.map((c) => c.slice(0, 4).padEnd(9)).join('')}`);

  const broken = [];
  for (const t of index.tools) {
    const s = t.slug;
    const [page, video, vtt, preview, md] = await Promise.all([
      get(`/tools/${s}/`),
      get(`/media/${s}/demo.mp4`),
      get(`/media/${s}/captions.vtt`),
      get(`/media/${s}/preview.png`),
      get(`/tools/${s}.md`),
    ]);

    const results = {
      page: page.status === 200 && page.text().includes('<h1>'),
      video: video.status === 200 && video.bytes > 200_000,
      captions: vtt.status === 200 && vtt.bytes > 200,
      preview: preview.status === 200 && preview.bytes > 10_000,
      markdown: md.status === 200 && md.bytes > 2_000,
      hub: hubHtml.includes(`/tools/${s}/`),
      sitemap: sitemapXml.includes(`/tools/${s}/`),
      llms: llmsTxt.includes(`/tools/${s}/`),
    };

    const failed = CHECKS.filter((c) => !results[c]);
    if (failed.length) broken.push({ slug: s, failed });
    console.log(
      s.padEnd(32) + CHECKS.map((c) => (results[c] ? 'ok' : 'FAIL').padEnd(9)).join('')
    );
  }

  console.log();
  if (broken.length) {
    for (const b of broken) console.error(`  ${b.slug}: missing ${b.failed.join(', ')}`);
    console.error(`\naudit: ${broken.length} of ${index.count} tool(s) incomplete`);
    process.exit(1);
  }
  console.log(`audit: all ${index.count} tool(s) complete — page, video, captions, preview, markdown, and listed in the hub, sitemap and llms.txt`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
