# Design & build decisions

Running log of judgment calls made during the build. Append; don't rewrite history.

Ambiguous design details get a best guess and a row here rather than blocking. Decisions that
refine or contradict the plan also get a row in `limitless3d-rebuild-plan.md` §10.

`D-001`–`D-009` are the deliberate deltas from the prototype, defined in
`docs/design-reference.md` §10. Everything from `D-010` is a build-time call.

| # | Date | Decision | Reasoning |
|---|---|---|---|
| D-010 | 2026-08-09 | **Hybrid styling**: prototype tokens → Tailwind `@theme inline`; utilities for layout/spacing/type; hand-written scoped CSS for bespoke visuals (hero, parts door, spotlight, service viz, FAQ marker, CSS counters). | The plan specifies Tailwind, but the prototype is 29KB of hand-tuned CSS with 3D transforms, keyframes and counters that don't map to utilities. Translating them would risk drift for no gain. **Correction (measured after first build):** I claimed this would ship less CSS than the prototype. On the homepage it does not — 40.6 KB raw / 8.1 KB gzipped vs the prototype's ~34 KB unminified, the difference being Tailwind's preflight and theme-variable emission. The claim only comes true across the *site*: the prototype serves all 29 KB (shop, PDP, hero, spotlight rules included) on every page, whereas our interior pages will carry only the components they use. Verify that on the first interior page rather than assuming it. |
| D-011 | 2026-08-09 | "Parts Shop" links point at `https://shop.limitless3ddesign.com` (a single `SHOP_URL` constant), opening in a new tab. | Plan §2 puts the Square store on that subdomain. It isn't connected until Phase 3 cutover, so **the link is dead in the local demo** — expected, and one line to change. Deliberately not pointed at the current `/s/shop` URL, which gets 301'd to the subdomain anyway. |
| D-012 | 2026-08-09 | Build-log spotlight renders all six images stacked and crossfades by class, instead of the prototype's two-`<img>` double buffer with JS-assigned `src`. | Lets every image go through Astro's pipeline with a responsive srcset, removes the first-change decode flash, and means no image URL is ever built in JS. Same network cost — the prototype preloaded all six anyway. |
| D-013 | 2026-08-09 | Photo-upload field (D-001) sits **after** the free-text details field, is explicitly optional, accepts multiple images, and sets `capture="environment"`. | The plan's framing is "snap a picture of the broken part" — `capture` opens the rear camera directly on mobile, which is where that happens. Placed last so it never blocks a visitor who just wants to send a sentence. Styled with `::file-selector-button` to match the mono/pill vocabulary; no prototype reference exists for this control. |
| D-014 | 2026-08-09 | Real `alt` text written for all build-log photos. | The prototype left them empty. Decorative parts-wall images correctly keep `alt=""` + `aria-hidden`, but the spotlight photos are content. |
| D-015 | 2026-08-09 | Per-section JS modules imported by their owning component, rather than the prototype's single `site.js`. | A page ships only the JS it uses. The interior pages have no spotlight, no service visuals, and no hero, so they should carry none of that code. |
| D-016 | 2026-08-09 | Parts-wall images renamed `part-01`…`part-12` in wall order, with the original CDN ids preserved in `src/assets/parts/SOURCES.md`. | They are decorative (`aria-hidden`, `alt=""`) and carry no semantic content, so positional names are honest. The mapping is kept so they can be re-identified if they ever become real shop content. |
| D-017 | 2026-08-09 | `favicon.svg` regenerated from the brand path rather than copying the prototype's PNGs. | Scales cleanly, one file, no binary in the repo. **Open:** `apple-touch-icon.png` is referenced in `Base.astro` but not yet generated — needs Sharp, which needs a completed `npm install`. |
| D-018 | 2026-08-09 | `<noscript>` override forces `.reveal` elements to full opacity. | Reveals start at `opacity: 0` and are switched on by an IntersectionObserver. If the script never runs, that content stays invisible permanently — the prototype has the same hole. Found while reviewing: 7 of 10 reveals sat un-revealed whenever the observer hadn't fired. Failures should degrade to "no animation", never to "no content" (plan §3b). |
| D-019 | 2026-08-09 | Hero copy is **vertically centred** (`.hero { display:flex; align-items:center }`, `padding: 104px 24px 64px`) instead of the prototype's `padding: 22vh 24px 64px`. | Ryan flagged dead space under the hero, and noted the prototype does it too. With a fixed `22vh` top offset inside a `100svh` hero, the copy is only ~300px tall, so every extra pixel of viewport height piles up *below* it. Centring distributes the slack and holds at any height. Under the stacked breakpoint the hero reverts to `align-items: flex-start` so the `47svh` top padding still parks the copy below the object. |
| D-020 | 2026-08-09 | Hero object placement is made **viewport-safe**: a fourth `narrow` tier, an aspect-aware stacking rule (`max-width: 900px, max-aspect-ratio: 6/5`), and a `fit()` that shrinks then clamps so the object can never leave the frame. | Ryan hit the object clipped on a narrow iPad Pro. The cause is aspect, not width: the prototype's tier x-offsets assume landscape, so on a portrait-ish viewport the visible world-width shrinks while the offset doesn't. Measured, the prototype's own values clip at 1280×800, 1440×900 and iPad landscape too — this was broken well beyond the case that was reported. Verified across 13 viewports from iPhone 15 to 2560×1440: all fit, and the scale-down never has to fire (it is a guarantee, not a routine path). Constants are duplicated in `hero.ts` (`STACK_MAX`/`STACK_ASPECT`) and the Hero.astro media query — **keep them in sync**. |
| D-021 | 2026-08-09 | **Interior vocabulary is building-block components, not section-owners**: `Section` (rhythm / tint / narrow wrapper) plus `PageHero`, `SectionHead`, `Stats`, `Split`, `FeatureCards`, `Faq`, composed freely per page. `.prose` typography promoted to `global.css`; `PageHero.heading` is a raw-HTML prop; `QuoteSection` gains a `selectedService` prop. | Interior sections mix patterns inside one band (`/about` puts stats + sec-head + fcards in a single tint section), so the homepage's one-component-per-section shape doesn't compose. Astro scoped styles can't reach slotted content, which forces `.prose` (Split's slotted paragraphs, the shipping page's standalone prose) into the global layer — where `.sec-head` already lives. Every snapshot h1 carries `<br>` + one `<em>`, so a verbatim-HTML prop beats a slot for eight pages built from snapshot copy. |
| D-022 | 2026-08-09 | D-010's cross-site CSS claim, measured on the first interior page: `/3d-scanning` ships 34.1 KB raw / 7.4 KB gz of CSS (28.6 KB shared bundle + 5.6 KB interior components); the homepage's 13.0 KB of bespoke CSS (hero, rail, door, build log) does not load there. JS on the page: two small inline modules (nav/reveal + quote form) — no `three`, no viz, no build-log code. | The prototype serves all 29 KB of CSS plus `site.js` and `hero.js` groundwork on every page. This is the verification D-010 said to make on the first interior page rather than assume. **Post-fan-out note:** with nine pages built, Vite re-chunked — one shared bundle (28.6 KB raw / 6.0 KB gz, linked everywhere; includes door/spotlight/testimonial/proof since those now serve 2+ pages each) + homepage-only CSS (5.7 KB file + inlined) + page-local styles inlined per page. Still under the prototype's every-page cost; the per-route property holds. |
| D-023 | 2026-08-09 | **Interior fan-out executed as planned** (plan §10 orchestration row): seven pages by seven Opus subagents in one working tree, three batches, orchestrator (Fable) reviewing, verifying in-browser, and committing serially. Page-local patterns landed as scoped CSS inside their page file, not components: SpecTable (`/3d-printing`), ReviewCards + Leave-a-review (`/reviews`), contact grid (`/contact`). Orchestrator-made shared edits: BuildLog `entries`/`kicker`/`heading`/`sub` props (gallery's ten-entry spotlight), PageHero CTA `external` flag (shipping's SHOP_URL link, D-011). Accepted one subagent upgrade: `role="img"` on the reviews star rows so their `aria-label`s announce. | The guardrail ("existing components and tokens only; stop and report") held — no subagent touched a shared file or invented an unauthorized pattern. Single-page patterns as page-local scoped CSS keeps them inlined into only that page's HTML and preserves the "promote when a second consumer appears" option. |
| D-024 | 2026-08-09 | **Square catalog integration promoted to pre-cutover scope** (Ryan), and the prototype's shop design captured for it: `docs/prototype-snapshot/shop.html` (filter bar + product grid, cards linking to `/parts/<slug>`) and `parts-pdp-example.html` (one exemplar PDP: sticky gallery, price, stock, buy, trust rows). Both hotlink Square CDN product images — reference only, never shipped. The build's interim state is unchanged: every Parts Shop link stays the `SHOP_URL` link-out (D-011). | Ryan wants shoppers kept on the site pre-launch. iframe embedding ruled out (checkout sends frame-blocking headers; iframe cookie partitioning breaks carts). D-002's core survives — catalog UI moves in-house, commerce/inventory/payments never do. Captured now because the Vercel prototype won't necessarily outlive the phase that needs it; the shop page was the one page the original snapshot deliberately skipped. |
| D-025 | 2026-08-09 | **Footer "Privacy" link removed** (Ryan). Every prototype page links `/privacy`, but no such page exists anywhere. Verified origin: the original Square site's "Stay in the Loop" newsletter section carries a reCAPTCHA disclosure referencing Google's privacy policy/terms; the prototype dropped that section (no newsletter, no reCAPTCHA, no Google-policy text anywhere in the snapshot) but left the vestigial footer link on all eleven pages. | Shipping a dead link helps nobody. Whether the newsletter signup (and therefore a real privacy page) returns is on Ryan's validation list with Randy — plan §9.9. If it comes back, so does the link, pointing at a real page. |
| D-026 | 2026-08-09 | **Quote backend contract** (`functions/api/quote.ts`, kills D-005's stub): multipart `POST /api/quote` → JSON `{ ok, error?, message? }`. `400 validation` (the `message` is user-showable and the client displays it verbatim), `403 turnstile`, `502 email` (Resend failed), `500 config` (env missing — fail closed, never silently skip the spam check). The honeypot returns a **fake 200**. Attachment budget lives in one module imported by both sides (`src/data/quote-limits.ts`, relative-imported by the function): 5 photos, 8 MB per file, 25 MB total. | Fail-loud per §3b: every path that prevents the email is a non-2xx, so the client can show the phone/email fallback — the honeypot's fake success is the one deliberate lie, so bots learn nothing. Budget math: Resend caps an email at 40 MB *after* base64 (×4⁄3); 25 MB raw ≈ 33 MB encoded plus headroom. The client validates the same limits pre-flight so five phone photos get a clear message, not an opaque API failure. |
| D-027 | 2026-08-09 | **§3b dual-write ships email-first; the storage half is an explicit seam.** `storeSubmission()` in the function is a stub with a logged TODO; callers `catch`, so a storage failure can never block or fail the email path. Closed when Sanity lands (later in Phase 1b). Plan §10 row logged. | Sanity doesn't exist yet — no project, no schema — and a throwaway store would be waste. The seam pins the isolation contract (email never depends on storage) now, so wiring Sanity in later is filling a hole, not redesigning the function. Until then the email is the only record of a lead. |
| D-028 | 2026-08-09 | **`--err` token pair added** to the global token block (light `#B42318`, dark `#F97066`, mapped as `--color-err`) — the first net-new tokens since the prototype port. Used by the form's failure card (`:global(.form-err)`: red border, bold lead, phone/email links, `role="alert"`, form kept intact for retry) and the photo-limit messages on `.file-note`. | The prototype has no failure states anywhere, so no error color exists to port — and purple-as-error would be ambiguous. Values contrast-checked against `--panel` in both themes. Hex lives in the token block per D-010's rule. |
| D-029 | 2026-08-09 | **Turnstile presentation**: the third-party script lazy-loads on section approach (IntersectionObserver, 600px margin) or first form focus, whichever fires first; explicit render into a slot **after** the submit button, hidden while `:empty`; theme read from `data-theme` at render time; widget reset on submit failure. Cloudflare's official test keys are the defaults — real keys are an env swap (`PUBLIC_TURNSTILE_SITE_KEY` at build, `TURNSTILE_SECRET_KEY` in Pages env). | The quote section is on all nine pages; visitors who never scroll near it shouldn't pay for Cloudflare's script. Below the button, the widget's late arrival never shoves the button mid-click, and `:empty{display:none}` keeps the form grid's gap from doubling before it exists. `theme:'auto'` would follow the OS while the site pins its own theme on `<html>` (D-004). Reset because tokens are single-use — a retry needs a fresh one. |

## RESUME HERE — next session

**Phase 1a sessions 1–2 are complete: the homepage and all eight interior pages build, run,
and have been verified in a browser.** Session 2 (2026-08-09): stage 1 built `/3d-scanning` by
hand and froze the interior vocabulary (D-021); stage 2 fanned the other seven pages out to
Opus subagents (D-023). One commit per page; `astro check` clean (35 files, 0/0/0);
`astro build` produces all 9 pages; zero hotlinks in `dist/`; every internal link resolves
except `/privacy` (see open items).

Verified in session 2 (Chrome, desktop viewport, per page):

- All eight interior pages: structure against the snapshots, image integrity (0 broken,
  0 external `src`), quote-section copy + per-page `selectedService`, FAQ toggling.
- Gallery spotlight: 10 slides/thumbs, thumb-click navigation, count + metadata swap, real
  alt text (D-014).
- Printing: spec table, PartsDoor reuse; shipping: SHOP_URL CTA in a new tab (D-011);
  contact: FAQ-after-quote order; reviews: ProofBar reuse, external review CTAs.
- Mobile (390 px): **`/3d-scanning` only**, via an in-page iframe (window resize still refuses
  to go below ~2048 CSS px — same tooling limit as session 1; `resize_window` reports success
  but `innerWidth` doesn't change). Phero stacks art-first, stats 2-up, cards 1-up, burger
  shows, form single-column.

**Still unverified — carry-overs and new:**

1. **Mobile for the other seven interior pages and the homepage.** Only scanning has been seen
   narrow, and only in an iframe. The burger drawer has still never been *operated* at mobile
   width.
2. **Reduced motion.** Still unexercised anywhere.
3. **`?nogl=1` hero fallback.** Still not visually confirmed.
4. **Side-by-side fidelity check** against the live prototype — all checking so far is against
   the snapshot/reference, not eyeballed next to the real thing. Now spans nine pages.
5. **Interior pages in a *focused* (not automation-backgrounded) tab** — reveals and spotlight
   autoplay were force-verified via DOM class toggles; a human scroll-through is still the real
   test.

**Phase 1b session 3 (2026-08-09): the quote backend is live** — D-005's stub is dead.
`functions/api/quote.ts` (contract D-026), Turnstile with test keys (D-029), Resend with
attachments, storage seam deferred to Sanity (D-027), `--err` failure vocabulary (D-028).
Verified locally against `npx wrangler pages dev dist`: curl matrix (fake-200 honeypot,
400s with user-showable messages, 403 no-token, photo-count limit) plus an in-browser
run-and-look — Turnstile lazy-load + widget render, client photo validation (count /
per-file / total, message clears), and a real submit showing the honest failure card with
the placeholder Resend key (Resend 401 → our 502 → red card, phone/email links, form
intact). **What remains to call it done: Ryan pastes his real Resend key into `.dev.vars`
(placeholder on the `RESEND_API_KEY` line), restarts wrangler, submits the form with
photos, and finds the email in rroethle@gmail.com.** The Vite dev server does not run the
function — test on the wrangler port.

**Next up in Phase 1b** (plan §7): Sanity (content model §4, closes the D-027 seam), then
staging deployment (real Turnstile keys, noindex), then Square catalog (gated on §9.7
credentials). The 1a polish pass (items 1–5 above) is still owed and runs as its own later
session. (The homepage FAQ was deferred to Phase 2 — its content needs Randy's input; see
the plan's §9.6 and §10.)

**Tooling note (still true in session 2):** the Chrome automation keeps backgrounding the tab
(`document.hidden === true`), which stales screenshots and throttles rAF/IntersectionObserver —
symptoms look like rendering bugs but are not. `navigate` re-focuses; DOM assertions via
`javascript_tool` stay reliable; `scrollIntoView` needs `behavior:'instant'` because the global
smooth-scroll rides the throttled rAF. Subagents writing into `src/pages/` while the dev server
watches can flash a Vite unhandled-rejection overlay (temp-file stat race) — reload recovers.

## Performance baseline — homepage, first production build (2026-08-09)

Measured from `dist/`, not estimated. Record the same numbers on future builds so regressions
are visible.

| Asset | Raw | Gzipped | Notes |
|---|---|---|---|
| `index.html` | 39.0 KB | 9.8 KB | includes 4 inlined section scripts (nav/reveal, service viz, build log, quote form) — Astro inlines small modules rather than emitting separate files |
| CSS (one bundle) | 40.6 KB | 8.1 KB | `@font-face` 3.8 KB · theme vars 1.8 KB · components + preflight 35.1 KB |
| `hero.js` | 474.9 KB | **119.2 KB** | tree-shaken `three` + the scene; lazy, off the critical path |
| Images | 3.7 MB | — | 54 WebP variants across 23 sources |
| **`dist/` total** | 4.6 MB | — | |

Two things worth knowing:

- **`hero.js` dominates the JS budget** at 119 KB gzipped. It loads only after idle *and*
  intersection, and a `<canvas>` is not an LCP candidate, so it should not move Core Web
  Vitals — but it is by far the largest thing on the page. If mobile field data ever looks
  bad, this is the first place to look, and the tradeoff (see the 2026-08-09 plan decision on
  fidelity vs. optimization) should be Ryan's call, not a silent swap.
- **The image pipeline is doing the heavy lifting.** The parts wall alone: `part-09` went
  1288 KB → 6 KB at its rendered size. Twelve source photos totalling ~6.5 MB now ship as a
  couple of hundred KB. This is the single biggest win over the prototype, which hotlinked
  them full-size.

## Open items

- ~~`/privacy` is a dead link in every page's footer~~ Removed 2026-08-09 (D-025) — it was a
  vestige of the original site's newsletter section, which the prototype dropped. Newsletter
  + privacy-page question is with Randy (plan §9.9).
- ~~`apple-touch-icon.png` does not exist yet~~ Generated 2026-08-09, 180×180 from `favicon.svg` via Sharp (closes D-017's open note).
- **`og-image.jpg` is the prototype's**, carried over as-is. Fine for now; worth regenerating
  if the design shifts.
- **Homepage FAQ** (D-006) — **deferred to Phase 2** (2026-08-09): the content (materials,
  turnaround, ballpark pricing) is owner facts and Randy's input isn't available yet. Still the
  one sanctioned Claude Design build when it returns; the content question is plan §9.6.

## Session notes

**2026-08-09 — npm install blocked by network.** The machine was on a mobile hotspot during a
storm. Throughput to `registry.npmjs.org` measured ~67 KB/s — the `astro` packument alone is
8.95 MB and took 133 s, and a full install would have run for hours while burning mobile data.
Two attempts were killed deliberately rather than let them run. Diagnosis is recorded here so
nobody re-investigates it: the registry was reachable and healthy, the connection was not.
All source was written and committed; the first command next session is `npm install`.
