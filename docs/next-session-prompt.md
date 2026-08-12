# Session 7 kickoff prompt — Phase 1b: Square catalog on Ryan's sandbox

Copy the block below into a fresh Claude Code session.

**The roadmap while Randy is away** (agreed 2026-08-11): session 7 = Square catalog demo
(this file). Session 8 = real Turnstile keys + GitHub Action CI (deploy-on-push +
Sanity rebuild-on-publish) + studio hosting. Session 9 = the 1a polish pass + site
improvements. Goal: a complete walkthrough-ready site before Randy is back.

**Before pasting — setup status:**

1. Staging is live: `main.limitless3d.pages.dev` (D-033 — wrangler Direct-Upload deploys;
   `npm run build` + `npx -y wrangler pages deploy dist --branch main`). Sanity live
   (D-030–D-032, project `1hhfxbth`).
2. **Square**: Ryan has a Square account. The session needs sandbox credentials from
   **developer.squareup.com** → create an application → Sandbox access token + sandbox
   location id. Ryan creates these interactively when asked; the token is a secret →
   `.dev.vars` (`SQUARE_ACCESS_TOKEN`, `SQUARE_LOCATION_ID`, plus
   `SQUARE_ENVIRONMENT=sandbox`), never the repo or chat. At cutover these swap to
   Randy's production values — that swap being trivial is the whole design (D-024, §10
   2026-08-11).
3. Product source data: Randy's live shop (public) + the captured snapshot
   (`docs/prototype-snapshot/shop.html` — grid of products; `parts-pdp-example.html` —
   the PDP design). Both hotlink Square CDN — reference only; the build must keep the
   zero-hotlink rule (fetch through Astro's pipeline like the Sanity images, D-031
   pattern).

---

```
Read CLAUDE.md, then docs/design-decisions.md (start at "RESUME HERE";
D-024 is the captured shop design, D-030–D-033 the Sanity/staging state),
then limitless3d-rebuild-plan.md §2, the 2026-08-11 §10 rows, and §9.7.

This is Phase 1b, session 7: the Square catalog, built and demoed against
Ryan's own Square SANDBOX so Randy's walkthrough (he's back in a few days)
shows his actual products with a complete fake-checkout flow — without his
credentials. Those become a cutover-time env swap.

THE TASK:
1. Extract the product inventory from the snapshot + live shop (names,
   prices, descriptions, image URLs, categories if any). Verbatim data;
   log judgment calls.
2. One-off seed script → Ryan's sandbox catalog via Square Catalog API
   (idempotent, same discipline as the Sanity seed). Images uploaded to
   the catalog where the API allows, else carried by the site build.
3. Build the shop section per the captured design (D-024): /parts grid
   page + /parts/<slug> PDPs, fetched at BUILD time (static stays static),
   Square-hosted checkout links (CreatePaymentLink) into the sandbox.
   Existing SHOP_URL link-outs (D-011) keep working until cutover flips
   them to /parts — propose the flip, don't assume it.
4. Verify: build renders the grid + PDPs with zero hotlinks; a fake
   checkout completes in sandbox with Square's test card; deploy to
   staging and re-verify there.

Constraints unchanged: static site, build-time fetch only, no client
Square JS, zero hotlinked images, secrets in .dev.vars, small commits,
decision rows as the work lands (the catalog data model, the slug scheme,
checkout-link approach, what happens to the PartsDoor/SHOP_URL).

Out of scope this session: Randy's real credentials, cutover/DNS, real
Turnstile keys + CI (session 8), the polish pass (session 9), Etsy pull,
homepage FAQ.
```
