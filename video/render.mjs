#!/usr/bin/env node
/* Render one tool's demo video end to end.
 *
 *   record  -> screen.webm + scenes.json
 *   voice   -> vo.mp3 + captions.json/.vtt   (edge-tts, free; fatal if it fails)
 *   remotion-> media/<slug>/demo.mp4 + poster.jpg + captions.vtt
 *
 * Then flips tool.json video.status to "rendered" so the next build emits the
 * video block and VideoObject schema. Failing here must never block a tool from
 * shipping — the caller (CI) treats a non-zero exit as "publish without video",
 * which is a visible outcome: the page ships without a video block and CI opens
 * an issue. A *silent* video is the bad case, because nothing surfaces it, so a
 * voiceover failure aborts the render rather than degrading quietly.
 *
 * Usage: node video/render.mjs <slug>
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const slug = process.argv[2];
if (!slug) {
  console.error('usage: node video/render.mjs <slug>');
  process.exit(1);
}

const OUT = path.join(ROOT, 'video', 'out', slug);
const PUBLIC = path.join(ROOT, 'video', 'remotion', 'public');
const MEDIA = path.join(ROOT, 'media', slug);
const exists = async (f) => !!(await fs.stat(f).catch(() => null));

function run(cmd, args, opts = {}) {
  // Windows needs shell:true to resolve `npx`, but shell mode also splits an
  // absolute path on its spaces ("C:\Program Files\..."), so only shell out for
  // bare command names.
  const shell = process.platform === 'win32' && !path.isAbsolute(cmd);
  return new Promise((resolve, reject) => {
    const c = spawn(cmd, args, { stdio: 'inherit', shell, ...opts });
    c.on('error', reject);
    c.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`${cmd} exited ${code}`))));
  });
}

const isoDuration = (sec) => {
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `PT${m ? `${m}M` : ''}${s}S`;
};

async function main() {
  const metaFile = path.join(ROOT, 'tools', slug, 'tool.json');
  const meta = JSON.parse(await fs.readFile(metaFile, 'utf8'));

  console.log(`\n=== ${slug}: recording ===`);
  await run(process.execPath, [path.join(ROOT, 'video', 'record.mjs'), slug]);

  console.log(`\n=== ${slug}: voiceover ===`);
  await run(process.execPath, [path.join(ROOT, 'video', 'voiceover.mjs'), slug]);

  const captions = JSON.parse(await fs.readFile(path.join(OUT, 'captions.json'), 'utf8'));
  if (!captions.lines?.length || !(captions.duration > 0)) {
    throw new Error('voiceover produced no captions — refusing to render a silent video');
  }
  const hasVoiceover = true;
  const { marks } = JSON.parse(await fs.readFile(path.join(OUT, 'scenes.json'), 'utf8'));

  // Attach each declared scene to the timestamp its mark actually fired at.
  const scenes = (meta.video?.scenes || [])
    .map((s) => {
      const m = marks.find((x) => x.name === s.mark);
      return m ? { label: s.label, at: m.at } : null;
    })
    .filter(Boolean);

  // The recording length is the floor; the narration usually runs a little longer.
  const recSec = marks.length ? marks[marks.length - 1].at + 3 : 45;
  const durationInSeconds = Math.max(recSec, captions.duration || 0, 20);

  // Stage everything Remotion reads out of staticFile().
  await fs.rm(PUBLIC, { recursive: true, force: true });
  await fs.mkdir(path.join(PUBLIC, 'rec', slug), { recursive: true });
  await fs.cp(path.join(ROOT, 'video', 'assets'), PUBLIC, { recursive: true });
  await fs.copyFile(path.join(OUT, 'screen.webm'), path.join(PUBLIC, 'rec', slug, 'screen.webm'));
  await fs.copyFile(path.join(OUT, 'vo.mp3'), path.join(PUBLIC, 'rec', slug, 'vo.mp3'));
  await fs.copyFile(path.join(ROOT, 'site', 'static', 'logo-A-512.png'), path.join(PUBLIC, 'logo-A-512.png'));

  const musicDir = path.join(PUBLIC, 'music');
  const beds = (await fs.readdir(musicDir).catch(() => [])).filter((f) => /\.(mp3|m4a|wav)$/i.test(f));
  // Same tool always gets the same bed — reruns stay byte-comparable.
  const music = beds.length
    ? `music/${beds[[...slug].reduce((a, c) => a + c.charCodeAt(0), 0) % beds.length]}`
    : null;
  if (!music) console.log('  no music bed found — rendering without one');

  const props = {
    slug,
    title: meta.title,
    durationInSeconds,
    captions,
    scenes,
    hasVoiceover,
    music,
  };
  const propsFile = path.join(OUT, 'props.json');
  await fs.writeFile(propsFile, JSON.stringify(props));

  console.log(`\n=== ${slug}: remotion (${durationInSeconds.toFixed(1)}s) ===`);
  await fs.mkdir(MEDIA, { recursive: true });
  const remotionDir = path.join(ROOT, 'video', 'remotion');
  const mp4 = path.join(MEDIA, 'demo.mp4');

  await run('npx', ['remotion', 'render', 'src/index.jsx', 'ToolDemo', mp4,
    '--props', propsFile, '--crf', '23', '--log', 'error'], { cwd: remotionDir });

  // Poster = a frame inside the branded end card, not a mid-demo frame with a
  // half-finished caption burned into it. Must match Root.jsx's duration maths.
  const totalFrames = Math.round((durationInSeconds + 3.2) * 30);
  await run('npx', ['remotion', 'still', 'src/index.jsx', 'ToolDemo',
    path.join(MEDIA, 'poster.jpg'), '--props', propsFile,
    '--frame', String(totalFrames - 40), '--log', 'error'], { cwd: remotionDir });

  await fs.copyFile(path.join(OUT, 'captions.vtt'), path.join(MEDIA, 'captions.vtt'));

  meta.video = {
    ...meta.video,
    status: 'rendered',
    renderedAt: new Date().toISOString().slice(0, 10),
    durationISO: isoDuration(durationInSeconds),
    hasVoiceover,
  };
  await fs.writeFile(metaFile, JSON.stringify(meta, null, 2) + '\n');

  const size = (await fs.stat(mp4)).size;
  console.log(`\nrender: ${slug} -> media/${slug}/demo.mp4 (${(size / 1e6).toFixed(1)} MB)`);
}

main().catch((e) => {
  console.error(`render: ${slug} FAILED — ${e.message}`);
  process.exit(1);
});
