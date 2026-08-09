# Design & build decisions

Running log of judgment calls made during the build. Append; don't rewrite history.

Ambiguous design details get a best guess and a row here rather than blocking. Decisions that
refine or contradict the plan also get a row in `limitless3d-rebuild-plan.md` §10.

`D-001`–`D-009` are the deliberate deltas from the prototype, defined in
`docs/design-reference.md` §10. Everything from `D-010` is a build-time call.

| # | Date | Decision | Reasoning |
|---|---|---|---|
| D-010 | 2026-08-09 | **Hybrid styling**: prototype tokens → Tailwind `@theme inline`; utilities for layout/spacing/type; hand-written scoped CSS for bespoke visuals (hero, parts door, spotlight, service viz, FAQ marker, CSS counters). | The plan specifies Tailwind, but the prototype is 29KB of hand-tuned CSS with 3D transforms, keyframes and counters that don't map to utilities. Translating them would risk drift for no gain. The hybrid also ships *less* CSS than the prototype, which serves its whole stylesheet (including unused shop/PDP rules) on every page. |
| D-011 | 2026-08-09 | "Parts Shop" links point at `https://shop.limitless3ddesign.com` (a single `SHOP_URL` constant), opening in a new tab. | Plan §2 puts the Square store on that subdomain. It isn't connected until Phase 3 cutover, so **the link is dead in the local demo** — expected, and one line to change. Deliberately not pointed at the current `/s/shop` URL, which gets 301'd to the subdomain anyway. |
| D-012 | 2026-08-09 | Build-log spotlight renders all six images stacked and crossfades by class, instead of the prototype's two-`<img>` double buffer with JS-assigned `src`. | Lets every image go through Astro's pipeline with a responsive srcset, removes the first-change decode flash, and means no image URL is ever built in JS. Same network cost — the prototype preloaded all six anyway. |
| D-013 | 2026-08-09 | Photo-upload field (D-001) sits **after** the free-text details field, is explicitly optional, accepts multiple images, and sets `capture="environment"`. | The plan's framing is "snap a picture of the broken part" — `capture` opens the rear camera directly on mobile, which is where that happens. Placed last so it never blocks a visitor who just wants to send a sentence. Styled with `::file-selector-button` to match the mono/pill vocabulary; no prototype reference exists for this control. |
| D-014 | 2026-08-09 | Real `alt` text written for all build-log photos. | The prototype left them empty. Decorative parts-wall images correctly keep `alt=""` + `aria-hidden`, but the spotlight photos are content. |
| D-015 | 2026-08-09 | Per-section JS modules imported by their owning component, rather than the prototype's single `site.js`. | A page ships only the JS it uses. The interior pages have no spotlight, no service visuals, and no hero, so they should carry none of that code. |
| D-016 | 2026-08-09 | Parts-wall images renamed `part-01`…`part-12` in wall order, with the original CDN ids preserved in `src/assets/parts/SOURCES.md`. | They are decorative (`aria-hidden`, `alt=""`) and carry no semantic content, so positional names are honest. The mapping is kept so they can be re-identified if they ever become real shop content. |
| D-017 | 2026-08-09 | `favicon.svg` regenerated from the brand path rather than copying the prototype's PNGs. | Scales cleanly, one file, no binary in the repo. **Open:** `apple-touch-icon.png` is referenced in `Base.astro` but not yet generated — needs Sharp, which needs a completed `npm install`. |

## Open items

- **`apple-touch-icon.png` does not exist yet** (see D-017). The `<link>` in `Base.astro` will
  404 until it's generated. Generate at 180×180 from `public/favicon.svg`.
- **Nothing in this session has been rendered in a browser.** `npm install` could not complete
  (see the session note below), so every section is written but unverified. First task next
  session: install, run `npm run dev`, and review section by section.
- **`og-image.jpg` is the prototype's**, carried over as-is. Fine for now; worth regenerating
  if the design shifts.

## Session notes

**2026-08-09 — npm install blocked by network.** The machine was on a mobile hotspot during a
storm. Throughput to `registry.npmjs.org` measured ~67 KB/s (the `astro` packument alone is
8.95 MB and took 133 s). Two install attempts were abandoned rather than burn mobile data;
Ryan will install on real bandwidth. All source is written and ready — the first command next
session is `npm install`.
