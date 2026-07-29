#!/usr/bin/env node
/* Keyword universe expansion — the free-sources stand-in for step 1 of the
 * "engineering as marketing" playbook (which uses an Ahrefs blank search).
 *
 * Hits Google and Bing autocomplete with alphabet soup and modifier soup around
 * seeds drawn from what US APP Team actually sells, then filters to app-relevant
 * tool intent. Volume and difficulty are still judged afterwards by reading the
 * live SERP — this only produces the candidate list.
 *
 * These endpoints are unofficial. If they start refusing, the method survives:
 * fall back to WebSearch-driven expansion and keep the same filter.
 *
 * Usage: node research/expand.mjs [--out research/candidates.txt]
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outFile =
  process.argv.find((a) => a.startsWith('--out='))?.split('=')[1] ||
  path.join(ROOT, 'research', 'candidates.txt');

const SEEDS = [
  'app development cost', 'app cost calculator', 'how much does it cost to make an app',
  'app name generator', 'app idea generator', 'mvp cost', 'app privacy policy generator',
  'app store screenshot', 'app revenue calculator', 'app maintenance cost',
  'mobile app builder', 'app development quote', 'app store optimization', 'app icon generator',
  'app monetization calculator', 'app launch checklist', 'app development timeline',
  'subscription revenue calculator', 'app store description generator', 'terms of service generator',
  'app store rating calculator', 'push notification', 'app wireframe', 'app spec template',
  'app requirements document', 'freelance app developer cost', 'app development agency cost',
  'ios app cost', 'android app cost', 'saas pricing calculator', 'break even calculator app',
  'app user retention calculator', 'app idea validation', 'app store keyword',
  // The library is not limited to app-building — everyday browser utilities pull
  // far more traffic and convert through the same CTA.
  'image converter', 'png to jpg', 'compress image', 'resize image',
  'pdf converter', 'csv to json', 'json formatter', 'base64 encode',
  'qr code generator', 'password generator', 'word counter', 'unit converter',
  'color picker', 'invoice generator', 'timestamp converter', 'text case converter',
];

const MODIFIERS = ['free', 'calculator', 'generator', 'checker', 'template', 'estimator', 'tool', 'online'];
const LETTERS = 'abcdefghijklmnopqrstuvwxyz'.split('');

const TOOL_INTENT =
  /\b(calculator|generator|checker|estimator|template|maker|builder|converter|convert|analyzer|validator|compressor|resizer|formatter|counter|encoder|decoder)\b/;
// Either app-related, or a general utility people search for by name.
const RELEVANT =
  /\b(app|apps|mobile|ios|android|saas|mvp|startup|play store|app store|appstore|image|photo|picture|png|jpg|jpeg|webp|pdf|csv|json|xml|html|css|markdown|text|word|file|qr|password|colou?r|unit|currency|date|time|timestamp|invoice|base64|url)\b/;
// Deliberately narrower than the app-only version: file formats and office words
// are now legitimate subject matter, so only genuinely off-topic verticals and
// platform-specific noise are excluded.
const JUNK =
  /\b(casino|loan|pregnan|tattoo|baby|dog|cat|minecraft|fortnite|roblox|anime|pokemon|dnd|clash|gta|nfl|nba|apk|mod|hack|crack|torrent|github|reddit|studio|maui|flutter|unity|figma)\b/;

async function suggest(url) {
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(10000) });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data?.[1]) ? data[1].filter((x) => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

const google = (q) =>
  suggest(`https://suggestqueries.google.com/complete/search?client=firefox&hl=en&gl=us&q=${encodeURIComponent(q)}`);
const bing = (q) => suggest(`https://api.bing.com/osjson.aspx?query=${encodeURIComponent(q)}`);

async function main() {
  const queries = [];
  for (const s of SEEDS) {
    queries.push(s);
    for (const m of MODIFIERS) queries.push(`${s} ${m}`);
    for (const c of LETTERS) queries.push(`${s} ${c}`);
  }

  console.log(`expand: ${queries.length} autocomplete queries`);
  const all = new Set();
  const CONCURRENCY = 6;

  for (let i = 0; i < queries.length; i += CONCURRENCY) {
    const batch = queries.slice(i, i + CONCURRENCY);
    const results = await Promise.all(batch.flatMap((q) => [google(q), bing(q)]));
    for (const list of results) for (const r of list) all.add(r.trim().toLowerCase());
    if (i % 120 === 0) console.log(`  ${i}/${queries.length} — ${all.size} unique`);
  }

  const candidates = [...all]
    .filter((k) => {
      const words = k.split(/\s+/).length;
      return words >= 3 && words <= 6 && TOOL_INTENT.test(k) && RELEVANT.test(k) && !JUNK.test(k);
    })
    .sort();

  await fs.writeFile(outFile, candidates.join('\n') + '\n');
  console.log(`expand: ${all.size} unique -> ${candidates.length} candidates -> ${path.relative(ROOT, outFile)}`);
  console.log('\nNext: judge each finalist by reading its live SERP, then append scored rows to');
  console.log('research/backlog.json and research/keyword-backlog.md.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
