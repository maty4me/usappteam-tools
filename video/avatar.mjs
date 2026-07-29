#!/usr/bin/env node
/* Generate the corner-avatar loops with Google Veo (Gemini API).
 *
 * Run once. The two clips are committed to video/assets/avatar/ and every daily
 * video reuses them — generating per-run would burn credits and let the likeness
 * drift between videos, which is exactly what you don't want in a brand asset.
 *
 * Needs GEMINI_API_KEY (env) or 1Password op://Claude/Gemini API/credential.
 * Usage: node video/avatar.mjs [--model veo-3.1-generate-preview]
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const AVATAR = path.join(ROOT, 'video', 'assets', 'avatar');
const API = 'https://generativelanguage.googleapis.com/v1beta';
const MODEL =
  process.argv.find((a) => a.startsWith('--model='))?.split('=')[1] || 'veo-3.1-generate-preview';

const SHOTS = [
  {
    name: 'talking',
    prompt:
      'Close-up portrait video of the man in the reference photo, framed head and shoulders, ' +
      'centered, facing the camera. He is speaking naturally and warmly to the viewer, with ' +
      'relaxed expressive mouth movement, occasional small head nods and natural blinking. ' +
      'Soft even studio lighting, clean uncluttered light grey background, shallow depth of field. ' +
      'Camera is completely static. No text, no captions, no graphics, no cuts.',
  },
  {
    name: 'idle',
    prompt:
      'Close-up portrait video of the man in the reference photo, framed head and shoulders, ' +
      'centered, facing the camera. He is listening quietly with a calm friendly expression, ' +
      'mouth closed, subtle natural blinking and very slight head movement. ' +
      'Soft even studio lighting, clean uncluttered light grey background, shallow depth of field. ' +
      'Camera is completely static. No text, no captions, no graphics, no cuts.',
  },
];

async function getKey() {
  if (process.env.GEMINI_API_KEY) return process.env.GEMINI_API_KEY.trim();
  const r = spawnSync(
    'python',
    [path.join(process.env.USERPROFILE || process.env.HOME, '.claude', 'helpers', 'op_secrets.py'),
     'get', 'op://Claude/Gemini API/credential'],
    { encoding: 'utf8' }
  );
  const k = (r.stdout || '').trim();
  if (k) return k;
  throw new Error('no Gemini key — set GEMINI_API_KEY or store it at op://Claude/Gemini API/credential');
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function generate(key, shot, imageB64) {
  console.log(`\n=== ${shot.name}: submitting to ${MODEL} ===`);
  const res = await fetch(`${API}/models/${MODEL}:predictLongRunning?key=${key}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      instances: [{ prompt: shot.prompt, image: { bytesBase64Encoded: imageB64, mimeType: 'image/jpeg' } }],
      parameters: { aspectRatio: '9:16', personGeneration: 'allow_adult' },
    }),
  });
  if (!res.ok) throw new Error(`submit ${res.status}: ${(await res.text()).slice(0, 500)}`);
  const op = await res.json();

  let done = op;
  for (let i = 0; i < 60 && !done.done; i++) {
    await sleep(10000);
    const poll = await fetch(`${API}/${op.name}?key=${key}`);
    if (!poll.ok) throw new Error(`poll ${poll.status}: ${(await poll.text()).slice(0, 300)}`);
    done = await poll.json();
    process.stdout.write(`  polling ${(i + 1) * 10}s\r`);
  }
  if (!done.done) throw new Error('timed out after 10 minutes');
  if (done.error) throw new Error(JSON.stringify(done.error).slice(0, 500));

  const vids =
    done.response?.generatedVideos ||
    done.response?.generateVideoResponse?.generatedSamples ||
    done.response?.predictions ||
    [];
  const v = vids[0];
  const uri = v?.video?.uri || v?.video?.videoUri || v?.uri;
  const inline = v?.video?.bytesBase64Encoded || v?.bytesBase64Encoded;

  const raw = path.join(AVATAR, `${shot.name}.raw.mp4`);
  if (inline) {
    await fs.writeFile(raw, Buffer.from(inline, 'base64'));
  } else if (uri) {
    const dl = await fetch(uri.includes('key=') ? uri : `${uri}${uri.includes('?') ? '&' : '?'}key=${key}`);
    if (!dl.ok) throw new Error(`download ${dl.status}`);
    await fs.writeFile(raw, Buffer.from(await dl.arrayBuffer()));
  } else {
    throw new Error(`no video in response: ${JSON.stringify(done.response).slice(0, 400)}`);
  }
  console.log(`  saved ${path.relative(ROOT, raw)}`);
  return raw;
}

/** Square crop + webm so the circular corner card has no letterboxing. */
function toLoop(raw, out) {
  const r = spawnSync(
    'ffmpeg',
    ['-y', '-i', raw, '-vf', "crop='min(iw,ih)':'min(iw,ih)',scale=512:512,fps=25",
     '-an', '-c:v', 'libvpx-vp9', '-b:v', '900k', '-row-mt', '1', out],
    { stdio: 'inherit', shell: process.platform === 'win32' }
  );
  if (r.status !== 0) throw new Error('ffmpeg failed — is it on PATH?');
}

async function main() {
  await fs.mkdir(AVATAR, { recursive: true });
  const headshot = path.join(AVATAR, 'headshot.jpg');
  if (!(await fs.stat(headshot).catch(() => null))) {
    throw new Error(`missing reference photo at ${headshot}`);
  }
  const imageB64 = (await fs.readFile(headshot)).toString('base64');
  const key = await getKey();

  for (const shot of SHOTS) {
    const raw = await generate(key, shot, imageB64);
    const out = path.join(AVATAR, `${shot.name}.webm`);
    toLoop(raw, out);
    await fs.rm(raw, { force: true });
    console.log(`  -> ${path.relative(ROOT, out)}`);
  }

  console.log('\navatar: done. Review both clips, then commit video/assets/avatar/*.webm.');
}

main().catch((e) => {
  console.error(`avatar: ${e.message}`);
  console.error('\nThe pipeline falls back to the static headshot card, so this is not fatal.');
  process.exit(1);
});
