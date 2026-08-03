#!/usr/bin/env node
/* Generate the narration track for one tool's demo video.
 *
 * Uses edge-tts (see video/tts.py) — Microsoft Edge's neural read-aloud voices,
 * free and with no API key. The daily pipeline runs unattended, so a voiceover
 * that needs a paid key is both a standing bill and a standing failure mode.
 *
 * Word-level timings come back with the audio and drive two things that must
 * agree: the burned-in captions in the Remotion composition, and the .vtt track
 * on the page.
 *
 * ElevenLabs is still available for a hand-tuned one-off — set USE_ELEVENLABS=1
 * with ELEVENLABS_API_KEY (or ~/.elevenlabs/api_key) — but nothing needs it.
 *
 * Usage: node video/voiceover.mjs <slug>
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const slug = process.argv[2];
if (!slug) {
  console.error('usage: node video/voiceover.mjs <slug>');
  process.exit(1);
}

const OUT = path.join(ROOT, 'video', 'out', slug);
const PY = process.env.PYTHON || (process.platform === 'win32' ? 'python' : 'python3');

const ts = (sec) => {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${s.toFixed(3).padStart(6, '0')}`;
};

function run(cmd, args) {
  return new Promise((resolve, reject) => {
    const c = spawn(cmd, args, {
      stdio: 'inherit',
      shell: process.platform === 'win32' && !path.isAbsolute(cmd),
    });
    c.on('error', reject);
    c.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`${cmd} exited ${code}`))));
  });
}

/* ---------------- edge-tts (default, free) ---------------- */

async function edgeTts(text) {
  const textFile = path.join(OUT, 'narration.txt');
  const jsonFile = path.join(OUT, 'tts.json');
  await fs.writeFile(textFile, text, 'utf8');

  const args = [path.join(ROOT, 'video', 'tts.py'), textFile, path.join(OUT, 'vo.mp3'), jsonFile];
  if (process.env.TTS_VOICE) args.push(process.env.TTS_VOICE);
  if (process.env.TTS_RATE) args.push(process.env.TTS_VOICE ? process.env.TTS_RATE : '+4%');

  try {
    await run(PY, args);
  } catch (e) {
    throw new Error(
      `edge-tts failed (${e.message}). Install it with: pip install edge-tts`
    );
  }
  return JSON.parse(await fs.readFile(jsonFile, 'utf8'));
}

/* ---------------- ElevenLabs (opt-in) ---------------- */

function elevenToCues(chars, starts, ends) {
  const words = [];
  let cur = null;
  for (let i = 0; i < chars.length; i++) {
    const c = chars[i];
    if (/\s/.test(c)) {
      if (cur) { words.push(cur); cur = null; }
      continue;
    }
    if (!cur) cur = { text: '', start: starts[i], end: ends[i] };
    cur.text += c;
    cur.end = ends[i];
  }
  if (cur) words.push(cur);

  const lines = [];
  let line = [];
  for (const w of words) {
    line.push(w);
    const text = line.map((x) => x.text).join(' ');
    const endsClause = /[.,!?;:]$/.test(w.text);
    if (text.length >= 42 || (endsClause && text.length >= 22) || line.length >= 9) {
      lines.push(line);
      line = [];
    }
  }
  if (line.length) lines.push(line);

  return {
    words,
    lines: lines.map((l) => ({
      text: l.map((x) => x.text).join(' '),
      start: l[0].start,
      end: l[l.length - 1].end,
    })),
    duration: words.length ? words[words.length - 1].end : 0,
  };
}

async function elevenLabs(text) {
  const VOICE_ID = process.env.ELEVENLABS_VOICE_ID || 'JBFqnCBsd6RMkjVDRZzb';
  let key = process.env.ELEVENLABS_API_KEY?.trim();
  if (!key) {
    key = (await fs.readFile(path.join(os.homedir(), '.elevenlabs', 'api_key'), 'utf8').catch(() => '')).trim();
  }
  if (!key) throw new Error('USE_ELEVENLABS=1 but no ELEVENLABS_API_KEY found');

  const res = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}/with-timestamps?output_format=mp3_44100_128`,
    {
      method: 'POST',
      headers: { 'xi-api-key': key, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text,
        model_id: 'eleven_multilingual_v2',
        voice_settings: { stability: 0.45, similarity_boost: 0.75, style: 0.1, use_speaker_boost: true },
      }),
    }
  );
  if (!res.ok) throw new Error(`ElevenLabs ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const data = await res.json();
  await fs.writeFile(path.join(OUT, 'vo.mp3'), Buffer.from(data.audio_base64, 'base64'));

  const a = data.alignment || data.normalized_alignment;
  return elevenToCues(a.characters, a.character_start_times_seconds, a.character_end_times_seconds);
}

/* ---------------- main ---------------- */

async function main() {
  const meta = JSON.parse(await fs.readFile(path.join(ROOT, 'tools', slug, 'tool.json'), 'utf8'));
  const text = meta.video?.narration?.trim();
  if (!text) throw new Error(`tools/${slug}/tool.json has no video.narration`);

  await fs.mkdir(OUT, { recursive: true });

  const useEleven = process.env.USE_ELEVENLABS === '1';
  const { words, lines, duration } = useEleven ? await elevenLabs(text) : await edgeTts(text);

  await fs.writeFile(
    path.join(OUT, 'captions.json'),
    JSON.stringify({ slug, duration, words, lines }, null, 2)
  );

  const vtt =
    'WEBVTT\n\n' +
    lines.map((l, i) => `${i + 1}\n${ts(l.start)} --> ${ts(l.end)}\n${l.text}\n`).join('\n');
  await fs.writeFile(path.join(OUT, 'captions.vtt'), vtt);

  console.log(
    `voiceover: ${slug} -> ${duration.toFixed(1)}s, ${words.length} words, ` +
      `${lines.length} caption lines (${useEleven ? 'elevenlabs' : 'edge-tts, free'})`
  );
}

main().catch((e) => {
  console.error(`voiceover: ${e.message}`);
  process.exit(1);
});
