#!/usr/bin/env node
/* Generate the narration track for one tool's demo video.
 *
 * ElevenLabs with-timestamps gives us per-character timings, which we fold into
 * word-level cues. Those drive both the burned-in captions in the Remotion
 * composition and the .vtt track on the page, so the two never disagree.
 *
 * Key: ELEVENLABS_API_KEY env var, or ~/.elevenlabs/api_key (the local convention).
 * Usage: node video/voiceover.mjs <slug>
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const slug = process.argv[2];
if (!slug) {
  console.error('usage: node video/voiceover.mjs <slug>');
  process.exit(1);
}

// George — the established US APP Team / NoMissedCall brand voice.
const VOICE_ID = process.env.ELEVENLABS_VOICE_ID || 'JBFqnCBsd6RMkjVDRZzb';
const MODEL = 'eleven_multilingual_v2';

async function getKey() {
  if (process.env.ELEVENLABS_API_KEY) return process.env.ELEVENLABS_API_KEY.trim();
  const f = path.join(os.homedir(), '.elevenlabs', 'api_key');
  const k = await fs.readFile(f, 'utf8').catch(() => null);
  if (k?.trim()) return k.trim();
  throw new Error('no ElevenLabs key — set ELEVENLABS_API_KEY or write ~/.elevenlabs/api_key');
}

const ts = (sec) => {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${s.toFixed(3).padStart(6, '0')}`;
};

/** Character timings -> word cues -> caption lines of a few words each. */
function toCues(chars, starts, ends) {
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

  return { words, lines: lines.map((l) => ({ text: l.map((x) => x.text).join(' '), start: l[0].start, end: l[l.length - 1].end })) };
}

async function main() {
  const meta = JSON.parse(await fs.readFile(path.join(ROOT, 'tools', slug, 'tool.json'), 'utf8'));
  const text = meta.video?.narration?.trim();
  if (!text) throw new Error(`tools/${slug}/tool.json has no video.narration`);

  const outDir = path.join(ROOT, 'video', 'out', slug);
  await fs.mkdir(outDir, { recursive: true });

  const key = await getKey();
  const res = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}/with-timestamps?output_format=mp3_44100_128`,
    {
      method: 'POST',
      headers: { 'xi-api-key': key, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text,
        model_id: MODEL,
        voice_settings: { stability: 0.45, similarity_boost: 0.75, style: 0.1, use_speaker_boost: true },
      }),
    }
  );

  if (!res.ok) throw new Error(`ElevenLabs ${res.status}: ${(await res.text()).slice(0, 400)}`);
  const data = await res.json();

  await fs.writeFile(path.join(outDir, 'vo.mp3'), Buffer.from(data.audio_base64, 'base64'));

  const a = data.alignment || data.normalized_alignment;
  const { words, lines } = toCues(
    a.characters,
    a.character_start_times_seconds,
    a.character_end_times_seconds
  );
  const duration = words.length ? words[words.length - 1].end : 0;

  await fs.writeFile(
    path.join(outDir, 'captions.json'),
    JSON.stringify({ slug, duration, words, lines }, null, 2)
  );

  const vtt =
    'WEBVTT\n\n' +
    lines.map((l, i) => `${i + 1}\n${ts(l.start)} --> ${ts(l.end)}\n${l.text}\n`).join('\n');
  await fs.writeFile(path.join(outDir, 'captions.vtt'), vtt);

  console.log(`voiceover: ${slug} -> ${duration.toFixed(1)}s, ${words.length} words, ${lines.length} caption lines`);
}

main().catch((e) => {
  console.error(`voiceover: ${e.message}`);
  process.exit(1);
});
