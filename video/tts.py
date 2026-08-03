#!/usr/bin/env python3
"""Free neural text-to-speech with word-level timings, via edge-tts.

Microsoft Edge's read-aloud voices, which are free and need no API key or
account. That matters here: the daily pipeline runs unattended in CI, so a
voiceover that depends on a paid key is a standing bill and a standing failure
mode. This has neither.

`boundary="WordBoundary"` is the important flag — edge-tts 7 defaults to
SentenceBoundary, which would only give us chunky sentence-level captions. Word
timings are what let the burned-in captions track the narration.

Usage:  python video/tts.py <text-file> <out-mp3> <out-json> [voice] [rate]
Writes the mp3 and a JSON payload of {duration, words[], lines[]}.
"""
import asyncio
import json
import re
import sys

import edge_tts

# Warm, confident, honest — the closest match to the brand read.
DEFAULT_VOICE = "en-US-AndrewNeural"
DEFAULT_RATE = "+4%"


def to_lines(words):
    """Group word timings into caption lines of a readable length."""
    lines, cur = [], []
    for w in words:
        cur.append(w)
        text = " ".join(x["text"] for x in cur)
        ends_clause = bool(re.search(r"[.,!?;:]$", w["text"]))
        if len(text) >= 42 or (ends_clause and len(text) >= 22) or len(cur) >= 9:
            lines.append(cur)
            cur = []
    if cur:
        lines.append(cur)
    return [
        {
            "text": " ".join(x["text"] for x in ln),
            "start": ln[0]["start"],
            "end": ln[-1]["end"],
        }
        for ln in lines
    ]


async def main():
    if len(sys.argv) < 4:
        print("usage: tts.py <text-file> <out-mp3> <out-json> [voice] [rate]", file=sys.stderr)
        return 1

    text_file, out_mp3, out_json = sys.argv[1], sys.argv[2], sys.argv[3]
    voice = sys.argv[4] if len(sys.argv) > 4 else DEFAULT_VOICE
    rate = sys.argv[5] if len(sys.argv) > 5 else DEFAULT_RATE

    with open(text_file, encoding="utf-8") as fh:
        text = fh.read().strip()
    if not text:
        print("tts: empty narration", file=sys.stderr)
        return 1

    comm = edge_tts.Communicate(text, voice, rate=rate, boundary="WordBoundary")
    audio = bytearray()
    words = []
    async for chunk in comm.stream():
        if chunk["type"] == "audio":
            audio.extend(chunk["data"])
        elif chunk["type"] == "WordBoundary":
            words.append(
                {
                    "text": chunk["text"],
                    "start": chunk["offset"] / 1e7,
                    "end": (chunk["offset"] + chunk["duration"]) / 1e7,
                }
            )

    if not audio:
        print("tts: no audio returned", file=sys.stderr)
        return 1
    if not words:
        # Without timings the captions would sit still through the whole video,
        # which looks broken. Better to fail and let the caller decide.
        print("tts: no word boundaries returned", file=sys.stderr)
        return 1

    with open(out_mp3, "wb") as fh:
        fh.write(bytes(audio))

    payload = {
        "voice": voice,
        "rate": rate,
        "duration": words[-1]["end"],
        "words": words,
        "lines": to_lines(words),
    }
    with open(out_json, "w", encoding="utf-8") as fh:
        json.dump(payload, fh, indent=1)

    print(
        f"tts: {len(audio)} bytes, {len(words)} words, "
        f"{payload['duration']:.1f}s, {len(payload['lines'])} caption lines"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
