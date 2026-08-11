# Session 6 kickoff prompt — Phase 1b: staging deployment

Copy the block below into a fresh Claude Code session. (Sessions 4–5 are done: Sanity is
live end to end — schema, studio, migrated content, D-027 closed. See the RESUME section of
`docs/design-decisions.md` and decisions D-030–D-032.)

**Before pasting — setup status:**

1. Ryan may have already created the Cloudflare Pages project himself (checklist given
   2026-08-09: GitHub push, preview-branch trick for auto-noindex, env vars incl.
   `NODE_VERSION=24`). **First order of business: ask what exists and record it** —
   don't re-derive.
2. Secrets for the Pages env when the time comes (Ryan sets them in the dashboard):
   `RESEND_API_KEY`, `QUOTE_TO_EMAIL`, `TURNSTILE_SECRET_KEY` (real key at staging per
   D-029), `SANITY_API_TOKEN` (Editor token for project `1hhfxbth` — the one in
   `.dev.vars` works, or mint a staging-specific one; NOT Access Manager, that
   permission can't write documents).
3. Real Turnstile keys mean a Cloudflare Turnstile widget for the domain —
   `PUBLIC_TURNSTILE_SITE_KEY` is a BUILD-time env var (inlined), the secret is runtime.

---

```
Read CLAUDE.md, then docs/design-decisions.md (start at "RESUME HERE"; D-030
through D-032 are the Sanity state), then limitless3d-rebuild-plan.md §5.6,
§3b, and the Phase 1b bullets in §7.

This is Phase 1b, session 6: the staging deployment. Sanity is live (project
1hhfxbth, public production dataset, studio local in studio/); the site
builds from it with proven equivalence; quote submissions dual-write (email
+ private draft). Ryan may already have a Cloudflare Pages project — ask
first, record what exists.

THE TASK: get the site deployed to a shareable, noindexed staging URL with
the quote pipeline fully working there, and wire rebuild-on-publish.

Constraints:
- Staging must never be indexable (plan §5.6). Preview deployments get
  X-Robots-Tag: noindex automatically; production pages.dev does not —
  the production-branch-that-doesn't-exist trick keeps everything preview.
- Deploy hook: a Sanity webhook on publish → Pages deploy hook → rebuild.
  Debounce/politeness matters less at this scale than simplicity.
- Real Turnstile keys at staging (D-029's env swap); keep the test keys
  working locally.
- The studio stays local this session unless Ryan asks — hosting it
  (sanity deploy / Pages) is a decision to propose, not assume.
- Verify the deployed staging URL end to end: pages render from Sanity,
  quote submission → email + studio draft, noindex header present.

Small items owed from session 5 (do early): Ryan eyeballs the studio's
Quote submissions list + the three test emails; a human scroll-through of
the site (dist-diff said equivalent; run-and-look is still the convention).
Delete the test-submission drafts after confirming.

Out of scope: cutover/DNS, domain verification/SPF/DKIM, Square catalog,
Etsy pull, homepage FAQ, the 1a polish pass (still owed).
```
