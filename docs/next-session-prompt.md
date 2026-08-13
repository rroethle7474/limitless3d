# Session 8 kickoff prompt — Phase 1b: Turnstile keys + CI + studio hosting

Copy the block below into a fresh Claude Code session.

**The roadmap while Randy is away** (agreed 2026-08-11): ~~session 7 = Square catalog~~
(done 2026-08-12, D-034–D-036). Session 8 = this file. Session 9 = the 1a polish pass +
site improvements. Goal: a complete walkthrough-ready site before Randy is back.

**Before pasting — setup status:**

1. Staging: `main.limitless3d.pages.dev` (D-033, wrangler Direct Upload; deploy =
   `npm run build` + `npx -y wrangler pages deploy dist --branch main`). Sanity live
   (D-030–D-032). Square catalog demo live on Ryan's sandbox (D-034–D-036): /parts +
   61 PDPs build from the catalog; `.dev.vars` carries `SQUARE_ACCESS_TOKEN`,
   `SQUARE_ENVIRONMENT=sandbox`, `SQUARE_LOCATION_ID=LW9TD5V61XPXA`.
2. **The build now needs Square env** — any CI build must provide the three `SQUARE_*`
   values as secrets alongside the Sanity/Resend/Turnstile ones.
3. GitHub repo `rroethle7474/limitless3d` (private) is the source of truth and the CI
   home. Cloudflare API token for the Action: Ryan creates it interactively when asked
   (Pages:Edit scope) — secrets go to GitHub Actions secrets, never the repo or chat.
4. Turnstile: real keys come from the Cloudflare dashboard (Ryan, interactively);
   `PUBLIC_TURNSTILE_SITE_KEY` is a build-time var, `TURNSTILE_SECRET_KEY` a Pages
   secret (D-029). Staging currently passes everyone on the test keys.
5. Open decision Ryan owns: the SHOP_URL → /parts flip (three touchpoints: `site.ts`
   nav entries, PartsDoor CTA, shipping-page CTA) — D-011 link-outs still point at the
   dead subdomain; flipping makes the demo self-contained for Randy's walkthrough.

---

```
Read CLAUDE.md, then docs/design-decisions.md (start at "RESUME HERE";
D-033 is the staging architecture, D-034–D-036 the Square catalog state),
then limitless3d-rebuild-plan.md §7 Phase 1b and the 2026-08-11/12 §10 rows.

This is Phase 1b, session 8: make the pipeline production-shaped —
real Turnstile keys, CI, studio hosting. Randy is back soon; after this
session only the polish pass (session 9) should remain.

THE TASK:
1. Real Turnstile keys (D-029's env swap): walk Ryan through creating
   the widget for the pages.dev + production domains; site key into the
   build env, secret into Pages env (both environments); verify on
   staging that the widget renders real and a submission still lands
   (email + Sanity draft).
2. GitHub Action CI: build + `wrangler pages deploy` on push to main
   (restores deploy-on-push, D-033's accepted gap) + a
   `repository_dispatch`/webhook path for Sanity rebuild-on-publish.
   All build secrets (Sanity none needed, Resend/Turnstile/Square) as
   Actions secrets — walk Ryan through the imports, verify with a real
   push-triggered deploy and a studio publish-triggered rebuild.
3. Studio hosting so Randy has a URL for Phase 2 (recommend: Sanity's
   hosted studio via `sanity deploy` — zero infra; log the decision).
4. The SHOP_URL → /parts flip if Ryan approves it this session.
5. Verify everything from the public staging URL; decision rows + RESUME
   as work lands; push.

Out of scope: cutover/DNS, Randy's real Square credentials, the polish
pass (session 9), Etsy pull, homepage FAQ.
```
