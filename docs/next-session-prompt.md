# Session 5 kickoff prompt — Phase 1b: Sanity build-out (schema approved, nothing built)

Copy the block below into a fresh Claude Code session.

**What session 4 (2026-08-09) did and did not do:** it was research + schema design only.
The content model, the free-tier/PII approach, and the images decision were **proposed and
approved by Ryan**; the session ended at the limit before any code, project, or studio
existed. No repo changes were made except this doc. Session 5 executes the approved spec
below — do not re-open the approved decisions, and do not re-run the research (the
load-bearing facts are recorded here with dates).

**Setup status (unchanged from session 4's header):**

1. Sanity account exists under `rroethle@gmail.com` (free tier, created 2026-08-09).
   No project exists yet.
2. Expect one interactive step early: the Sanity CLI needs a browser login — when the
   session asks, run `! npx -y sanity@latest login` (login state is stored per-machine,
   so it works before the studio workspace exists).
3. The only token to create is the quote function's **write token** (sanity.io/manage →
   API → Tokens, Editor permissions), needed at the D-027 step near the end. Paste it
   into `.dev.vars` yourself; never into the repo or chat. Project id / dataset name are
   not secrets and live in code.

---

```
Read CLAUDE.md, then docs/design-decisions.md (start at "RESUME HERE"), then
docs/next-session-prompt.md in full — it carries the approved Sanity spec
from session 4. Plan context: limitless3d-rebuild-plan.md §4, §3b, §7
Phase 1b; decisions D-026/D-027.

This is Phase 1b, session 5. Session 4 got Ryan's approval on the complete
Sanity schema and the decisions below; NOTHING is built. Your job is pure
execution of the approved spec: stand up the project + studio, seed the
content, wire the build, close D-027. Constraints (static site, build-time
fetch only, no client Sanity JS, secrets in .dev.vars, verbatim copy)
are unchanged from CLAUDE.md and the spec below.

Validation loop (unchanged): a local studio Ryan can click through with
migrated content; npm run build pulls from Sanity and dist/ HTML diffs
clean against the hardcoded build (copy byte-for-byte; image hashes may
differ where photos moved to Sanity); a quote submission through wrangler
lands BOTH the email and a studio-visible document. Run-and-look at each
stage; hand off for review at: (1) studio + schema + seeded content,
(2) site building from Sanity + diff, (3) D-027 closed + wrangler test.
Small commits throughout; decision rows land as the work lands (see list
at the end). If context runs long, the clean boundary is: schema + studio
+ gallery/build-log migrated end to end + D-027 closed; remaining
collections carry to session 6.

Out of scope: staging deployment and deploy-hook rebuilds, real Turnstile
keys, domain verification/SPF/DKIM, Square catalog, the Etsy reviews pull,
the newsletter question, the homepage FAQ, the 1a polish pass.
```

---

## The approved spec (Ryan, 2026-08-09 — do not re-litigate)

**Tier: free.** Ryan explicitly considered Growth ($15/occupied seat/mo; for this shop
really a private-datasets purchase, $30/mo once Randy has a seat, over the ~$20 ceiling)
and chose free. Upgrade path stays open: flip submissions to a private dataset later by
env change; nothing in this design locks it out.

**One project, one public `production` dataset.** Studio v6 lives at `studio/` with its
own `package.json`, runs locally only (hosting comes with staging). Project id + dataset
in one shared const module (the `quote-limits.ts` pattern) imported by the Astro build
and the Pages Function; the studio config can hardcode them.

### PII / quote-submission storage (the D-027 mechanism)

Free tier = public datasets only. The approved equivalent of a private dataset:
**submissions are written as `drafts.<uuid>` documents** of type `quoteSubmission` via the
raw HTTP Mutations API (no npm dependency in the function — workerd-safe fetch). Verified
fact (Sanity docs, 2026-08-09): in a public dataset, any document whose `_id` contains a
period is unreadable without an API token; unauthenticated queries return published
documents only. Studio shows drafts in document lists, so submissions are visible to
Ryan/Randy. Hard requirements: remove Publish/Duplicate document actions for this type in
studio config (keep Delete — clearing spam is legitimate), make all its fields readOnly,
list newest-first. Photos are NOT stored — filename/size/count metadata only (email
carries the photos; the doc is the lead-loss backstop). Isolation contract from D-026/27
holds: `storeSubmission()` failure must never block or fail the email; callers catch.
Function env: `SANITY_API_TOKEN` in `.dev.vars` (Ryan pastes; write token, Editor role).

### Images

**Gallery/build-log photos and service-page photos move to Sanity** (owner-managed, the
Phase 2 acceptance test needs it). Verified fact (Astro docs, 2026-08-09): static builds
fetch remote images from authorized domains, run them through the local Sharp pipeline,
and emit hashed local files with full `widths`/`sizes` srcset — add `cdn.sanity.io` to
`image.domains` in astro.config; the 1a performance win survives. Remote `<Image>` needs
explicit width/height — pass them from Sanity asset metadata in the GROQ projection.
**Stays in repo assets:** parts wall (decorative, D-016), about-page photos, hero-less
homepage imagery, PageHero images on non-service pages (gallery/contact/reviews/shipping).

### Collections

1. **`galleryEntry`** ← `src/data/showcase.ts` (6) + the 4 extra in `gallery.astro` = 10
   docs. Fields: `title` (string, req), `kicker` + `sub` (strings, req, stored verbatim
   incl. caps), `photo` (image, req, with required `alt` field on it — D-014), `featured`
   (boolean, "Show on the homepage" — the current 6), `order` (number; drag-reorder
   plugin only if Randy struggles in Phase 2). §4.1's "longer story" field deliberately
   omitted — nothing renders it.
2. **`testimonial`** ← `Testimonial.astro` (1) + `reviews.astro` (2) = 3 docs. Fields:
   `quote` (text, stored WITHOUT surrounding “ ” — templates add them), `highlight`
   (optional string — exact phrase the quote band wraps in `<em>`; render by split),
   `attribution` (string, verbatim incl. `·`), `source` (optional dropdown
   Google/Etsy/Direct), `quoteBand` (boolean — the one doc the site-wide quote band
   shows; reviews page lists the non-quoteBand docs), `order`. Note: the quote-band text
   is a SHORTENED variant of review #1 — they are separate docs, not one.
3. **`siteStats`** ← `STATS` in `site.ts`. Singleton; array of `{value, label}`,
   validated exactly 4 (ProofBar grid is 4-up). The about page's look-alike stats array
   is page copy — stays in code.
4. **`businessInfo`** ← `BUSINESS` in `site.ts`. Singleton: `phone`, `email`,
   `areaServed` (string array), `areaServedState`. `phoneHref` derived in code from
   `phone` (strip non-digits, prefix `tel:1`). Kept in code: legalName, shortName,
   owner, address (JSON-LD only), `SOCIAL`, `SHOP_URL`, nav/footer, `BRAND_PATH`.
   Hours omitted (nothing renders them). Side fix while wiring: `contact.astro`'s meta
   title/description hardcode phone/email as literals — interpolate from this doc
   (same bytes out, drift risk gone).
5. **`servicePage`** ← the three service pages; 3 docs. Fields: `service` (slug:
   scanning/design/printing), `lead` (plain text hero paragraph), `heroImage` (+alt),
   `splits[]`: `{kicker, heading, image (+alt), body}` with `body` portable text
   (handles the `<strong>` runs; render at build via a portable-text-to-HTML step fed
   to the existing `Split` slot). Scanning has 2 splits, design 2, printing 1.
6. **`quoteSubmission`** (D-027, not §4): `name`, `email`, `phone`, `service`,
   `details`, `page`, `submittedAt` (datetime), `photos[]` `{filename, size}`. Created
   only by the function, as drafts (see PII section).

**Approved to stay in code** (log as one decision row): the `<h1>` headlines (hand-placed
`<br>`/`<em>` = typography, not copy — §4's "nothing can drift" principle beats §4.5's
letter), FeatureCards (icon-SVG-coupled), FAQs, SectionHeads, per-page QuoteSection
overrides, the printing materials table, SEO titles/descriptions, all homepage section
copy (Hero/ServicesRail/PartsDoor), about/contact/shipping prose, the `SERVICES` enum
(cross-boundary contract: QuoteSection `<select>` ↔ per-page `selectedService` exact
string match ↔ `functions/api/quote.ts`).

## Verified facts — do not re-research (all checked 2026-08-09)

- Sanity free tier: 2 **public** datasets, 20 seats, 500k API CDN req/mo, 10 GB
  bandwidth, 20 GB assets. Private datasets = Growth $15/occupied seat/mo (viewers free).
- Dot-in-`_id` privacy rule per Sanity's "keeping your data safe" docs + official Q&A
  (the studio-secrets plugin pattern relies on it).
- Astro remote-image build-time optimization per docs.astro.build/en/guides/images
  (authorized domains → fetched, Sharp-optimized, emitted to `dist/_astro` with hashes).
- Versions on 2026-08-09: `sanity` 6.9.1 (Studio v6; peers `react ^19.2.2`,
  `react-dom ^19.2.2`, `styled-components ^6.1.15`), `@sanity/vision` 6.9.1,
  `@sanity/client` 7.26.2. Studio v6 = Vite 8 build, `defineConfig`/`structureTool`
  API unchanged from the v4-era patterns; default search strategy is groq2024. Local
  Node is v24.15.0 — comfortably above the floor.

## Implementation notes (from session 4's full-content inventory — trust these)

- **`src/scripts/quote-form.ts` is a CLIENT script and imports `BUSINESS` from
  `~/data/site`.** If business facts move behind a build-time fetch that this module
  imports, Sanity client code ships to the browser. Fix: QuoteSection already renders
  the phone/email links in `.quote-alt` — have the script read them from the DOM (or
  data attributes) and drop the import. Check its exact usage first.
- Plan: `src/data/cms.ts` does the build-time fetches (`@sanity/client`, top-level
  await, `useCdn: false`, published perspective, no token). `BUSINESS`/`STATS` move
  there; the ~8 server-side consumers change one import line
  (Base/Nav/Footer/QuoteSection/ProofBar/contact/reviews × BUSINESS/STATS/SOCIAL mix —
  grep `~/data/site`). `site.ts` keeps the code-fixed constants. Build failure = loud
  failure (§3b stale-not-down: previous deploy keeps serving).
- **BuildLog copy travels as `data-kicker`/`data-title`/`data-sub` attributes** on the
  `<Image>` (read at runtime by `~/scripts/build-log`); keep `{img, alt, kicker, title,
  sub}` together per entry. Slides: `widths={[640,960,1280]}`,
  `sizes="(max-width: 1180px) 92vw, 1080px"`, first slide eager. Thumbs: fixed 164×120.
  `Split` images: `widths={[520,800,1200]}`. Match these exactly with CDN sources.
- `PartsDoor.astro` uses a relative `import.meta.glob('../assets/parts/…')` — the `~`
  alias does not work in glob paths. It stays repo-based; don't touch.
- `site.ts` has TWO Etsy URLs: `SOCIAL.etsy` (contact page) and `SOCIAL.etsyShop`
  (ProofBar, reviews). Both stay in code; don't consolidate silently.
- Seeding: `studio/scripts/seed.ts` via `npx sanity exec --with-user-token` (CLI login
  auth — no token needed). Build portable text blocks programmatically; copy strings
  verbatim from the pages (incl. `&nbsp;` entities where present). Image upload:
  `client.assets.upload` from `src/assets/work/*.jpg`; Sanity dedupes by content hash
  (the same photo serves gallery + service docs).
- Studio scaffold is hand-authored (no `sanity init` wizard): `studio/package.json`
  with the versions above, `sanity.config.ts`, `sanity.cli.ts`, `schemaTypes/`.
  Windows npx flag-swallowing: invoke from `studio/node_modules/.bin` when flags
  matter. Add `studio/node_modules`, `studio/dist`, `.sanity/` to .gitignore if the
  root patterns don't already cover them.
- Wrangler ops note from session 3 (still true): the Vite dev server does NOT run the
  function — test on `npx wrangler pages dev dist` (port 8788); kill it by the npx
  process TREE (`taskkill /F /T`), or orphaned `workerd` half-holds the port.

## Decision rows owed as the work lands

- Images: gallery/service photos → Sanity CDN w/ Astro build-time optimization; repo
  assets for decorative imagery (the deliberate call the session-4 prompt required).
- Free tier + drafts-as-private mechanism for submissions (incl. the Growth alternative
  Ryan declined and the upgrade path).
- Schema scoping: headlines/FAQs/cards stay in code; hours + story fields omitted.
- D-027 **closure** (edit its row: seam filled, date, mechanism) + plan §10 row.
- contact.astro meta interpolation fix (drift fix, same output).
- Testimonial quote-mark normalization (stored without “ ”, templates add them) — the
  one place stored copy differs from source by design.
