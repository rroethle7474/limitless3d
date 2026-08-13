# Session 8 kickoff prompt — Phase 1b: Etsy reviews auto-pull

Copy the block below into a fresh Claude Code session.

**The roadmap while Randy is away** (re-sequenced 2026-08-12, Ryan): session 8 = Etsy
reviews (this file). Session 9 = real Turnstile keys + GitHub Action CI + studio
hosting (prompt preserved below — carry it forward). Session 10 = the 1a polish pass +
site improvements. Goal: a complete walkthrough-ready site before Randy is back.

**Before pasting — setup status:**

1. Staging: `main.limitless3d.pages.dev` (D-033; deploy = `npm run build` +
   `node scripts/verify-dist.mjs` + `npx -y wrangler pages deploy dist --branch main`
   — the verifier is non-optional since D-038). Sanity live (D-030–D-032), Square
   catalog demo live (D-034–D-037).
2. **Groundwork already done** — read the plan's §10 2026-08-09 Etsy row first: the
   investigation settled `getReviewsByShop` (Etsy Open API v3, API-key auth, no
   reviewer display names), build-time fetch with zero client JS, and the hybrid
   shape: auto-refresh the proof-bar aggregate (the numbers are what rot) + a
   5★-filtered featured pool, with §4.2 owner curation as override. FTC framing:
   the truthful aggregate (4.8 / 500+) always displays beside filtered highlights.
3. **§9.8's gate falls the same way §9.7's did**: Ryan registers his own Etsy
   developer app (etsy.com/developers, any Etsy account; provisional API keys work
   immediately for public endpoints). Randy's go becomes a walkthrough validation,
   not a build dependency. Key → `.dev.vars` (`ETSY_API_KEY`, `ETSY_SHOP_ID`),
   never repo or chat; Ryan does dashboard steps one at a time with programmatic
   verification after each (established rhythm).
4. Current reviews state: 3 curated testimonials in Sanity (quote band + reviews-page
   cards, D-030); proof-bar STATS is a Sanity singleton; the shop is
   `limitless3ddesign.etsy.com` (shop id resolved via API at session time).

---

```
Read CLAUDE.md, then docs/design-decisions.md (start at "RESUME HERE"),
then limitless3d-rebuild-plan.md §4.2, §9.8, and the §10 rows for
2026-08-09 (Etsy investigation) and 2026-08-12.

This is Phase 1b, session 8: reviews pulled from Etsy at build time,
demoed against Ryan's own Etsy developer key — Randy's shop data is
public; his sign-off happens at the walkthrough like everything else.

THE TASK:
0. VERIFY CURRENT ETSY API REALITY FIRST (docs may have drifted from
   the 2026-08-09 investigation): app registration flow, whether
   getReviewsByShop works with just an API key (no OAuth), provisional-
   key limits, and Etsy's display/attribution requirements for review
   data. Adjust the plan before touching code; log deltas.
1. Walk Ryan through registering the Etsy app + getting the API key
   (one step per message; key into .dev.vars as ETSY_API_KEY; resolve
   and record ETSY_SHOP_ID via the API, not guesswork).
2. Build-time module src/data/etsy.ts (cms.ts/square.ts contract:
   top-level await, fail-loud §3b, no Etsy code client-side): shop
   resource for the aggregate numbers (review average, review count,
   sales count) + enough review pages for a 5★-with-text featured pool.
3. Wire the hybrid: proof-bar aggregate auto-feeds from Etsy (decide
   and log which STATS entries flip from the Sanity singleton to live
   Etsy values vs stay owner-edited — e.g. "Star Seller" may have no
   API source); curated Sanity testimonials keep the quote band and
   existing reviews-page cards; add an auto-refreshed recent-reviews
   strip on /reviews from the 5★ pool, styled inside the existing
   rcards/design vocabulary (no new design language). Truthful
   aggregate always visible beside filtered quotes (FTC framing);
   Etsy attribution per their terms.
4. Verify: build renders with values cross-checked against the public
   Etsy shop page; zero client JS added; verify-dist passes; deploy to
   staging and re-verify from the public URL.
5. Docs as work lands: decision rows (data model, which stats went
   live, curation/override semantics, attribution), §9.8 re-scope in
   the plan, RESUME update, and hand the CI session its new
   requirement: a weekly scheduled rebuild (GitHub Action `schedule:`)
   so reviews refresh without a publish — plus ETSY_API_KEY in the CI
   secrets list.

Constraints unchanged: static site, build-time fetch only, verbatim
review text (no paraphrasing; truncation rules get a decision row),
secrets in .dev.vars, small commits.

Out of scope: Turnstile/CI/studio hosting (session 9), the polish pass
(session 10), Randy's real Square credentials, cutover, homepage FAQ.
```

---

# Session 9 kickoff prompt — Phase 1b: Turnstile keys + CI + studio hosting

**Setup status (as of end of session 7 — re-verify against RESUME):**

1. Staging: `main.limitless3d.pages.dev` (D-033, wrangler Direct Upload; deploy =
   `npm run build` + `node scripts/verify-dist.mjs` + `npx -y wrangler pages deploy
   dist --branch main`). Sanity live (D-030–D-032). Square catalog demo live on
   Ryan's sandbox (D-034–D-037): /parts + 61 PDPs build from the catalog;
   `.dev.vars` carries `SQUARE_ACCESS_TOKEN`, `SQUARE_ENVIRONMENT=sandbox`,
   `SQUARE_LOCATION_ID=LW9TD5V61XPXA`.
2. **The build needs Square env** — CI must provide the three `SQUARE_*` values as
   secrets alongside Sanity/Resend/Turnstile ones — **plus `ETSY_API_KEY` +
   `ETSY_SHOP_ID` once session 8 lands.**
3. GitHub repo `rroethle7474/limitless3d` (private) is the source of truth and the CI
   home. Cloudflare API token for the Action: Ryan creates it interactively when asked
   (Pages:Edit scope) — secrets go to GitHub Actions secrets, never the repo or chat.
4. Turnstile: real keys come from the Cloudflare dashboard (Ryan, interactively);
   `PUBLIC_TURNSTILE_SITE_KEY` is a build-time var, `TURNSTILE_SECRET_KEY` a Pages
   secret (D-029). Staging currently passes everyone on the test keys.

```
Read CLAUDE.md, then docs/design-decisions.md (start at "RESUME HERE";
D-033 is the staging architecture, D-034–D-038 the Square catalog state),
then limitless3d-rebuild-plan.md §7 Phase 1b and the 2026-08-11/12 §10 rows.

This is Phase 1b, session 9: make the pipeline production-shaped —
real Turnstile keys, CI, studio hosting. Randy is back soon; after this
session only the polish pass should remain.

THE TASK:
1. Real Turnstile keys (D-029's env swap): walk Ryan through creating
   the widget for the pages.dev + production domains; site key into the
   build env, secret into Pages env (both environments); verify on
   staging that the widget renders real and a submission still lands
   (email + Sanity draft).
2. GitHub Action CI: build + verify-dist (D-038 gate) + `wrangler pages
   deploy` on push to main (restores deploy-on-push, D-033's accepted
   gap) + a `repository_dispatch`/webhook path for Sanity
   rebuild-on-publish + a WEEKLY `schedule:` cron so Etsy reviews and
   Square catalog data refresh without a publish (session 8's
   requirement). All build secrets (Resend/Turnstile/Square/Etsy) as
   Actions secrets — walk Ryan through the imports, verify with a real
   push-triggered deploy and a studio publish-triggered rebuild.
3. Studio hosting so Randy has a URL for Phase 2 (recommend: Sanity's
   hosted studio via `sanity deploy` — zero infra; log the decision).
4. Verify everything from the public staging URL; decision rows + RESUME
   as work lands; push.

Out of scope: cutover/DNS, Randy's real Square credentials, the polish
pass (next session), homepage FAQ.
```
