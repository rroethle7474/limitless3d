# Session 3 kickoff prompt — Phase 1b entry: the quote form, end to end

Copy the block below into a fresh Claude Code session to start the wire-up phase.

**Before pasting — setup status (updated 2026-08-09):**

1. ~~Create a Resend account~~ **Done — Ryan has the account and the API key in hand.**
   (Signed up with `rroethle@gmail.com`, which matters: until a sending domain is verified,
   Resend only delivers to the account owner's own email — that restriction *is* our
   validation loop. No domain added or verified yet, deliberately.)
2. When the session creates the git-ignored `.dev.vars` file, **Ryan pastes the key into it
   himself** — it never goes into the repo or the chat.
3. **No Cloudflare account needed yet.** Turnstile has official always-pass test keys that
   work locally, and `wrangler` runs Pages Functions on your machine without a login. Real
   Turnstile keys and the Pages project come with the staging deploy, later in 1b.
4. `/model` → **Opus is sufficient** for this session — it's a single-agent build with no
   fan-out. Pick Fable if you want maximum scrutiny on the spam/validation decisions, but
   nothing here needs orchestration.

---

```
Read CLAUDE.md, then docs/design-decisions.md (start at "RESUME HERE"), then
limitless3d-rebuild-plan.md §3, §3b, and the Phase 1b bullets in §7. Decisions
D-005 and D-008 cover the form's current stubbed state.

This is Phase 1b, session 3 — the first wire-up session. Sessions 1–2 built
and verified all nine pages; the quote form is UI-complete on every page but
submission is a stub: src/scripts/quote-form.ts fakes success and logs a TODO.

THE TASK: make the quote form real, end to end, validated by an actual email
with photo attachments arriving in Ryan's inbox (rroethle@gmail.com). Ryan
performs the final validation himself — your job is to get it to the point
where he submits the form and checks his mail.

Architecture — these are constraints, not suggestions:
- Astro stays `output: 'static'`. The backend is a Cloudflare Pages Function
  at functions/api/quote.ts in the repo root — no Astro adapter, no SSR.
- The client script swaps its stub for a multipart FormData POST to
  /api/quote. Keep the honeypot check, the success card, and every existing
  degradation behavior exactly as they are.
- Spam: verify a Turnstile token server-side (siteverify). Use Cloudflare's
  official test keys locally — site 1x00000000000000000000AA, secret
  1x0000000000000000000000000000000AA — wired so real keys are an env-var
  swap at staging time.
- Email: Resend, from onboarding@resend.dev (test mode), to QUOTE_TO_EMAIL —
  an env var currently set to Ryan's email; the production address is open
  question §9.4. Attachments forwarded from the form's photo field.
- Secrets live in .dev.vars (RESEND_API_KEY, QUOTE_TO_EMAIL, TURNSTILE keys).
  Add .dev.vars to .gitignore BEFORE creating it. Ryan already has his Resend
  API key — create the file with a placeholder, then stop and ask him to
  paste the key in himself before testing. Never commit or echo secrets.
- Attachment limits are a real design point, not an afterthought: five phone
  photos can exceed 25 MB raw; check Resend's request-size limit (~40 MB) and
  add client-side validation (count + per-file size with a clear message)
  rather than letting big uploads fail opaquely at the API.
- Dual-write (§3b) is the requirement but Sanity doesn't exist yet: build the
  storage side as an explicit seam (a function with a logged TODO is fine)
  and log the deferral as a decision row. The email path must not depend on
  the storage path succeeding.

Local test loop: npm run build, then npx wrangler pages dev dist (Pages
Functions run locally against the built site). Verify a submission end to
end yourself first — function receives fields + files, Turnstile verifies,
Resend accepts — then hand off to Ryan for the inbox check. Note wrangler
serves its own port; the Vite dev server doesn't run the function.

Failure behavior follows §3b: if Resend errors, the user sees an honest
failure state with the phone/email fallback (both are already in the quote
section copy) — never a fake success.

Conventions unchanged: run-and-look, small commits, decision rows in
docs/design-decisions.md (update D-005 when the stub dies), plan §10 rows for
anything that refines the plan.

Out of scope this session: Sanity (studio, schema, the dual-write wiring),
staging deployment and real Turnstile keys, domain verification/SPF/DKIM,
redirects, Square catalog integration, the Etsy reviews pull, the newsletter
question, the homepage FAQ, and the 1a polish pass (mobile/reduced-motion/
fidelity checks — still owed, separate session).

Start by reading the current quote-form.ts and QuoteSection.astro, then
propose the function's request/response contract before writing it.
```

---

## Notes on using it

**Why static + a functions/ directory, not an Astro adapter.** The site's reliability posture
(§3b) rests on the marketing pages being dumb files on a CDN. Cloudflare Pages runs anything
in `functions/` as edge functions alongside static output with zero build-config change —
the form gains a backend without the site gaining a runtime. Wrangler runs the same layout
locally, so the whole loop works before any hosting exists.

**The Resend test-mode restriction is the feature, not a workaround.** Until a domain is
verified, mail goes only to the account owner. Signing up with Ryan's address makes
misdirected test emails impossible. At cutover prep this flips: verify
`limitless3ddesign.com` (DNS will be at Cloudflare by then), switch the from-address, and set
`QUOTE_TO_EMAIL` to Randy's answer to §9.4.

**What "done" looks like:** Ryan fills the form in a browser served by wrangler, attaches a
photo, submits, and the email — all fields, attachment included — is in his inbox. Plus the
failure path exercised once (kill the API key, submit, see the honest error with the
phone/email fallback).

**Still on the books after this session:** the 1a polish pass (mobile on eight pages, reduced
motion, `?nogl=1`, prototype side-by-side), then the rest of 1b (Sanity + content migration +
dual-write closure, staging deploy with noindex). Randy's question list is plan §9.4 and
§9.6–§9.9.
