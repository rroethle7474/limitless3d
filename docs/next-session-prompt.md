# Session 10 kickoff prompt — the 1a polish pass + site improvements

Copy the block below into a fresh Claude Code session.

**The roadmap while Randy is away** (re-sequenced 2026-08-12, Ryan): session 8 = Etsy
reviews — done. Session 9 = Turnstile/CI/studio — **done 2026-08-13** (D-041–D-044;
Etsy went live the same session, key approved mid-session). Session 10 = this file.
Goal: a complete walkthrough-ready site before Randy is back.

**Setup status (end of session 9 — re-verify against RESUME):**

1. Staging `main.limitless3d.pages.dev` serves the full stack: Sanity content, live
   Etsy reviews, Square sandbox catalog (/parts + 61 PDPs), quote form with REAL
   Turnstile keys (widget renders and gates for real now — test on a phone too).
2. **CI owns deploys**: push to `main`, publish in the studio
   (`limitless3d.sanity.studio`), or the daily 09:47 UTC cron → build →
   verify-dist → deploy. No more manual wrangler unless CI is down. A local
   `npm run build` needs `.env` (Turnstile site key) + `.dev.vars` (the rest).
3. `gh` CLI is installed and authed (fine-grained PAT `limitless3d-ci` — also the
   Sanity webhook's auth header; rotation touches both). `gh run list -R
   rroethle7474/limitless3d` to check CI. Note: use the full path
   `"C:\Program Files\GitHub CLI\gh.exe"` if `gh` isn't on PATH in tool shells.
4. ETSY_SOURCE (Actions variable) = `live`. Outage runbook: flip to `fixture` in
   repo → Settings → Variables, rerun the workflow.

---

```
Read CLAUDE.md, then docs/design-decisions.md (start at "RESUME HERE";
D-041–D-044 are session 9's state), then the plan's §10 2026-08-13 row.

This is session 10: the long-owed 1a polish pass, plus site improvements
Ryan brings to the session. After this, the site should be walkthrough-
ready for Randy.

THE POLISH PASS (carried since session 2, now spanning 71 pages):
1. Mobile (~390px) for the homepage, all eight interior pages, /parts,
   and a PDP — including OPERATING the burger drawer at mobile width,
   the /reviews Etsy strip, gallery spotlight thumbs, and the quote form
   with the real Turnstile widget. (Window-resize tooling bottomed out
   at ~2048px in prior sessions; the in-page-iframe trick worked for
   /3d-scanning — see RESUME. A real phone against staging also counts,
   and Ryan has one.)
2. Reduced motion: emulate prefers-reduced-motion and walk the homepage
   + one interior page — reveals, hero, spotlight, door end-states.
3. ?nogl=1 hero fallback, eyeballed.
4. Side-by-side fidelity vs the live prototype (still up on Vercel),
   page by page.
5. A human scroll-through of staging in a FOCUSED tab (automation kept
   backgrounding tabs; reveals/autoplay were only force-verified).
6. Small owed fixes as they surface, plus these known ones:
   apple-touch-icon.png (D-017), the gallery "Ten projects" count vs
   entry count (D-031 — decide, don't just note), the /reviews PageHero
   static numbers (D-040 — same).
7. Confirm with Ryan in the Cloudflare dashboard that the Pages
   PRODUCTION env now has RESEND_API_KEY / QUOTE_TO_EMAIL /
   SANITY_API_TOKEN (session 9 found Production nearly empty; Turnstile
   was fixed then, the rest is unconfirmed — cutover blocker).
8. Site improvements: Ryan's list, brought to the session.

Ground rules unchanged: run-and-look, one section at a time, small
commits (each push deploys via CI — batch pushes sensibly), decision
rows + RESUME as work lands.

Out of scope: cutover/DNS, Randy's real Square credentials, homepage
FAQ (Phase 2), new feature surface area.
```
