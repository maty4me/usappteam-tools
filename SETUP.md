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
- Narration is **free** — edge-tts (Microsoft Edge's neural read-aloud voices), no API key
  and no Actions secret. `pip install edge-tts` is a CI step. The old `ELEVENLABS_API_KEY`
  secret is no longer used; set `USE_ELEVENLABS=1` only for a hand-tuned one-off.
- Issue label `video-failed`, opened by CI when a render fails.
- `BASE_PATH` / `CUSTOM_DOMAIN` in the workflow are set for the custom domain.
  They only need changing if the site ever moves back to the project URL.

## Avatar — retired 2026-07-30

The corner avatar card was removed from the composition at Mathias's request; videos are now
voiceover + screen walkthrough only. `video/avatar.mjs` and `video/assets/avatar/` remain in the
repo but nothing reads them. If it ever comes back, the old lessons: Veo will not accept a request
for stillness and silence (describe a quiet room instead), and every clip ramps in from a
saturated background for ~2.5s, which `avatar.mjs` trims via `AVATAR_TRIM`.

## Known blocker — the cloud routine cannot push

As of 2026-07-30 the daily cloud routine builds a tool correctly and then fails at `git push` with
**HTTP 403 on git-receive-pack**. Fetch and clone work, so the repo is attached properly; only
writing is denied. The GitHub App path fails the same way (`Resource not accessible by
integration`), and re-attaching the repo with `access: "push"` reports `already_present` without
changing anything.

The Claude GitHub App installation has read access to this repo but not **`contents: write`**. Grant
it and the loop works unattended — nothing in the repo needs changing.

Where to grant it (an owner has to do this; it cannot be done from the API with a personal token):

- **GitHub → Settings → Applications → Installed GitHub Apps → Claude → Configure.** Confirm this
  repository is in the allowed list, and accept any pending permission request shown at the top of
  that page.
- If a permission request is not offered there, reconnect GitHub from the Claude Code environment
  settings on claude.ai so the App re-requests scopes, then accept on GitHub.

Until then, a run's work dies with its container. Two consequences worth knowing: the backlog item
stays `todo` on the remote, so the next successful run rebuilds and ships it automatically; and the
routine's report is the only copy of what it wrote, which is why ROUTINE.md now tells it to include
the files there regardless of size.

**This is now handled locally.** `scripts/daily.ps1` runs the same job on this workstation, where
Git Credential Manager already authenticates. Installed as the scheduled task
`usappteam-free-tool-daily`, daily at 07:00, with `StartWhenAvailable` so a sleeping machine catches
up rather than skipping the day. Logs go to `scripts/logs/YYYY-MM-DD.log`.

```powershell
.\scripts\daily.ps1 -Install     # install (elevated)
.\scripts\daily.ps1              # run now
.\scripts\daily.ps1 -Uninstall   # remove
```

The cloud routine is still armed and still blocked; once the App permission is granted, either can
run and whichever goes first wins — the other finds the folder already present and moves on.

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
