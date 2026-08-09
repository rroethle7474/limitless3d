# Limitless 3D — project conventions

Custom marketing site for Limitless 3D LLC (Neenah, WI), replacing a Square Online site while
keeping the domain and its SEO equity. Rebuild of an approved prototype's design.

## Read these first

| Doc | What it is |
|---|---|
| `limitless3d-rebuild-plan.md` | **The living plan and source of truth** — architecture, stack, scope, phases, decision log (§10). Read §0 for session strategy before starting any session. |
| `docs/design-reference.md` | Every design value derived once from the prototype: tokens, type scale, spacing, components, section order, verbatim copy, motion specs, image inventory. **Read this instead of re-fetching the prototype.** |
| `docs/design-decisions.md` | Running log of build-time judgment calls. Append, don't rewrite. |
| `docs/prototype-snapshot/` | Raw capture of all 9 prototype pages + CSS + JS. Reference only, never shipped. |

## Current status

**Phase 1a — static best-guess build.** Homepage built; interior pages not started.
Content is hardcoded (content collections arrive in Phase 1b with the CMS).

Out of scope until told otherwise: Sanity/CMS, Resend, Turnstile, deployment config,
redirects, Square APIs, the shop subdomain.

## Stack

Astro 5 (`output: 'static'`) · Tailwind v4 via `@tailwindcss/vite` · Sharp image pipeline ·
`three` for the hero · TypeScript strict · no UI framework, no islands.

Target: Cloudflare Pages. Nothing in the code should assume it yet.

## Commands

```bash
npm run dev       # dev server — keep it running, this project is reviewed by looking
npm run build     # production build
npm run preview   # serve the built output
npm run check     # astro check (types + template diagnostics)
```

## Conventions

**Styling is a deliberate hybrid** (decision D-010). Three layers, in order of preference:

1. **Tokens** — `src/styles/global.css` holds the prototype's exact custom properties and maps
   them into Tailwind via `@theme inline`, so `bg-panel` / `text-em-a` stay theme-reactive.
   Never hardcode a hex outside that token block.
2. **Utilities** — Tailwind classes for layout, spacing, and type in new work. Plus a few
   `@utility` shorthands for patterns used site-wide: `wrap`, `wrap-narrow`, `mono`, `tint`.
3. **Component CSS** — bespoke visual work (hero, parts door, spotlight, service visuals) lives
   in scoped `<style>` blocks inside its own `.astro` file, ported verbatim from the prototype.
   Translating those into arbitrary-value utilities buys nothing and risks drift.

**Other rules**

- **Never hotlink images.** Everything goes through `src/assets/` and `<Image>`. The old
  Square CDN (`cdn6.editmysite.com`) must not appear in shipped markup.
- **Business facts live in `src/data/site.ts`** — phone, email, address, nav, stats. If a value
  appears in two templates, it belongs there. That file is also the Phase 1b CMS seam.
- **Per-section JS.** `src/scripts/site.ts` is the only global script. Everything else is
  imported by the component that owns it, so a page ships only the JS it uses. The hero is
  additionally behind a dynamic `import()` gated on idle + intersection.
- **Preserve the degradation layers.** Reduced-motion end-states and the no-WebGL hero
  fallback are already correct — don't drop them when refactoring.
- **`~/` aliases `src/`.**
- Copy is verbatim from the prototype. If you change wording, log it.

## Working style

- **Run-and-look.** Keep the dev server up. After each section, stop and hand off for review
  before starting the next. Do not batch a whole page.
- **Small commits**, one section or page at a time.
- **Ambiguity doesn't block.** Best guess → row in `docs/design-decisions.md` → keep moving.
- Choices that refine or contradict the plan get a row in the plan's §10 decision log.
- **One live verification before calling anything done.** Rendered in a browser, looked at.
  "It builds" is not done.

## Session slicing (plan §0)

Phase 1a is deliberately multi-session; the docs above exist so each session starts warm.

1. **Session 1** — prototype investigation → scaffold → homepage.
2. **Sessions 2+** — interior pages in small batches, then gallery/build-log, then polish.
3. Heavy page-fetching plus building pressures context. End sessions at clean boundaries.

**Orchestration.** Single-agent for the homepage and design system — the component vocabulary
must exist before anything can consume it, and review is serial regardless. Interior pages are
a legitimate fan-out *after* the design system is frozen, and the right tool there is
subagents in one working tree (the pages are file-disjoint), not git worktrees or a message
bus. See the plan's §0 and the 2026-08-09 decision-log rows.

**Claude Design** is not used for sections that exist in the prototype — the prototype is the
approved target. Two sanctioned uses: net-new sections with no reference (the planned FAQ),
and variant exploration after the owner's first review in Phase 2.

## Environment notes

- Windows. PowerShell and Git Bash both available; they need different syntax.
- Astro's dev server is Vite, which binds IPv6 first — probe `localhost`, not `127.0.0.1`.
- npm on Windows can swallow `-- --flag`; invoke binaries from `node_modules/.bin` when flags
  matter.
- Background dev servers die with their parent tool-call shell. For anything that must outlive
  a command, launch detached and kill by PID.
