# Session 9 kickoff prompt — Phase 1b: Turnstile keys + CI + studio hosting

Copy the block below into a fresh Claude Code session.

**The roadmap while Randy is away** (re-sequenced 2026-08-12, Ryan): session 8 = Etsy
reviews — **done 2026-08-12** (D-039/D-040; fixture mode, key pending). Session 9 =
this file. Session 10 = the 1a polish pass + site improvements. Goal: a complete
walkthrough-ready site before Randy is back.

**Before pasting — setup status (as of end of session 8; re-verify against RESUME):**

1. Staging: `main.limitless3d.pages.dev` (D-033, wrangler Direct Upload; deploy =
   `npm run build` + `node scripts/verify-dist.mjs` + `npx -y wrangler pages deploy
   dist --branch main` — the verifier is non-optional since D-038). Sanity live
   (D-030–D-032), Square catalog demo live (D-034–D-038), Etsy reviews live in
   fixture mode (D-039/D-040).
2. **The build needs env** — CI must provide as Actions secrets: the three
   `SQUARE_*` values, `ETSY_API_KEY` + `ETSY_SHOP_ID` (in `.dev.vars` locally),
   and the Sanity/Resend/Turnstile set. **Plus `ETSY_SOURCE`**: keep it `fixture`
   in CI while Ryan's Etsy key sits in the approval queue, flip to `live` once it
   clears (an Actions *variable*, not a secret — it's not sensitive and needs to
   be visibly flippable). The fixture is committed, so fixture-mode CI builds are
   deterministic and network-free on the Etsy side.
3. **Etsy live flip (D-039)** — if the key has cleared by session time (check
   etsy.com/developers/your-apps: app "limitless-3d", registered 2026-08-12 under
   Ryan's account), do the flip FIRST, it's ten minutes: test the `x-api-key`
   header format (keystring alone vs the spec's claimed `keystring:shared_secret`;
   if the secret is really needed, Ryan adds it to `.dev.vars` himself — it was
   deliberately not stored), resolve `findShops?shop_name=Limitless3DDesign`
   (expect shop_id 26921666), set `ETSY_SOURCE=live` in `.dev.vars`, rebuild,
   cross-check rendered numbers against the public shop page, verify-dist, deploy.
   If still pending after ~2 weekdays, Ryan emails developer@etsy.com naming the
   app. The flip blocks nothing in this session — CI ships fixture-mode if needed.
4. GitHub repo `rroethle7474/limitless3d` (private) is the source of truth and the
   CI home. Cloudflare API token for the Action: Ryan creates it interactively when
   asked (Pages:Edit scope) — secrets go to GitHub Actions secrets, never the repo
   or chat. Established rhythm: dashboard steps one at a time, programmatic
   verification after each.
5. Turnstile: real keys come from the Cloudflare dashboard (Ryan, interactively);
   `PUBLIC_TURNSTILE_SITE_KEY` is a build-time var, `TURNSTILE_SECRET_KEY` a Pages
   secret (D-029). Staging currently passes everyone on the test keys.

---

```
Read CLAUDE.md, then docs/design-decisions.md (start at "RESUME HERE";
D-033 is the staging architecture, D-034–D-038 the Square catalog state,
D-039/D-040 the Etsy reviews state), then limitless3d-rebuild-plan.md §7
Phase 1b and the 2026-08-11/12 §10 rows.

This is Phase 1b, session 9: make the pipeline production-shaped —
real Turnstile keys, CI, studio hosting. Randy is back soon; after this
session only the polish pass should remain.

THE TASK:
0. If the Etsy key has cleared approval (etsy.com/developers/your-apps,
   app "limitless-3d"), run D-039's live flip first — the steps are in
   the RESUME section and the kickoff notes above. If not, proceed in
   fixture mode; the flip blocks nothing.
1. Real Turnstile keys (D-029's env swap): walk Ryan through creating
   the widget for the pages.dev + production domains; site key into the
   build env, secret into Pages env (both environments); verify on
   staging that the widget renders real and a submission still lands
   (email + Sanity draft).
2. GitHub Action CI: build + verify-dist (D-038 gate) + `wrangler pages
   deploy` on push to main (restores deploy-on-push, D-033's accepted
   gap) + a `repository_dispatch`/webhook path for Sanity
   rebuild-on-publish + a DAILY `schedule:` cron so Etsy reviews and
   Square catalog data refresh without a publish (Etsy's API Terms cap
   displayed non-listing content at 24h stale — the plan's §10
   2026-08-12 verification row; a weekly cron would violate them).
   All build secrets (Resend/Turnstile/Square/Etsy) as Actions secrets,
   ETSY_SOURCE as an Actions variable (fixture until the key clears) —
   walk Ryan through the imports, verify with a real push-triggered
   deploy and a studio publish-triggered rebuild.
3. Studio hosting so Randy has a URL for Phase 2 (recommend: Sanity's
   hosted studio via `sanity deploy` — zero infra; log the decision).
4. Verify everything from the public staging URL; decision rows + RESUME
   as work lands; push.

Out of scope: cutover/DNS, Randy's real Square credentials, the polish
pass (next session), homepage FAQ, new Etsy surface area (the reviews
feature is done — only the env flip remains).
```
