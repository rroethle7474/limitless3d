# Limitless 3D Website Rebuild — Project Plan

**Status:** Phase 1 build starting — local-first in the `limitless` repo (VS Code + Claude Code); this document moves to the repo root as the living source of truth
**Last updated:** 2026-08-09
**Live site:** https://www.limitless3ddesign.com/ (Square Online)
**Design reference:** https://limitless3d-rebuild.vercel.app/ (no source access — rebuilding from the live prototype)

---

## 0. Build Orchestration & Session Strategy

**Bus-template review, first thing.** A `bus-template` directory (Ryan's established multi-agent workflow: git worktrees + file-based message bus, driven by structured project briefs) is available in the Claude Code session, and agent teams are enabled. The first session's first task is to review it against this project and recommend an orchestration approach before any scaffolding. Working prior to weigh against:

- **Homepage + design system: single agent, always.** The homepage establishes the component vocabulary (tokens, section rhythm, card/button/nav components) that every other page consumes. Parallel agents before that vocabulary exists produce divergent implementations that cost more to reconcile than the parallelism saves.
- **Interior pages: parallelism becomes legitimate *after* the design system lands.** The seven interior pages are near-independent consumers of shared components — a reasonable fan-out for worktrees or an agent team in a later session, if session count matters.
- **The bottleneck is review, not build.** Run-and-look verification is serial because there is one reviewer. Parallel build with serial review mostly moves the queue, it doesn't shrink it. Front-end work with a single dev server also fits one working tree better than several.
- Verdict expected: probably single-agent for Phase 1a, with the fan-out option noted for the interior-pages session. The review should confirm or overturn this with reasons, then stop for Ryan's confirmation.

**Session slicing.** Phase 1a is deliberately multi-session; the durable artifacts (`docs/design-reference.md`, `docs/design-decisions.md`, `CLAUDE.md`, this plan) exist so each session starts warm:

- Session 1: prototype investigation → scaffold → homepage. A full, honest session.
- Sessions 2+: interior pages in small batches (or the fan-out above), then gallery/build-log, then polish pass.
- Heavy page-fetching plus building pressures context; end sessions at clean boundaries rather than pushing one session to do everything.

**Claude Design usage policy.** Not during the rebuild of sections that exist in the prototype — the prototype *is* the approved design target, and a second design voice mid-rebuild risks drifting from the thing the owner already liked. Two sanctioned uses: (1) net-new sections with no prototype reference (the FAQ section in §6), and (2) targeted variant exploration after the owner's first review in Phase 2, aimed at whatever his feedback flags.



The purpose of this project is to modernize the Limitless 3D web presence using the design direction from the friend's Vercel prototype, while preserving the SEO equity the current site has built over many years and keeping the site fully maintainable by a non-technical owner (a business of one).

Hard constraints:

- Keep the domain `www.limitless3ddesign.com` and preserve search rankings.
- Payments, orders, shipping, and customer communication must retain Square-level security. Solution: they stay on Square entirely.
- The owner must be able to update content himself with no code, no git, and no manual deploys.
- The current live site stays untouched until cutover day.

## 2. Architecture Decision

**Hybrid: custom marketing site + existing Square Online store on a subdomain.**

- `www.limitless3ddesign.com` → new custom-built static site (home, services, gallery, about, reviews, quote form).
- `shop.limitless3ddesign.com` → the *existing* Square Online site, kept alive solely as the parts shop. Product catalog, inventory, checkout, shipping settings, and order management remain exactly where they are today in the Square dashboard.
- Old store URLs (`/s/shop/...`) get 301 redirects to the shop subdomain.

Why this architecture: rankings and conversion are won on the marketing pages, which is where design freedom and structured data matter. Commerce is where migration risk lives — so we don't migrate it. The owner's daily workflow (orders, shipping labels, customer messages) doesn't change at all.

Phase-two option, **now planned before cutover** (2026-08-09, §10): render product pages on the main site via Square's Catalog API with Square-hosted checkout links (Checkout API / Payment Links), so shoppers browse without leaving the site and only hop to Square for payment. Card data never touches the custom site; Square's PCI compliance covers the hosted checkout page. The subdomain link-out remains the interim state during the build; whether the subdomain store stays as a fallback after integration is an open question (§9.7).

## 3. Tech Stack

| Layer | Choice | Rationale |
|---|---|---|
| Framework | **Astro** (static output, Tailwind CSS) | Fully-rendered HTML on every URL for SEO; ships ~zero JS by default; content collections map cleanly to the CMS; React islands allowed for interactive pieces, so existing React knowledge transfers. Low framework churn = low long-term maintenance. |
| Hosting | **Cloudflare Pages** (free tier) | Free tier permits commercial use (Vercel Hobby does not); global CDN; `_redirects` file for 301s; deploy hooks for CMS-triggered rebuilds; Pages Functions for the form endpoint. |
| CMS | **Sanity** (free tier) | Google login for the owner (no GitHub friction); form-based editing scoped to exactly the collections we expose; Publish button fires a webhook → Cloudflare rebuild; Sanity image CDN auto-optimizes uploaded photos. |
| Quote form | **Pages Function + Resend + Cloudflare Turnstile** | Serverless endpoint emails submissions (with customer photo attachments) via Resend free tier; Turnstile blocks spam invisibly. |
| Commerce | **Existing Square Online site** at `shop.` subdomain | Zero migration of catalog/payments/fulfillment; identical security posture to today. |
| DNS | **Cloudflare** | Single pane for apex/www → Pages and `shop` → Square; enables Cloudflare Web Analytics (cookie-free, no consent banner needed). |
| Repo & workflow | **GitHub + Claude Code** | Ryan maintains; incremental commits; content lives in Sanity so the repo rarely needs touching after launch. |

**Incremental cost: $0/month** beyond the existing Square subscription. (Sanity, Cloudflare Pages, Resend, and Turnstile free tiers all comfortably cover a site of this size.)

**CMS alternative considered:** TinaCMS — git-backed, with inline visual editing directly on the page, and content stored as files in the repo (nice synergy with Claude Code). Sanity wins for this owner because Google login beats any GitHub-adjacent auth, its forms-based editing is harder to get lost in, and its image CDN handles photo optimization automatically. Tina is the named fallback: the Phase 2 acceptance test (owner adds a gallery entry himself in the Sanity editor) is the decision point. If he struggles there, we swap the CMS before cutover, not after.

**Platform alternative considered:** Framer / Webflow — a managed visual builder could host the site and give the owner canvas-style editing for ~$20–30/mo, and would be the answer if the sole goal were "simplest for the owner with zero Ryan involvement." Rejected because the design rebuild would be manual canvas work (no Claude Code leverage), design iteration locks behind that same manual work, structured-data and redirect control is weaker, and it swaps a maintainable codebase for vendor lock-in. Revisit only if the custom path fails the owner in practice.

**Budget stance:** free tiers here are not the budget compromise — for a static site they run on the same infrastructure as paid (same Cloudflare CDN, same Sanity API). Paid tiers at this scale buy volume, not reliability. Standing approval exists for modest recurring spend where it genuinely buys reliability or polish; current candidates: custom-domain email (~$7/mo Google Workspace, improves professionalism and form deliverability) and paid uptime monitoring (~$10/mo) if free-tier checks prove too slow. Target ceiling ~$20/mo total.

## 3b. Reliability Posture

Reliability is a hard requirement. The architecture delivers most of it by construction, and the rest is cheap process:

- **Static-first means failures degrade to stale, never down.** The live site is pre-built files on Cloudflare's CDN. If a Sanity publish, webhook, or build ever fails, the previous deploy keeps serving — the worst case is content that's a day old, not an outage. There is no server, database, or runtime for the marketing pages to crash.
- **The shop's uptime is Square's uptime** — identical to today, by design.
- **Lose-proof quote form.** The single worst silent failure would be a lost lead. The form endpoint dual-writes every submission: email to the owner via Resend *and* a stored record (Sanity document), so a delivery hiccup never loses a customer. Proper SPF/DKIM on the sending domain for deliverability.
- **Monitoring + alerting from day one.** External uptime checks on `www`, `shop.`, and the form endpoint (UptimeRobot / Better Stack free tier to start; upgrade if check frequency or SMS alerting proves worth it). A monthly "submit the quote form yourself" habit as the end-to-end canary.
- **Two-minute rollback.** DNS at Cloudflare means cutover is reversible instantly, and every Pages deploy is individually restorable.

## 4. Editable Surface (CMS Content Model)

Principle: scope ruthlessly. Only the things the owner will actually change are editable; layout, styling, and navigation are fixed in code so nothing can drift or break.

Proposed collections (confirm with him):

1. **Gallery / build log entries** — photo(s), title, one-line description, optional longer story. Each entry doubles as fresh content for SEO.
2. **Testimonials / reviews** — quote, attribution, source (Google/Etsy). Optionally seeded
   and refreshed automatically from the Etsy API (2026-08-09 investigation, §10): build-time
   `getReviewsByShop` pull with a 5★ filter for the featured pool, while the proof bar keeps
   the truthful aggregate; this collection stays the owner's curation/override either way.
3. **Homepage stats** — review count, orders shipped, rating (the numbers change; the layout doesn't).
4. **Business info** — hours, phone, email, service-area copy.
5. **Service page copy** — headline + body text per service (scanning / design / printing), photos.

Everything else is code-fixed.

## 5. SEO Preservation Plan

1. **Search Console first.** Verify ownership of the domain, export the current URL inventory and query data *before* any changes. This is the before/after baseline.
2. **URL inventory + 301 map.** Enumerate every live URL (Search Console + site nav + sitemap). Keep slugs identical where sensible; map everything else. Known so far: `/` (keep), `/customer-reviews` (map to `/reviews` or keep), `/s/shop...` (→ `shop.limitless3ddesign.com`). Complete the table before build.
3. **Redirects at the edge.** `_redirects` file on Cloudflare Pages, one line per mapping, 301s only.
4. **Metadata upgrade.** The current site's meta description is a keyword dump; the prototype's metadata (title targeting "3D Printing, Scanning and Design in Neenah, WI", proper descriptions) is the model. Per-page titles/descriptions written for local intent (Neenah, Fox Valley, Appleton, Oshkosh, NE Wisconsin).
5. **Structured data.** JSON-LD: `LocalBusiness` (name, address, phone, hours, service area, geo) sitewide; `Service` schema per service page; review/aggregate markup where legitimate. This is a concrete edge Square Online can't offer.
6. **Staging stays invisible.** The staging deployment (Cloudflare preview URL) must be `noindex` / access-protected until cutover so it never competes with the live site.
7. **Cutover hygiene.** New sitemap submitted in Search Console on launch day; monitor coverage and 404 reports for the following weeks.

## 6. Design: Rebuild + Improvements

Rebuild the prototype's look (structure, palette, typography, section order) from the live reference, with these improvements baked in:

- **Quote form with photo upload** — "snap a picture of the broken part." Likely the single highest-conversion feature for a repair business.
- **Self-hosted images** — the prototype hotlinks the old site's CDN (`cdn6.editmysite.com`); all imagery gets re-hosted (site assets in repo, owner-managed photos via Sanity CDN).
- **Build log as a growing collection** — CMS-driven project entries instead of a fixed gallery; each new entry is fresh indexed content and portfolio proof.
- **Google reviews alongside Etsy stats** — local search leans on Google Business Profile signals.
- **FAQ section** — materials, turnaround, ballpark pricing; targets long-tail local queries.
  *Deferred out of Phase 1a (2026-08-09, §10): the answers are owner facts and Randy's input
  isn't available yet. Revisit at Phase 2, where owner review happens anyway.*
- **Performance budget** — optimized images, minimal JS; aim for green Core Web Vitals on mobile.

## 7. Build Phases

**Phase 0 — Groundwork (before writing code)**
- Confirm where the domain is registered and who controls DNS. Determine whether nameservers can move to Cloudflare.
- Set up / verify Google Search Console; export URL inventory and top queries.
- Confirm Google Business Profile access and current review count.
- Confirm with owner: shop stays Square (vs. emphasizing Etsy); collection list in §4.

**Phase 1a — Static best-guess build (current)**
- Local-first in the `limitless` repo; a `CLAUDE.md` at the root captures session conventions and points at this plan.
- Scaffold Astro + Tailwind; recreate the prototype design from the live reference, page by page, content hardcoded (content collections come later with the CMS).
- Download and self-host all imagery from the start — no hotlinking the old CDN.
- Quote form built as UI only, photo-upload field included, submission stubbed with a clear TODO.
- Output: a fully navigable local demo of every page.

**Phase 1b — Wire-up (after design sign-off direction is clear)**
- Stand up Sanity with the §4 content model; migrate hardcoded content into it.
  *Done 2026-08-10 — studio + schema in repo (`studio/`), content migrated with proven
  build equivalence, photos on Sanity's CDN through the build-time Sharp pipeline, D-027's
  storage seam closed (submissions as private drafts). See §10 and design-decisions
  D-030–D-032.*
- Implement the quote form backend (Pages Function + Resend + Turnstile + dual-write per §3b).
  *Done 2026-08-09 except the dual-write's storage half, which is an explicit seam awaiting
  Sanity — see §10 and design-decisions D-026/D-027. Inbox delivery validated by Ryan same
  day (test submission with photo attachment received at the QUOTE_TO_EMAIL address).*
- Stand up the demo/staging deployment (noindex, access-protected). Ryan owns hosting setup; Cloudflare Pages remains the recommended target.
  *Done 2026-08-11 (D-033): `main.limitless3d.pages.dev`, noindex verified, quote pipeline
  validated from the public URL (email + stored draft, Ryan-confirmed). Direct-Upload
  architecture — deploys via wrangler; rebuild-on-publish and deploy-on-push arrive as a
  GitHub Action (open). Real Turnstile keys still open.*
- Square catalog integration (§2) is now pre-cutover scope (2026-08-09, §10): product pages rendered from the Catalog API with Square-hosted checkout links, using the prototype's shop design as reference (snapshot: `shop.html` + `parts-pdp-example.html`). Still gated on Ryan supplying Square OAuth/app credentials; sequenced after the CMS wire-up.

**Phase 2 — Review & iterate with owner**
- Walk him through the staging site *and* the Sanity editor; have him add a gallery entry himself as the acceptance test.
- Iterate on design/content feedback.

**Phase 3 — Cutover**
- Connect `shop.limitless3ddesign.com` in Square Online's domain settings; verify checkout end-to-end on the subdomain.
- Point apex/www DNS at Cloudflare Pages; deploy `_redirects` with the full 301 map; remove noindex.
- Submit new sitemap in Search Console; verify Google Business Profile website link, Etsy/social profile links.
- Keep the old Square site published *only* as the shop; its non-shop pages get redirected or hidden.

**Phase 4 — Post-launch**
- Monitor Search Console (coverage, 404s, query trends) weekly for a month.
- Handoff doc for the owner: how to add gallery entries, edit testimonials, where orders live (unchanged).
- Maintenance doc for Ryan: dependency update cadence (1–2×/year), where the deploy hook lives, how to restore.

## 8. Cutover Checklist (launch day)

- [ ] `shop.` subdomain connected in Square and checkout tested with a real card (then refunded)
- [ ] Catalog pages on the main site render live Square data; one product bought end-to-end through a hosted checkout link (then refunded)
- [ ] Full 301 map deployed and spot-checked (old URLs → new, `/s/shop` → shop subdomain)
- [ ] noindex removed from production deploy; robots.txt and sitemap.xml live
- [ ] Sitemap submitted in Search Console
- [ ] Quote form tested end-to-end (email received, photo attached, spam check passes)
- [ ] Google Business Profile website URL confirmed
- [ ] Analytics receiving data (Cloudflare Web Analytics)
- [ ] Old site's non-shop pages redirected/hidden
- [ ] Rollback plan confirmed: DNS revert restores the old site as-is

## 9. Open Questions

1. Where is the domain registered (Square/Weebly domains vs. third-party), and can we move DNS to Cloudflare without transferring the registration?
2. Does the brother have Google Search Console and Google Business Profile set up, and can Ryan get access?
3. Shop emphasis: keep pushing the Square parts shop, link out to Etsy (where the 500+ reviews live), or both?
4. Which email should quote-form submissions go to, and does he want an auto-reply to the customer?
5. Confirm the §4 editable-collection list with the owner before modeling it in Sanity.
6. Homepage FAQ content (§6): what materials does Randy want to lead with, what turnaround
   does he promise, and is he willing to state ballpark pricing publicly? Blocks the deferred
   FAQ section.
7. Square API credentials: when can Ryan create/supply the Square application credentials the
   catalog integration needs (now pre-cutover scope, §2)? And once catalog pages are live on
   the main site, does the subdomain Square store remain as a fallback or get retired?
8. Etsy reviews auto-pull (§10, 2026-08-09): does Randy want it, and will he register an Etsy
   developer app / API key from the shop account (plus supply the shop id)? Blocks the
   build-time reviews module; manual curation via the §4.2 collection is the fallback.
9. Newsletter signup: the original site's "Stay in the Loop" email-signup section was dropped
   by the prototype (its reCAPTCHA disclosure was the source of the now-removed footer
   Privacy link, D-025). Does Randy want it back? If yes: pick a provider, rebuild the
   section, and write a real privacy page the footer can link.

## 10. Decision Log

| Date | Decision |
|---|---|
| 2026-08-09 | Platform finding: current site is Square Online, not classic Weebly; Weebly is in maintenance mode (sunset in 67 countries; US still online). Rebuild targets a custom site, not classic Weebly. |
| 2026-08-09 | Architecture: hybrid — custom marketing site + existing Square Online store at `shop.` subdomain. Commerce does not migrate. |
| 2026-08-09 | No source access to the Vercel prototype; rebuild the design from the live reference with improvements. |
| 2026-08-09 | Stack: Astro + Tailwind, Cloudflare Pages, Sanity, Pages Function + Resend + Turnstile, GitHub + Claude Code. $0/mo incremental. |
| 2026-08-09 | Constraints relaxed: stack familiarity is not a requirement (fit and owner-simplicity win); modest recurring spend approved where it buys reliability/polish (~$20/mo ceiling). Stack unchanged after review; added reliability posture (§3b): dual-write quote form, uptime monitoring, static-degradation property. Framer/Webflow documented as rejected alternative. |
| 2026-08-09 | Build kickoff: local-first in `limitless` repo via VS Code + Claude Code. Sequencing: static site first (Phase 1a), CMS/form/hosting wire-up second (Phase 1b). Ryan owns hosting; end goal is an interactive demo with everything set up. Square OAuth/commerce integration deferred until credentials are provided. |
| 2026-08-09 | Hosting confirmed: Cloudflare Pages (earlier "I'll host" meant Ryan owns the setup, not self-hosting). Added §0: bus-template/agent-teams orchestration review is session 1's first task (prior: single-agent for homepage/design system, optional fan-out for interior pages); Phase 1a is explicitly multi-session (session 1 = investigate + scaffold + homepage); Claude Design reserved for net-new sections and post-review iteration, not the faithful rebuild. |
| 2026-08-09 | **Orchestration settled.** §0's prior confirmed: single-agent for Phase 1a. The bus-template's own escalation tests return "no" for this work — its staffing heuristic reads "sequential-with-human work → 1", and §7.5's mechanical test (does this touch a frozen-contract file, or need two owners in one file?) fails on both counts for a one-page, one-dev-server build. Refinement to the §0 prior: the interior-page fan-out should be **subagents in a single working tree**, not git worktrees + message bus — the pages are file-disjoint consumers of shared components, so file-level disjointness is sufficient isolation and the bus's merge-wave/CONTRACT-CHANGE machinery has nothing to arbitrate. Gated on the design system being frozen and written down. Full bus workflow revisited at Phase 1b, where Sanity schema ↔ Astro queries ↔ form payload is an actual contract. |
| 2026-08-09 | **Prototype is not black-box.** It is hand-written static HTML + one CSS file + two unminified JS files — no framework, no build step. The rebuild is therefore a *port* with exact token/timing/geometry values, not a reinterpretation from screenshots. Supersedes the "no source access" framing above in practice (still true in the git sense). Raw capture committed to `docs/prototype-snapshot/`; everything derived from it lives in `docs/design-reference.md` so no later session re-fetches. |
| 2026-08-09 | **Prototype is a design target, not an implementation spec** (Ryan). Recreate the look; choose the architecture. Performance-motivated deviations are welcome, over-optimizing that costs distinctiveness is not. Applied so far: Astro image pipeline instead of raw multi-MB JPEGs (one source photo is 1.3 MB, rendered at ~200 px); per-route CSS and per-section JS instead of one stylesheet + one bundle on every page; tree-shaken `three` behind a dynamic import instead of a self-hosted full `three.min.js`. Explicitly *not* done: replacing the WebGL hero with a lighter approximation — it is the most distinctive thing on the page; measure before revisiting. |
| 2026-08-09 | **Stack detail — styling is a hybrid** (decision D-010): prototype tokens wired into Tailwind v4 `@theme inline`, utilities for layout/spacing/type, hand-written scoped CSS for bespoke visuals. Refines the "Astro + Tailwind" row above; the 3D transforms, CSS counters and keyframes do not map to utilities, and the hybrid ships less CSS per route than the prototype does. |
| 2026-08-09 | Scaffold landed: Astro 5 static + Tailwind v4 + Sharp + `three`, TypeScript strict, no UI framework or islands. `CLAUDE.md` at root carries conventions, session slicing, and the orchestration ruling. Homepage written section-by-section. **Not yet verified in a browser** — `npm install` was blocked by ~67 KB/s throughput on a mobile hotspot and deferred to real bandwidth. |
| 2026-08-09 | **Homepage FAQ deferred out of Phase 1a** (Ryan). The §6 improvement stands, but its content — materials, turnaround, ballpark pricing — is owner facts, and Randy's input isn't available yet. Revisit at Phase 2 alongside owner review; the open question moves to §9.6. Phase 1a's remaining scope is the polish pass only. With the FAQ deferred, no Claude Design use remains in Phase 1a (its other sanctioned use is Phase 2 variant exploration). |
| 2026-08-09 | **Square catalog integration promoted to pre-cutover scope** (Ryan): shoppers should browse products without leaving the site, so §2's phase-two option — product pages from the Catalog API + Square-hosted checkout links — happens before go-live rather than after. iframe embedding ruled out (checkout frame-blocking, partitioned cookies). Commerce/inventory/payments still never migrate (D-002's core holds); only the catalog UI moves in-house. Interim state during the build stays the `SHOP_URL` link-out. Prototype `/shop` + one `/parts/*` PDP captured into the snapshot as the design reference (D-024) while the Vercel deployment is still up. Gated on §9.7 (credentials; subdomain-fallback question). |
| 2026-08-09 | **Phase 1b entry point agreed** (Ryan): the quote-form backend goes first — Pages Function + Resend + Turnstile, tested end to end with Ryan's email as recipient so he can validate delivery himself (Resend's pre-domain-verification mode only delivers to the account owner, which makes his inbox the natural test harness). Recipient is an env var; production address is §9.4. Sanity dual-write is designed as a seam in that session and closed when Sanity lands. Kickoff prompt: `docs/next-session-prompt.md`. The 1a polish pass remains owed as a separate session. |
| 2026-08-09 | **Etsy reviews auto-pull investigated** (Ryan asked; findings for Randy). Prototype hardcodes all three review quotes — nothing is pulled from Etsy. Square Online has no native Etsy-review integration; third-party embed widgets (SociableKit/Common Ninja/Elfsight) rejected — external JS/iframes against the performance budget and self-host rules. The viable path is Etsy Open API v3 `getReviewsByShop` (API-key auth; returns rating + text, no reviewer display name — matching the design's "Verified customer · project" attribution style) fetched **at build time** with scheduled rebuilds: zero client JS, reviews indexed for SEO, §3b stale-not-down failure mode. Recommended shape: hybrid — auto-refresh the proof-bar aggregate (the numbers are what rot) + a 5★-filtered featured pool with §4.2 owner curation as override. 5★-only framing note: keep the truthful 4.8/500+ aggregate displayed beside curated quotes (FTC 2024 review rule targets suppressed subsets presented as *the* reviews; aggregate-plus-highlights is the clean pattern). Not yet committed scope — gated on Randy's go and an Etsy developer key (§9.8); would land in Phase 1b with the other wire-up. |
| 2026-08-11 | **Staging live (Phase 1b session 6).** `main.limitless3d.pages.dev` — Sanity-built site, `x-robots-tag: noindex` verified (§5.6), quote pipeline validated from the public URL with Ryan confirming both the email and the studio draft. **Platform reality change**: Cloudflare's dashboard no longer creates Git-connected Pages projects (all paths funnel to Workers); staging is a wrangler Direct-Upload Pages project instead (D-033) — production branch set to a nonexistent branch so every deploy is a noindexed preview. GitHub repo (`rroethle7474/limitless3d`, private) is the source of truth; deploy-on-push and Sanity rebuild-on-publish land together later as a GitHub Action (build + `wrangler pages deploy`), replacing the originally planned deploy hook. Still open at staging: real Turnstile keys, studio hosting, access protection (deferred — noindex + unlisted URL deemed sufficient for the demo audience). |
| 2026-08-10 | **Sanity live (Phase 1b sessions 4–5); §3b dual-write complete.** Free tier (Growth declined: $15/occupied seat = $30/mo with Randy, over the ~$20 ceiling; private datasets were its only material feature for this site). One public `production` dataset, project `1hhfxbth`; studio v6 in-repo at `studio/`, local until staging. §4's five collections + a `quoteSubmission` type, ruthlessly scoped (headlines/FAQs/cards/nav/enum stay code-fixed; hours + story fields omitted as render-less). Content migrated with **proven equivalence** — dist/ HTML diffed against the hardcoded build across all nine pages. Owner photos moved to Sanity's CDN with Astro fetching at build through Sharp (perf baseline preserved; `image.domains`). Submissions dual-write as `drafts.`-prefixed docs — token-gated in the public dataset (the dot-in-`_id` rule), Publish stripped in studio; storage failures never touch the email path (isolation contract survived two real token failures during validation). Webhook rebuild-on-publish deferred to the staging session. One ops incident: the project was deleted-and-recreated at manage mid-session — tokens/content are project-scoped, recovery (repoint two ids, re-seed, new token) took ~10 min because schema/seed/photos all live in the repo. |
| 2026-08-09 | **Quote backend live (Phase 1b session 3).** `POST /api/quote` Pages Function + Turnstile + Resend implemented and verified locally (curl matrix + in-browser submit against `wrangler pages dev`); the only unverified link is inbox delivery, which is Ryan's validation with his real Resend key. §3b's dual-write ships **email-first with the storage half as an explicit seam** — a `storeSubmission()` stub with a logged TODO, failure isolated so it can never block the email — closed when Sanity lands later in 1b. Attachment budget 5 photos / 8 MB each / 25 MB total, sized against Resend's 40 MB post-base64 cap, enforced on both sides from one shared module. Cloudflare's official test Turnstile keys are the defaults; real keys are an env swap at staging (`PUBLIC_TURNSTILE_SITE_KEY` build-time, `TURNSTILE_SECRET_KEY` + `RESEND_API_KEY` + `QUOTE_TO_EMAIL` in Pages env / `.dev.vars`). Contract and judgment calls: design-decisions D-026–D-029. |
