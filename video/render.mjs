#!/usr/bin/env node
/* Render one tool's demo video end to end.
 *
 *   record  -> screen.webm + scenes.json
 *   voice   -> vo.mp3 + captions.json/.vtt   (skipped if no ElevenLabs key)
 *   remotion-> media/<slug>/demo.mp4 + poster.jpg + captions.vtt
 *
 * Then flips tool.json video.status to "rendered" so the next build emits the
 * video block and VideoObject schema. Failing here must never block a tool from
 * shipping — the caller (CI) treats a non-zero exit as "publish without video".
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
  return new Promise((resolve, reject) => {
    const c = spawn(cmd, args, { stdio: 'inherit', shell: process.platform === 'win32', ...opts });
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
  let hasVoiceover = true;
  try {
    await run(process.execPath, [path.join(ROOT, 'video', 'voiceover.mjs'), slug]);
  } catch (e) {
    console.warn(`  voiceover unavailable (${e.message}) — rendering a silent walkthrough`);
    hasVoiceover = false;
  }

  const captions = hasVoiceover
    ? JSON.parse(await fs.readFile(path.join(OUT, 'captions.json'), 'utf8'))
    : { lines: [], words: [], duration: 0 };
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
  if (hasVoiceover) {
    await fs.copyFile(path.join(OUT, 'vo.mp3'), path.join(PUBLIC, 'rec', slug, 'vo.mp3'));
  }
  await fs.copyFile(path.join(ROOT, 'site', 'static', 'logo-A-512.png'), path.join(PUBLIC, 'logo-A-512.png'));

  const hasAvatarVideo =
    (await exists(path.join(PUBLIC, 'avatar', 'talking.webm'))) &&
    (await exists(path.join(PUBLIC, 'avatar', 'idle.webm')));
  if (!hasAvatarVideo) console.log('  avatar loops not present — using the headshot card');

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
    hasAvatarVideo,
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

  await run('npx', ['remotion', 'still', 'src/index.jsx', 'ToolDemo',
    path.join(MEDIA, 'poster.jpg'), '--props', propsFile,
    '--frame', String(Math.round(durationInSeconds * 30) - 20), '--log', 'error'], { cwd: remotionDir });

  if (hasVoiceover) {
    await fs.copyFile(path.join(OUT, 'captions.vtt'), path.join(MEDIA, 'captions.vtt'));
  } else {
    await fs.writeFile(path.join(MEDIA, 'captions.vtt'), 'WEBVTT\n\n');
  }

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
