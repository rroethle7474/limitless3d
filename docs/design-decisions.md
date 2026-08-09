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

## RESUME HERE — next session

**Phase 1a session 1 is complete: the homepage builds, runs, and has been verified in a
browser.** `npm install` landed on Astro 5.18.2 / three 0.180 / sharp 0.34.5 / Tailwind 4.3.3.
`astro check` reports 0 errors, 0 warnings, 0 hints; `astro build` succeeds.

Verified working (2026-08-09, Chrome, ~2048×926 desktop viewport):

- Hero WebGL mounts, cycles scan → print → done → dissolve, `?done=1` and `?phase=` lock
  correctly, caption text updates per phase.
- All three service-card animations run (point cloud + sweep, self-drawing CAD, nozzle/layers).
- Build log cycles all six entries with pipeline-optimised images, thumbnails, and metadata.
- Parts door resolves all 12 wall images with the `rotateY(56deg)` transform applied.
- Quote form: all seven fields wired, file input reports attachments, submit reaches the
  success card, TODO warning fires in console. Honeypot hidden.
- Zero hotlinked images in the DOM; 24 images, none broken.

**Still unverified — do these first:**

1. **Mobile / responsive.** Never checked at any width. The browser window would not resize
   below a ~2048 CSS-px viewport in this session's tooling, so the 640px and 1024px
   breakpoints, the burger drawer, and the hero's mobile tier (object above the copy at
   `padding-top: 47svh`) have **not** been seen. This is the single biggest gap.
2. **Reduced motion.** The code paths exist and are ported verbatim, but were not exercised.
3. **`?nogl=1` fallback.** The static SVG lemniscate replacement was not visually confirmed.
4. **Side-by-side fidelity check** against the live prototype. Everything was checked against
   `docs/design-reference.md`, not eyeballed next to the real thing.
5. Generate `apple-touch-icon.png` at 180×180 from `public/favicon.svg` (D-017) — the `<link>`
   in `Base.astro` 404s until then.

Then: interior pages, per the plan's §0 slicing and the subagent fan-out ruling.

**Tooling note for whoever picks this up:** the Chrome automation kept backgrounding the tab
(`document.hidden === true`), which blanks screenshots and throttles rAF. Symptoms look
exactly like a rendering bug but are not. `navigate` re-focuses the tab; DOM assertions via
`javascript_tool` stayed reliable throughout and are the better verification tool here.

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

- **`apple-touch-icon.png` does not exist yet** (D-017).
- **`og-image.jpg` is the prototype's**, carried over as-is. Fine for now; worth regenerating
  if the design shifts.
- **Homepage FAQ** (D-006) is not built — it is net-new with no prototype reference, and the
  one place Claude Design is sanctioned (plan §0).

## Session notes

**2026-08-09 — npm install blocked by network.** The machine was on a mobile hotspot during a
storm. Throughput to `registry.npmjs.org` measured ~67 KB/s — the `astro` packument alone is
8.95 MB and took 133 s, and a full install would have run for hours while burning mobile data.
Two attempts were killed deliberately rather than let them run. Diagnosis is recorded here so
nobody re-investigates it: the registry was reachable and healthy, the connection was not.
All source was written and committed; the first command next session is `npm install`.
