# Session 2 kickoff prompt

Copy the block below into a fresh Claude Code session to start the interior-pages work.

**Before pasting — two setup steps for you, Ryan:**

1. `/model` → **Fable 5** for this session. Fable orchestrates; it does not build the pages.
2. That's it. The prompt below instructs the orchestrator to spawn every page-building
   subagent on **Opus** (`model: "opus"` on each Agent call). This must be explicit in the
   prompt because **subagents inherit the parent session's model by default** — a Fable
   orchestrator that spawns subagents without the override runs them all on Fable, which
   burns tokens at Fable rates for mechanical page-porting work that Opus handles fine.

---

```
Read CLAUDE.md, then docs/design-decisions.md (start at "RESUME HERE"), then
limitless3d-rebuild-plan.md §0 and §6. docs/design-reference.md §6 has the
section order for every interior page, and docs/prototype-snapshot/ has the raw
HTML for all of them — use it for verbatim copy rather than re-fetching the
prototype.

This is Phase 1a, session 2: the eight interior pages. npm install is done;
npm run dev works. Confirmed last session: homepage builds, astro check is
clean, hero WebGL and all animations run.

Model policy for this session: you (the orchestrator) are running on Fable.
Every subagent you spawn — the stage-2 page builders — must be spawned with
an explicit model override to Opus (Agent tool parameter model: "opus").
Do not spawn subagents on the inherited default, which would be Fable. The
division of labor: Fable reads results, adjudicates "stop and report" cases,
reviews integration, and talks to me; Opus subagents do the page building.
Stage 1 (below) is not delegated at all — you build it directly in this
session, because it defines the component vocabulary everything else consumes.

Sequencing — this matters, do not skip to the fan-out:

STAGE 1 (orchestrator builds directly, serial). The homepage established the
design system but NOT the interior-page component vocabulary. Build
/3d-scanning by hand first — it exercises almost the whole remaining set:
PageHero (.phero + .crumb + .phero-art), Stats, Split/Prose (both
orientations), FeatureCards (3-up and 6-up), and FAQ. Extract each as a real
reusable component in src/components/, not page-local markup. Run-and-look per
section as usual. Commit, and tell me the component list when it's frozen.

STAGE 2 (subagent fan-out, one working tree — no worktrees, no bus). Once I've
signed off on stage 1, fan out the remaining seven pages to Opus subagents.
They're file-disjoint (src/pages/<slug>.astro), so file-level separation is
enough isolation. Suggested batches: /3d-printing + /3d-design (closest to the
scanning page, plus SpecTable for printing); then /about + /gallery + /reviews
(needs ReviewCards); then /contact + /shipping-and-returns.

Guardrail every subagent gets, verbatim: "Use only the existing components and
tokens. Do not add new tokens, invent new section patterns, or edit shared
components. If your page needs a pattern that doesn't exist, stop and report it
instead of building it." You (Fable) adjudicate any of those centrally —
that's the downscaled CONTRACT-CHANGE rule and it's what keeps eight pages
consistent.

Also carried over from session 1:
- Generate public/apple-touch-icon.png at 180x180 from public/favicon.svg. The
  <link> in Base.astro 404s until then.
- Note that STACK_MAX/STACK_ASPECT in src/scripts/hero.ts must stay in sync
  with the media query in Hero.astro.

Conventions unchanged: run-and-look with the dev server up, small commits one
page at a time, copy verbatim from the snapshot, never hotlink an image, best
guess + a row in docs/design-decisions.md for ambiguous details, plan §10 row
for anything that refines the plan.

Out of scope, same as before: Sanity/CMS, Resend, Turnstile, deployment config,
redirects, Square APIs, the shop subdomain, and the homepage FAQ (that one is
net-new and the only sanctioned Claude Design task — separate conversation).

Start with stage 1.
```

---

## Notes on using it

**Stage 1 runs on Fable, and that's intentional.** The scanning page is doing double duty —
it's a deliverable *and* it's where the shared component vocabulary gets designed. That design
work is exactly what the strongest model is for; the seven pages after it are consumers, which
is Opus work. Expect stage 1 to take longer than a page "should," and review it more carefully
than the ones that follow.

**Watch for "stop and report" messages during stage 2.** If a subagent hits a missing pattern,
that's the system working. The two most likely to surface: `/reviews` needs ReviewCards
(`.rcards`) and `/3d-printing` needs SpecTable (`.spectable`) — neither appears on the
scanning page. Letting them surface naturally beats speculatively building components nobody
has consumed yet; when one is reported, Fable builds it (or delegates it with the same
guardrail) and re-dispatches the page.

**Why this model split works:** the orchestrator's job here is judgment — reconciling
subagent output, catching drift from the design system, deciding contract questions. The
subagents' job is mechanical — porting known HTML/CSS into a frozen component vocabulary with
the copy already written. Matching model strength to judgment-per-token is the whole point.

**Cadence reminder** (from the session-1 orchestration ruling): review stays serial — you look
at pages as they land, one batch at a time. The fan-out parallelizes the build, not the review.
