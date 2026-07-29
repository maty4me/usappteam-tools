# Setup — what's done, what's left

## Done

- Repo `maty4me/usappteam-tools` (public — required for a free Pages custom domain).
- GitHub Pages enabled, source = GitHub Actions. Deploying on every push to `main`.
- Actions secret `ELEVENLABS_API_KEY` set (narration voice: George, the established brand voice).
- Issue label `video-failed` created — CI opens one when a render fails so the tool can be retried.
- Daily cloud routine "Free Tool of the Day" armed for 07:00 America/Chicago (12:00 UTC).
- Main-site nav links added to all 10 GoHighLevel page fragments in `../usappteam-site/`, plus a new
  `free-tools.html` teaser page.

## Left to do — needs Mathias

### 1. Point the subdomain (the only real blocker)

In GoHighLevel → Settings → Domains for `usappteam.com`, add:

```
CNAME   tools   maty4me.github.io
```

Then in the repo: Settings → Pages → Custom domain → `tools.usappteam.com` → Save, and tick
**Enforce HTTPS** once the certificate is issued (usually 15–60 minutes).

Finally, in `.github/workflows/publish.yml`, flip the two env values at the top:

```yaml
env:
  BASE_PATH: ''
  CUSTOM_DOMAIN: '1'
```

That emits the `CNAME` file and moves every internal link back to the site root. Until then the site
lives at <https://maty4me.github.io/usappteam-tools/> and works fine there.

If GoHighLevel does not expose raw DNS records for the domain, the records live with whoever GHL
resolves the domain through — that lookup needs Mathias's account either way.

### 2. Paste the GoHighLevel changes

The main site deploys by hand, per `../usappteam-site/README-paste-guide.md`:

- Re-paste the 10 edited fragments (each gained one nav link — `home.html` also gained a footer link).
- Create a new funnel step at slug **`/free-tools`** (no dots — GHL rule) and paste `free-tools.html`.

### 3. Confirm a test lead lands

Click *Start your app brief* from any tool page, complete the wizard with the name "TEST — ignore",
and confirm the contact appears in GoHighLevel. The tools link to the existing live form, so this is
checking the path end to end rather than anything new.

### 4. Optional — improve the videos

- **Avatar loops.** `node video/avatar.mjs` generates a talking and an idle clip with Google Veo from
  `video/assets/avatar/headshot.jpg`. Review both, then commit them to `video/assets/avatar/`. Until
  they exist, videos use an animated headshot card, which already looks right.
- **Music beds.** Drop 2–3 royalty-free instrumentals into `video/assets/music/` — see the README
  there for sources and the licensing caveat. Videos currently render with narration only.

### 5. Optional — Search Console

Add `tools.usappteam.com` as a property and submit `/sitemap.xml`. Worth doing once DNS is live, not
urgent.
