# Session 7 kickoff prompt — Phase 1b: CI, real Turnstile, studio hosting

Copy the block below into a fresh Claude Code session. (Session 6 is done: staging is live
at `main.limitless3d.pages.dev` — noindex verified, quote pipeline validated from the
public URL, Ryan confirmed email + studio draft. See D-033 and the RESUME section of
`docs/design-decisions.md`.)

**Before pasting — setup status:**

1. GitHub repo `rroethle7474/limitless3d` (private) is the source of truth; local main is
   pushed. Cloudflare Pages project `limitless3d` (Direct Upload, production branch
   `production` = nonexistent on purpose). Deploy today = `npm run build` +
   `npx -y wrangler pages deploy dist --branch main`.
2. The GitHub Action will need two repo secrets Ryan creates (Settings → Secrets →
   Actions): `CLOUDFLARE_API_TOKEN` (create at dash.cloudflare.com/profile/api-tokens,
   "Edit Cloudflare Workers"-style template scoped to the account's Pages) and
   `CLOUDFLARE_ACCOUNT_ID` (`ea498151611f1ad05a01bb395bb06be3`, visible on the Workers &
   Pages overview — not a secret, but tidy as one).
3. Real Turnstile keys: Ryan creates a Turnstile widget in the Cloudflare dash for the
   pages.dev hostname (+ the real domain, ready for cutover). Site key is build-time
   (`PUBLIC_TURNSTILE_SITE_KEY`), secret replaces the test value in the Pages Preview env
   and `.dev.vars` keeps the test pair for local dev.
4. Sanity webhook (rebuild-on-publish) is created at sanity.io/manage/project/1hhfxbth →
   API → Webhooks once the Action exists (GitHub `repository_dispatch` endpoint with a
   PAT, or a `workflow_dispatch` URL — session decides, logs the choice).

---

```
Read CLAUDE.md, then docs/design-decisions.md (start at "RESUME HERE"; D-030
through D-033 are the Sanity + staging state), then the Phase 1b bullets in
limitless3d-rebuild-plan.md §7.

This is Phase 1b, session 7. Staging is live (D-033: Direct-Upload Pages,
noindexed previews, wrangler deploys from the repo). Sanity is live
(D-030–D-032, project 1hhfxbth). The quote pipeline works end to end from
the public URL.

THE TASK, in order:
1. GitHub Action CI: on push to main AND on repository_dispatch (the
   Sanity-publish signal) → npm ci, npm run build (pulls Sanity), npx
   wrangler pages deploy dist --branch main. This restores deploy-on-push
   and delivers rebuild-on-publish in one workflow. Then the Sanity webhook
   pointing at it (fires on publish of any content type; ignore
   quoteSubmission drafts — they must NOT trigger builds).
2. Real Turnstile keys (D-029's env swap): widget for pages.dev + the
   production domain; verify the real challenge renders on staging and a
   submission still passes; test keys stay for local dev.
3. Studio hosting decision: Randy needs a URL in Phase 2. Propose (sanity
   deploy → *.sanity.studio is the zero-infra default) and execute if Ryan
   agrees.
4. Housekeeping: delete the test-submission drafts from the studio; human
   scroll-through of staging on desktop + phone if not yet done.

Validation: push a trivial commit → Action deploys; publish a gallery-entry
tweak in the studio → site rebuilds and shows it; quote submission passes
the REAL Turnstile on staging; submission drafts still don't trigger
builds.

Conventions unchanged: small commits, decision rows (the CI shape, the
webhook filter, studio hosting), plan §10 for refinements.

Out of scope: cutover/DNS, SPF/DKIM/domain verification, Square catalog
(§9.7 credentials), Etsy pull, homepage FAQ, the 1a polish pass (still
owed, separate session).
```
