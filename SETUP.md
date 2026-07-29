# Setup — status

Everything below is done. Kept as a record of how the pieces fit together.

## Live

- **https://tools.usappteam.com** — GitHub Pages, HTTPS enforced, deploying from
  `.github/workflows/publish.yml` on every push to `main`.
- **DNS**: `CNAME tools -> maty4me.github.io`, added in GoHighLevel under
  Sub-account Settings -> Domains & URL Redirects -> usappteam.com -> DNS records.
- Three tools live, each with a rendered demo video, captions and poster.
- **https://usappteam.com/free-tools** — teaser page on the main site.
- All 10 existing GoHighLevel pages carry a "Free Tools" nav link.
- Daily cloud routine "Free Tool of the Day" runs at 07:00 America/Chicago.

## Repo configuration

- Public repo (a free Pages custom domain requires it).
- Actions secret `ELEVENLABS_API_KEY` for narration.
- Issue label `video-failed`, opened by CI when a render fails.
- `BASE_PATH` / `CUSTOM_DOMAIN` in the workflow are set for the custom domain.
  They only need changing if the site ever moves back to the project URL.

## Avatar

`video/assets/avatar/{talking,idle}.webm` were generated with Google Veo from
`headshot.jpg` via `node video/avatar.mjs`. Two things to know before regenerating:

- Veo rejected the original idle brief outright — it will not accept a request
  for stillness and silence. The prompt now describes a quiet room and a pause
  between sentences instead.
- Every clip so far ramps in from a saturated, nightclub-looking background for
  roughly the first 2.5 seconds before settling into the studio look that was
  asked for. Behind a looping avatar that strobes, so `avatar.mjs` trims it.
  Tune with `AVATAR_TRIM` and re-check the first second of the output.

## Still optional

- **Music beds** — drop royalty-free instrumentals into `video/assets/music/`
  and every subsequent render picks one up. See the README there for sources and
  the licensing caveat. Videos currently run with narration only, which is a
  deliberate default: a clean voiceover beats a badly chosen bed.
- **Search Console** — add `tools.usappteam.com` and submit `/sitemap.xml`.
- **A real test lead** — the app-brief wizard is a 13-section form and it feeds
  a live CRM, so it is worth submitting once by hand rather than with fabricated
  answers. The path itself is verified: the CTA on every tool page resolves to
  the wizard, and the deployed wizard still posts to the same LeadConnector
  webhook as the source file.
