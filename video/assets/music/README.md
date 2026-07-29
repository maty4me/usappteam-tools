# Music beds

Drop 2–3 royalty-free instrumental tracks here as `.mp3` and every rendered video picks one up
automatically — no code change needed. `video/render.mjs` chooses deterministically from the slug, so
a given tool always gets the same bed and re-renders stay comparable. The bed is ducked to ~13% under
the narration and comes up to ~34% for the intro and end card.

With no files here, videos render with narration only. That is a deliberate default: a clean
voiceover beats a badly-chosen music bed, so this stays a decision a human makes once.

## Picking tracks

Look for calm, unobtrusive, loopable instrumentals — 60–90 seconds is plenty since the bed loops.
Anything with a strong melody or a drop will fight the narration.

Good free sources, all requiring no attribution for commercial use:

- Pixabay Music — <https://pixabay.com/music/> (there is no API for music, so download by hand)
- Uppbeat free tier — <https://uppbeat.io> (attribution required on the free tier; check before using)
- YouTube Audio Library — <https://studio.youtube.com> → Audio Library

Whatever you pick, save the licence terms next to the file. This site is commercial marketing, so
"free for personal use" is not good enough.
