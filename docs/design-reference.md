# Design Reference — Limitless 3D rebuild

**Purpose:** the durable, derived-once record of the prototype's design. Later sessions read
this instead of re-fetching the prototype. If something here is wrong, fix it here in the same
commit as the code fix.

**Source:** https://limitless3d-rebuild.vercel.app/ — captured 2026-08-09.
**Raw snapshot:** `docs/prototype-snapshot/` (all 9 page HTMLs + `site.css`, `fonts.css`,
`site.js`, `hero.js`). Reference material only, never shipped. Read it there rather than
re-fetching the live prototype.

**Key finding:** the prototype is **hand-written static HTML + one CSS file + two plain JS
files**. No framework, no build step. Every design value below is an exact quotation from
`site.css`, not an estimate from a screenshot. The rebuild is a port, not a reinterpretation.

---

## 1. Design tokens (verbatim from `site.css` `:root`)

### Colour — light theme (the shipped default)

| Token | Value | Role |
|---|---|---|
| `--accent` | `#5E17EB` | Brand purple. Buttons, focus rings, active states, logo stroke |
| `--accent-deep` | `#4A12BC` | Gradient end on primary button |
| `--accent-glow` | `#B49AFF` | Scan-sweep line, corner brackets |
| `--bg` | `#F6F4EE` | Page background — warm off-white, **not** pure white |
| `--panel` | `#FFFFFF` | Cards, nav, forms |
| `--panel-2` | `#EFECE3` | Tinted section bands, footer, table headers |
| `--line` | `#DCD6C9` | Every border, every divider |
| `--text` | `#191A20` | Body text |
| `--muted` | `#565D6D` | Paragraph text, secondary nav |
| `--faint` | `#8A8F9C` | Mono labels, captions |
| `--em-a` | `#5E17EB` | Emphasis (light) — same as accent |
| `--em-b` | `#3D0FA8` | Gradient partner for the h1 text-gradient |
| `--ink` | `#0B0D11` | Build-log stage background |
| `--card-shadow` | `0 10px 30px rgba(25,26,32,.08)` | |
| `--nav-bg` | `rgba(246,244,238,.86)` | Behind `backdrop-filter: blur(14px)` |
| `--glow-a` / `--glow-b` | `rgba(94,23,235,.09)` / `rgba(94,23,235,.05)` | Hero radial glows |
| `--door-bg` / `--door-fog` | `#ECE8DD` / `rgba(246,244,238,.94)` | Parts-shop section |

The warm cream `#F6F4EE` against the cold purple `#5E17EB` is the whole palette identity.
Do not substitute a neutral grey background.

### Colour — dark theme

A complete dark theme exists in the CSS under `:root[data-theme="dark"]` (`--bg:#0B0D11`,
`--panel:#12151B`, `--text:#E9ECF2`, `--em-a:#B49AFF`, `--card-shadow:none`, and matching
hero-lighting constants in `hero.js` `THEMES.dark`).

**It is not user-reachable.** `<html data-theme="light">` is hardcoded and the only way in is
`?theme=dark` — `site.js` comments it as "an internal preview only". There is no toggle in the
nav. See decision D-004.

### Geometry & type tokens

| Token | Value |
|---|---|
| `--radius` | `14px` (cards) |
| `--maxw` | `1180px` (content container) |
| `--font-head` | `'Space Grotesk', system-ui, -apple-system, sans-serif` |
| `--font-mono` | `'IBM Plex Mono', ui-monospace, monospace` |

Other radii in use, not tokenised: `999px` (buttons, chips), `16px` (quote form, split art,
map card, pdp), `18px` (build-log stage), `12px` (FAQ, icon tiles), `10px`/`11px`/`9px`/`8px`
(inputs, viz frames, socials, thumbs, framed photos).

---

## 2. Typography

Two families, self-hosted as woff2 (`fonts.css`), subset latin + latin-ext:

- **Space Grotesk** — everything structural. Weights **400, 500, 600, 700**.
  `SpaceGrotesk-600-latin.woff2` is `<link rel=preload>`ed.
- **IBM Plex Mono** — every label, kicker, spec line, caption, breadcrumb, footer heading.
  Weights **400, 500**.

`font-display: swap` on all faces.

### Type scale (all `clamp()`, fluid)

| Element | Size | Notes |
|---|---|---|
| Home `h1` | `clamp(2.6rem, 5.2vw, 4.2rem)` | `line-height:1.14`, `margin:18px 0 20px` |
| Subpage `h1` (`.phero h1`) | `clamp(2.2rem, 4.4vw, 3.4rem)` | |
| Section `h2` (`.sec-head h2`) | `clamp(1.8rem, 3.4vw, 2.6rem)` | |
| Quote-section `h2` | `clamp(2rem, 4vw, 2.9rem)` | |
| Parts-door `h2` | `clamp(1.9rem, 3.6vw, 2.8rem)` | |
| Prose `h2` | `clamp(1.6rem, 3vw, 2.2rem)` | |
| Testimonial blockquote | `clamp(1.25rem, 2.6vw, 1.7rem)` | weight 500 |
| Stat / proof number | `clamp(1.5rem, 3vw, 2.1rem)` proof · `clamp(1.7rem, 3.4vw, 2.5rem)` stat | weight 700, `--em-a` |
| Hero lead | `1.12rem` | `--muted`, `max-width:32rem` |
| Body / prose `p` | inherited 1rem, `line-height:1.6` | `--muted` |
| Card `p` | `.92rem`–`.93rem` | |
| Nav links | `.92rem` | |
| Button | `.95rem` / `.85rem` small | weight 600 |

**Headings:** `font-weight:600`, `line-height:1.14`, `text-wrap:balance` on h1–h4 globally.
**Body:** `line-height:1.6`.

### The mono label pattern (used ~40× site-wide)

```css
.mono { font-family: var(--font-mono); font-size: .72rem; letter-spacing: .14em;
        text-transform: uppercase; color: var(--faint); }
.mono.accent { color: var(--em-a); }
```

Variants tune size/tracking per context: `.chip` `.72rem/.08em`, `.stagecard .spec`
`.7rem/.1em`, `.proof-item span` `.64rem/.13em`, `.stat span` `.66rem/.12em`, `.crumb`
`.68rem/.14em`, `.foot-grid h4` `.68rem/.14em`, `.form-note` `.64rem`,
`.show-count` `.72rem/.18em`, `.obj-caption` `.72rem/.16em`.

This uppercase-mono kicker above every heading is the single most recognisable typographic
move in the design. Every section header uses it.

---

## 3. Layout & spacing

- **Container:** `.wrap` = `max-width:1180px; margin:0 auto; padding:0 24px`.
  `.wrap-narrow` = same with `max-width:840px`.
- **Section rhythm:** `section { padding: 96px 0 }`. Exceptions: `.quote-sec` `110px 0`,
  `.quoteband` `80px 0`, `.proof` `44px 0 34px`, `footer` `56px 0 44px`,
  `.phero` `190px 0 76px` (→ `150px 0 60px` under 900px).
- **Section header block:** `.sec-head` = `max-width:660px; margin:0 auto 56px; text-align:center`.
- **Grid gaps:** `20px` for card grids (rail, fcards, pgrid, stats, proof),
  `52px` for two-column feature splits (`.split`, `.quote-grid`, `.contact-grid`, `.pdp`),
  `44px` for `.phero-in`, `36px` for footer.
- **Alternating bands:** sections alternate plain `--bg` and `.tint`
  (`background:var(--panel-2); border-block:1px solid var(--line)`). That border-block on the
  tinted band is what gives the page its horizontal-rule rhythm.

### Breakpoints

`1024px` (nav collapses to burger; hero tablet tier) · `900px` (splits and two-col grids stack) ·
`820px` (services rail stacks; footer stacks; reviews stack) · `760px` / `700px` (product grid
2-up; stats/proof 2-up) · `640px` (mobile hero layout, tighter nav, smaller thumbs) · `400px`
(nav CTA button hidden).

---

## 4. Component vocabulary

The design system to freeze before any interior-page fan-out. Names below are the prototype's
CSS class names; the Astro components should map roughly 1:1.

| Component | Prototype class | Where used |
|---|---|---|
| Sticky nav + mobile drawer | `nav` / `.drawer` / `.scrim` / `.burger` | every page |
| Button | `.btn` + `.primary` \| `.ghost` + `.small` \| `.wide` | every page |
| Mono kicker | `.mono`, `.mono.accent` | every page |
| Section header | `.sec-head` (kicker + h2 + p) | every page |
| Chip | `.chip` | home hero |
| Home hero (WebGL) | `.hero` + `#hero-canvas` + `.obj-caption` | home only |
| Page hero | `.phero` + `.phero-in` + `.phero-art` + `.crumb` | all 8 interior pages |
| Stat / proof strip | `.stats` / `.proof` | home, scanning, about, reviews |
| Service stage card | `.stagecard` + `.viz` | home only |
| Build-log spotlight | `.show-stage` + `.show-thumbs` | home, gallery |
| Testimonial band | `.quoteband` | home |
| Parts-shop door (3D) | `.door` + `.wall` + `.witem` | home, 3d-printing |
| Feature card 3-up/2-up | `.fcards` / `.fcards.two` + `.fcard` (+ `.ic` svg tile) | 5 pages |
| Prose + art split | `.split` / `.split.rev` + `.prose` + `.split-art` | scanning, printing, design, about |
| Spec table | `.spectable` in `.table-scroll` | 3d-printing |
| FAQ accordion | `.faq` + `<details>/<summary>` | scanning, printing, design, contact |
| Review card 2-up | `.rcards` + `.rcard` | reviews |
| Quote form section | `.quote-sec` + `.quote-grid` + `.quote-form` | every page |
| Footer | `footer` + `.foot-grid` + `.socials` + `.foot-bottom` | every page |
| Scroll reveal | `.reveal` → `.reveal.on` | every page |
| Framed photo | shared rule on `.phero-art img`, `.split-art img`, `.witem img`, … | many |

### Details worth not re-deriving

**Framed photo rule.** Photos sit *inside* a padded panel; the border and lift hug the image,
not the container — `border:1px solid var(--line); border-radius:8px;
box-shadow:0 6px 18px rgba(25,26,32,.12); background:var(--panel)`, with the container
providing `padding:18–22px` and `object-fit:contain`. Product shots are on white backgrounds,
so this reads as a matted print. Do not `object-fit:cover` these.

**Primary button.** `background:linear-gradient(135deg,#7B3BFF,var(--accent-deep))`,
`box-shadow:0 4px 24px rgba(94,23,235,.35)`, hover `translateY(-2px)` +
`0 8px 32px rgba(94,23,235,.5)`, `border-radius:999px`, `padding:12px 22px`.
Note `#7B3BFF` is a literal, not a token.

**Service card numbering** is CSS-generated: `counter-reset:step` on `.rail`,
`.stagecard h3::before { counter-increment:step; content:"0" counter(step) }` — renders
`01` / `02` / `03` in mono accent above each card title.

**FAQ marker** is `+` / `−` via `summary::after` with `content:'+'` and
`details[open] summary::after { content:'\2212' }`; the native marker is suppressed.

**Prose list bullets** are rotated squares: `li::before` 8×8px `background:var(--accent)`
`transform:rotate(45deg)` `border-radius:2px`.

**Focus ring** (global): `:focus-visible { outline:2px solid var(--accent); outline-offset:3px }`.

**Reduced motion:** `@media (prefers-reduced-motion: reduce)` disables reveals, the build-log
Ken Burns, smooth scroll, and drawer transition; `hero.js` and `site.js` each check the query
and drop into static end-states. Preserve this — it is done properly in the prototype.

---

## 5. Homepage — section order and verbatim copy

Order top to bottom. Copy is verbatim (HTML entities resolved).

### 5.1 Nav (fixed, blurred)
Brand = inline SVG lemniscate (infinity/figure-eight, `stroke:#5E17EB`, `stroke-width:6`,
`stroke-linecap:round`, `viewBox="0 0 100 50"`, 44px wide) + wordmark `LIMITLESS **3D**`
(the `3D` in `--accent`, weight 700).
Links: Scanning · Printing · Design · Gallery · Parts Shop · About, then `Get a Quote`
(`.btn.primary.small`). Under 1024px the text links hide and a burger opens a right-hand
drawer (`min(86vw,340px)`), which repeats the links plus `CALL 920-360-7543` and
`EMAIL THE WORKSHOP` in its footer.

Exact SVG path:
`M50 25 C42 8, 16 8, 12 25 C8 42, 34 42, 50 25 C66 8, 92 8, 88 25 C84 42, 58 42, 50 25 Z`

### 5.2 Hero — `min-height:100svh`
Kicker: `Limitless 3D · Neenah, Wisconsin`
H1: `From idea` / `to *object.*` — "object." wrapped in `<em>` carrying
`linear-gradient(100deg, var(--em-a), var(--em-b))` + `background-clip:text`.
Lead: *"3D scanning, design, and printing under one roof in the Fox Valley. Twenty-five years
of professional design experience behind every part."* (`Fox&nbsp;Valley`, `every&nbsp;part`)
CTAs: `Get a Quote` (primary, → `#quote`) · `See the Work` (ghost, → `#work`)
Chips: `Accuracy **0.02 mm**` · `Filament + resin **printing**` · `**25 yrs** design experience`
Caption (`.obj-caption`, right 11% / bottom 15vh): driven by the animation, see §7.
Copy block is `max-width:560px`, `padding:22vh 24px 64px`; `pointer-events:none` on the
wrapper so drags reach the canvas, re-enabled on links.
Two radial glows behind: `820px 560px at 70% 40%` and `560px 420px at 16% 86%`.

### 5.3 Proof bar (`.proof`, white panel, 4-up)
`★ 4.8` / Average rating · `500+` / Customer reviews · `3,000+` / Orders shipped ·
`Star Seller` / Etsy recognition
Below, centred: `READ THE REVIEWS ON ETSY →` → `https://www.etsy.com/shop/Limitless3DDesign`
2-up under 700px.

### 5.4 Services rail (`section.tint#services`)
Kicker `What we do` · H2 `Scan. Design. Print.` ·
Sub: *"Three services under one roof, one seamless pipeline. Bring a broken part, a sketch, or
an idea stuck in your head."*

Three `.stagecard`s, each with a 190px animated `.viz`, auto-numbered 01/02/03:

1. **3D Scanning** — *"Millions of measured points capture the exact shape of any object,
   without markers or scanning spray. From heirlooms to engine parts."*
   Spec: `DIMENSIONAL ACCURACY TO 0.02 MM` · Link: `More on 3D scanning →` → `/3d-scanning`
   Viz: `<canvas id="viz-scan">` — see §7.2
2. **3D Design** — *"Twenty-five years of professional CAD work turns the scan, the sketch, or
   the idea in your head into a real engineering model."*
   Spec: `MEASURE TWICE. CUT ONCE.` · Link: `More on 3D design →` → `/3d-design`
   Viz: inline `<svg id="viz-cad" viewBox="0 0 300 190">` — a dimensioned technical drawing
   (rect 70,60 160×70 r4 in `#5E17EB`; two r14 circles at 110,95 and 190,95 in `#B49AFF`;
   dimension lines in `#8A8F9C`; mono labels `6.000`, `1.75`, `⌀.250 2 PLCS`). Self-draws.
3. **3D Printing** — *"Built layer by layer in the material that fits the job, from economical
   PLA to functional ABS and nylon. In your hands in days, not weeks."*
   Spec: `PLA · ABS · NYLON · RESIN` · Link: `More on 3D printing →` → `/3d-printing`
   Viz: 18 `.layers i` bars + a `.nozzle` dot — see §7.2

### 5.5 Build log spotlight (`section#work`)
Kicker `The build log` · H2 `Made in the workshop` ·
Sub: *"Real parts, repairs, and ideas that have come through the door."*

`.show-stage`: `height:min(560px,58vw)`, `border-radius:18px`, background
`radial-gradient(70% 70% at 50% 42%, #1b2030, var(--ink))`, four `.corner` brackets in
`--accent-glow`, a bottom-up dark gradient `::after` for text legibility, `.show-count`
`01 / 06` top-right, `.show-meta` bottom-left (kicker / title / sub), and a `.show-sweep`
scan line that fires on every change. Below: `.show-thumbs`, 82×60px, desaturated at 50%
opacity until active.

Six entries (from `window.SHOWCASE`), in order:

| # | Image | Kicker | Title | Sub |
|---|---|---|---|---|
| 1 | `pond-nozzle.jpg` | COMMERCIAL COMMISSION | Pond fountain nozzles | DESIGNED FOR WI PONDWORKS |
| 2 | `nozzle-cad.jpg` | THE DESIGN FILE | The model behind it | REVERSE ENGINEERED IN CAD |
| 3 | `ski-boot.jpg` | REPAIR | Ski boot repair | BACK ON THE MOUNTAIN |
| 4 | `custom-divider.jpg` | HOME SOLUTION | Custom drawer storage | BUILT TO FIT EXACTLY |
| 5 | `heirloom.jpg` | RESTORATION | Antique concertina | PARTS MADE TO MATCH |
| 6 | `rc-cars.jpg` | HOBBY | Hobby RC builds | BODIES AND PARTS |

### 5.6 Testimonial band (`.quoteband`, white panel)
`★★★★★` · *"Randy was incredible to work with. Fair pricing, and **you can tell he loves what
he does.**"* (second clause in `<em>` → `--em-a`) · `Verified customer · fountain nozzle project`

### 5.7 Parts-shop door (`section.door#shop-door`) — 640px tall
Two 3D-rotated walls of product photos flank a centred core.
`perspective:1150px`; `.wall.left` `rotateY(56deg)` at `left:-40px`, `.wall.right`
`rotateY(-56deg)` at `right:-40px`, each `width:min(31vw,400px)`, 2-col grid, 6 square
`.witem` tiles on white with `0 14px 34px rgba(0,0,0,.35)`. Fog gradients top (22%) and
bottom (38%), plus a radial fog behind the core text.
Kicker `The parts shop` · H2 `The part they stopped making?` / `We print it.` ·
*"Over 60 replacement parts and originals, designed and printed in the workshop. Shipped
nationwide."* · CTA `Enter the Parts Shop` → `/shop` ·
Sub: `60+ PARTS · SECURE CHECKOUT · SHIPS NATIONWIDE`
Under 640px: height 540px, walls `44vw`, tiles 5+ hidden (4 per wall).

### 5.8 Quote section (`section.quote-sec#quote`) — two columns, `1fr 1.05fr`
Left: kicker `Have an idea?` · H2 `Let's make it real.` ·
*"Tell us what you are picturing, what broke, or what you can no longer buy. You will hear back
fast, and you will be treated like family."*
Then `PREFER TO TALK? **920-360-7543**` and `OR EMAIL **LIMITLESS3DDESIGN@GMAIL.COM**`.
Right: `.quote-form` card (16px radius, 30px pad) — fields in order:
`Full name` + `Phone` (side by side, `.row2`) · `Email` · `What do you need?` (select:
3D printing / 3D scanning / 3D design / Repair or replacement part / Not sure yet) ·
`Tell us about it` (textarea, placeholder *"What are you picturing? A link to a print file is
welcome too."*) · hidden honeypot `website` · submit `Get My Custom Quote` (`.btn.primary.wide`) ·
note `We reply the same day whenever we can.`
Labels are the mono pattern at `.66rem/.12em`.

### 5.9 Footer — `1.4fr 1fr 1fr`, `--panel-2` background
Col 1: brand lockup (`LIMITLESS **3D** LLC`) + *"A small family shop in Neenah, Wisconsin. 3D
scanning, design, and printing, with twenty-five years of professional design experience behind
every part."* + three 42px social tiles (Instagram, Facebook, Etsy — inline SVGs in the snapshot).
Col 2 `Services`: 3D Scanning · 3D Printing · 3D Design · Gallery
Col 3 `Shop and contact`: Parts Shop · Reviews · About · Contact · Shipping and returns
Bottom bar: `Neenah, WI · 920-360-7543 · limitless3ddesign@gmail.com` /
`Privacy · Shipping and returns · © 2026 Limitless 3D LLC`

---

## 6. Interior pages — structure (for later sessions)

All 8 open with `.phero` (crumb + kicker + h1 with `<em>` accent + lead + CTAs + `.phero-art`
photo, 4:3) and close with the shared `.quote-sec`. Copy lives in the snapshot HTML.

| Page | Title tag | Section order after the hero |
|---|---|---|
| `/3d-scanning` | 3D Scanning Services \| 0.02 mm Accuracy \| Limitless 3D, Neenah WI | tint(stats) → split "Accurate scans, not just pretty ones" → split.rev "Some jobs take a steady hand" → tint(sec-head "Reasons a scan solves the problem" + fcards ×6) → sec-head "Scan to finished part, all in one shop" + fcards ×3 → sec-head "Good to know" + faq → quote |
| `/3d-printing` | Custom 3D Printing in the Fox Valley \| Limitless 3D, Neenah WI | fcards ×3 (Fast and local / Proof of concept / Company swag) → tint(sec-head "Pick the material that fits the job" + spectable) → split "Already have a file? Send it over." → sec-head "Good to know" + faq → **door** → quote |
| `/3d-design` | 3D Design and CAD Services \| 25 Years Experience \| Limitless 3D | split "Details, details, details" → split.rev "The software has kept up. So have we." → tint(sec-head "Four ways a project usually starts" + fcards.two ×4) → sec-head "Good to know" + faq → quote |
| `/gallery` | Project Gallery \| Real 3D Printed Parts and Repairs \| Limitless 3D | sec-head "Ten projects, start to finish" (spotlight, 10 entries) → tint(sec-head "What most of these have in common" + fcards ×3) → quoteband → quote |
| `/about` | About Limitless 3D \| Small Family Shop in Neenah, WI | split "Where the standards come from" → split.rev "A small shop, on purpose" → tint(stats) → sec-head "Newest technology, competitive prices" + fcards ×3 → quoteband → quote |
| `/reviews` | Customer Reviews \| Limitless 3D, Neenah WI | proof bar → sec-head "What customers say" + rcards → tint(sec-head "What you can expect, every time" + fcards.two ×4) → "Leave a review" (narrow, centred) → quote |
| `/contact` | Contact Limitless 3D \| Neenah, WI \| 920-360-7543 | contact-grid (cblocks + map-card "Neenah and the Fox Valley") → quote → sec-head "Quick answers" + faq |
| `/shipping-and-returns` | Shipping and Returns \| Limitless 3D | wrap-narrow prose: Shipping / Returns / If something is wrong with your part / Custom work → quote |

The prototype also has a `/shop` page (product grid + PDP; `.shopbar`, `.pgrid`, `.pcard`,
`.pdp*` styles are all in `site.css`). **We are not rebuilding it** — see decision D-002.

---

## 7. Motion & interaction

### 7.1 Hero — WebGL, `hero.js` (the "SCANNING" animation)

The centrepiece. Full source in `docs/prototype-snapshot/hero.js`; port it, don't reinvent it.

**Geometry.** The brand mark as a **lemniscate of Bernoulli** swept into a tube:
`x = a·cos θ / d`, `y = a·sin θ·cos θ / d`, `z = 0.34·sin 2θ`, where `θ = 2πt`,
`d = 1 + sin²θ`, `a = 2.15`. Tube radius varies along the path —
`brushR(t) = 0.20·(0.78 + 0.30·sin(4πt + 0.7))` — giving a brush-stroke taper that matches the
logo. Built by hand as a 440×26-segment `BufferGeometry` with a parallel-transport frame
(not `TubeGeometry`). Material: `MeshPhysicalMaterial` `#5E17EB`, `roughness .34`,
`metalness .12`, `clearcoat .45`, `DoubleSide`.

**Four-phase loop**, `PH = [scan 3.2s, print 4.6s, done 4.4s, dissolve 1.9s]`:

| Phase | What happens | Caption |
|---|---|---|
| `scan` | 2,200 point-cloud samples fly in from a random sphere shell (r 3.4–6.0) onto the surface, staggered by `(i%17)/17·.25` | `SCANNING… **n%**` |
| `print` | A clipping plane rises `minY → maxY`; the solid mesh is revealed bottom-up while a bright band (`bandMat`, ~0.055 thick) marks the live layer; points below the plane are consumed via `setDrawRange` on the y-sorted array | `PRINTING… **n%** · LAYER **n**/212` |
| `done` | Solid mesh only, slow auto-spin at 0.3 rad/s | `COMPLETE · **0.02 MM** ACCURACY` (+ ` · DRAG TO SPIN` when `hover:hover`) |
| `dissolve` | Mesh fades out, points fly back to the sphere, starts re-randomise | (blank) |

**Interaction:** pointer-drag to spin (`×.008` per px, inertia `×.94`/frame, `lerp .12`);
mouse parallax `±.35 x / ±.22 y` on hover devices; `IntersectionObserver` pauses the RAF loop
when the hero scrolls out.

**Responsive placement** — three tiers, `rig` position/scale + camera Z:
mobile ≤640 `{x:0, y:1.42, s:.44, camZ:10.4}` · tablet ≤1024 `{x:1.15, y:.15, s:.86, camZ:8.8}` ·
desktop `{x:1.85, y:.05, s:1, camZ:8.4}`. On mobile the object sits *above* the copy
(`.hero-in` gets `padding-top:47svh`).

**Loading.** `three.min.js` is self-hosted and loaded lazily — `requestIdleCallback` →
`IntersectionObserver` (300px margin) → inject script. Nothing 3D is on the critical path.

**Graceful degradation, three layers** (all preserved on our side):
- No WebGL / no THREE / `?nogl=1` → canvas and caption are removed, a static purple SVG
  lemniscate with a `drop-shadow` glow is injected instead.
- `prefers-reduced-motion` → locks to the `done` phase, no auto-rotation.
- Debug query params: `?phase=scan|print|done`, `?done=1`, `?theme=dark`.

### 7.2 Service card visuals (`site.js`)

- **Scan** — 2D canvas, 340 points, 6.8s cycle: converge onto a lemniscate (0→1.7s), a vertical
  gradient sweep crosses left→right (1.9→4.9s) brightening points within 46px, dissolve
  (5.2→6.2s). Points are 2.4px squares, 4.4px when lit.
- **Design** — the inline SVG's `.draw` paths self-draw via `stroke-dasharray`/`dashoffset`
  with a `0.16s` per-element stagger, `1.3s` ease, looping every 6.8s.
- **Print** — 18 bars fill bottom-up, `0.30s` each, while the `.nozzle` dot tracks the active
  layer's x/y (measured from live `getBoundingClientRect`), then 1.7s hold, 0.6s fade, repeat.

All three are gated on `IntersectionObserver` at `threshold:.3` and are static under
reduced motion.

### 7.3 Other

- **Reveal on scroll:** `.reveal` → `translateY(22px)` + opacity, `.7s ease`, unobserved after
  firing, `threshold:.15`.
- **Build-log spotlight:** 5s autoplay, double-buffered `<img>` crossfade (`.8s`), a 1s sweep
  line on every change, 11s Ken Burns (`top:45% → 43.4%`), swipe support (44px threshold),
  and a 12s pause after any manual interaction.
- **Drawer:** `.3s cubic-bezier(.4,0,.2,1)`, closes on scrim click, link click, Escape, or
  resize past 1024px.

---

## 8. Images

**All 23 downloaded at full resolution.** Nothing may be hotlinked (plan §6).

### Content photos — prototype-hosted `/assets/img/*.jpg` (11)

| File | Subject | Used on |
|---|---|---|
| `pond-nozzle.jpg` | Pond fountain nozzle | home spotlight 1, gallery, 3d-design, about |
| `pond-nozzle-2.jpg` | Nozzle, second angle | 3d-scanning, gallery |
| `nozzle-cad.jpg` | CAD model of the nozzle | home spotlight 2, gallery, 3d-design |
| `ski-boot.jpg` | Ski boot repair | home spotlight 3, gallery, reviews |
| `custom-divider.jpg` | Custom drawer divider | home spotlight 4, gallery, shipping |
| `heirloom.jpg` | Antique concertina | home spotlight 5, gallery, 3d-scanning |
| `rc-cars.jpg` | Hobby RC builds | home spotlight 6, gallery, 3d-printing, contact |
| `display-stand.jpg` | Display stand | gallery, 3d-design, about |
| `workshop-01.jpg` | Workshop | 3d-scanning, gallery, about |
| `workshop-02.jpg` | Workshop | 3d-printing, gallery |
| `og-image.jpg` | 1200×630 social card | every page's `og:image` |

### Parts-wall photos — **hotlinked** from `140396716.cdn6.editmysite.com` (12)

Etsy/Square product shots of printed parts on white. Used **only** in the `.door` walls, all
`aria-hidden` / `alt=""` — purely decorative. The prototype requests them at `?width=400`;
we downloaded the originals (1576–3000px wide).

Source pattern: `…/uploads/1/4/0/3/140396716/s666696764460511456_<id>.jpeg` with ids
`p9_i1_w2250`, `p11_i1_w1819`, `p14_i1_w2250`, `p19_i1_w2686`, `p28_i1_w3000`, `p30_i1_w2250`,
`p40_i1_w2250`, `p44_i1_w1819`, `p58_i1_w3000`, `p63_i1_w2250`, `p66_i1_w1576`, `p67_i1_w2250`.

Renamed `part-01.jpg` … `part-12.jpg` in wall order (left wall then right wall) since they
carry no semantic content. Original id mapping is preserved in
`src/assets/parts/SOURCES.md`.

### Icons
`favicon-32.png`, `icon-512.png`, `apple-touch-icon.png` — the prototype's own. Regenerate
from the brand SVG rather than copying; the SVG path is in §5.1.

---

## 9. SEO baseline from the prototype

The prototype's metadata is already the target quality (plan §5.4) — reuse it verbatim.

- Titles and descriptions: see §6 table and the snapshot `<head>`s.
- `<link rel=canonical>` points at `https://www.limitless3ddesign.com/…` — already correct
  for the real domain.
- Full Open Graph + `twitter:card=summary_large_image`, `og:image` 1200×630.
- `theme-color` `#F6F4EE`.
- **JSON-LD `ProfessionalService`** sitewide, with: name `Limitless 3D LLC`,
  tel `+1-920-360-7543`, email `limitless3ddesign@gmail.com`, address Neenah WI 54956 US,
  `areaServed` Neenah / Appleton / Oshkosh / Menasha / Wisconsin, `priceRange` `$$`,
  `sameAs` Instagram + Facebook + Etsy.
  Plan §5.5 wants `LocalBusiness` + per-service `Service` schema — that is an upgrade on this
  baseline, not a replacement.
- `<a class="skip">` skip-link on every page.

**Business facts** (consistent across the prototype, treat as ground truth until the owner
says otherwise): Neenah WI 54956 · 920-360-7543 · limitless3ddesign@gmail.com ·
4.8 stars / 500+ reviews / 3,000+ orders / Etsy Star Seller · 60+ parts in the shop ·
0.02 mm scan accuracy · 25 years design experience · owner's name **Randy**.

---

## 10. Deliberate deltas from the prototype

What we are **not** copying, and why. Cross-referenced to `docs/design-decisions.md`.

| # | Prototype does | We do | Why |
|---|---|---|---|
| D-001 | Quote form has no file input | Add a photo-upload field | Plan §6 — "snap a picture of the broken part" |
| D-002 | `/shop` is a full product catalogue on-site | Nav/footer "Parts Shop" links out to `shop.limitless3ddesign.com` | Plan §2 — commerce stays on Square |
| D-003 | Hotlinks 12 photos from `cdn6.editmysite.com` | Self-hosted through Astro's image pipeline | Plan §6 |
| D-004 | Dark theme exists but is unreachable | Port the tokens, keep it unreachable for now | Not in scope; revisit post-launch |
| D-005 | Form posts `/api/quote`, falls back to `mailto:` | UI only, stubbed with a TODO | Phase 1a scope; backend is Phase 1b |
| D-006 | No FAQ on the homepage | FAQ planned, **deferred to Phase 2** — content needs the owner's input (plan §9.6, §10 2026-08-09) | Plan §6. Net-new → the one place Claude Design is sanctioned (plan §0) |
| D-007 | Copy is hardcoded | Hardcoded now, CMS-driven in Phase 1b | Plan §7 |
| D-008 | `data-to="chris+limitless@growwithkoda.co"` on the form | Removed | Prototype author's address |
| D-009 | Vercel Insights script | Dropped | Cloudflare Web Analytics at launch (plan §3) |

---

## 11. Open questions for the owner

1. The `Star Seller` / `500+ reviews` / `3,000+ orders` / `4.8` figures are the prototype's.
   Confirm they are current before launch (they become CMS fields in Phase 1b, plan §4.3).
2. Plan §6 wants Google reviews shown alongside Etsy stats — no Google data exists in the
   prototype, so the reviews page needs new content.
3. The gallery's 10 entries reuse the same 11 photos. More/better photography would help the
   build log carry the page.
