# Session 4 kickoff prompt — Phase 1b: Sanity, the CMS wire-up

Copy the block below into a fresh Claude Code session. (The session-3 prompt this file used
to hold is done — quote backend shipped and inbox-validated 2026-08-09; see the RESUME
section of `docs/design-decisions.md`.)

**Before pasting — setup status:**

1. **Create the Sanity account first**: sanity.io, sign in with Google as
   `rroethle@gmail.com` — mirrors the Resend pattern (Ryan owns the dev accounts; Randy
   gets invited in Phase 2, and Google-login-for-the-owner was the §3 selection
   criterion). Free tier. No project or schema decisions needed up front — the session
   proposes those and you approve them in a running studio.
2. **Account created 2026-08-09** (Google, `rroethle@gmail.com`). Nothing goes into
   `.dev.vars` up front — the Sanity values don't exist until the session creates the
   project. Expect one interactive step early: the Sanity CLI needs a browser login, so
   when the session asks, run `! npx sanity login` (the `!` prefix runs it in-session).
3. **Tokens are secrets, same drill as the Resend key**: when the session needs a write
   token (quote-submission storage, late in the session), you create it at
   sanity.io/manage and paste it into `.dev.vars` yourself — never into the repo or the
   chat. The project id and dataset name are not secrets and can live in code.
4. `/model` → **Opus is sufficient** — single-agent schema + integration work. Pick Fable
   if you want extra scrutiny on the content-model and PII decisions.

---

```
Read CLAUDE.md, then docs/design-decisions.md (start at "RESUME HERE"), then
limitless3d-rebuild-plan.md §4 (content model), §3b, and the Phase 1b bullets
in §7. Decisions D-026/D-027 define the quote backend contract and the open
storage seam this session closes.

This is Phase 1b, session 4. Session 3 shipped the quote backend (Pages
Function + Turnstile + Resend; delivery validated to Ryan's inbox). Content
is still hardcoded everywhere; Sanity doesn't exist yet.

THE TASK: stand up Sanity per plan §4, migrate the hardcoded content into
it, wire the site to build from it, and close the D-027 storage seam so
quote submissions are dual-written (email + stored document).

Shape of the work — constraints first:
- The site stays static. Sanity content is fetched AT BUILD TIME only; no
  client-side Sanity JS ships. Webhook-triggered rebuilds arrive with the
  staging deploy, not this session.
- The studio lives in the repo (its own workspace dir) and runs locally for
  now; hosting it comes with staging.
- Content model is §4's five collections, scoped ruthlessly — layout stays
  in code. Propose the schema first, get it approved, then build.
- src/data/site.ts is the designed CMS seam (CLAUDE.md): migrating business
  facts should be a change of import, not a hunt through templates. Same
  for STATS.
- Seed programmatically from the hardcoded data where sane (one-off script
  with @sanity/client), by hand where not. Verbatim copy stays verbatim;
  log anything that changes.
- Images: gallery/build-log photos are meant to become owner-managed via
  Sanity's image CDN (§6), but the Astro/Sharp pipeline is the site's
  single biggest performance win (see the 1a baseline). Decide deliberately
  — Sanity CDN with a proper srcset story vs. keeping repo assets until
  Phase 2 — and log it as a decision row either way.
- Closing D-027: the Pages Function writes each submission as a Sanity
  document (project id / dataset / token via env, .dev.vars locally). The
  isolation contract in functions/api/quote.ts holds: storage failure must
  never block or fail the email. CRITICAL check before writing any PII:
  public Sanity datasets are world-readable. Verify the free tier gives a
  private dataset or an equivalent that keeps submissions unreadable
  without a token; if it does not, stop and present options rather than
  shipping a PII leak.
- Secrets stay in .dev.vars (gitignored, established pattern). Ryan pastes
  tokens himself. Never commit or echo secrets.

Validation loop: a local studio Ryan can click through; content migrated;
npm run build pulls from Sanity and the built site is equivalent to the
current hardcoded build (diff dist/ HTML where practical — the copy is
supposed to survive the migration byte-for-byte); then a quote submission
through wrangler lands BOTH the email and a visible document in the studio.
Run-and-look at each stage; hand off for review at the same boundaries as
always.

Conventions unchanged: small commits, decision rows in
docs/design-decisions.md (close D-027's row when the seam fills), plan §10
rows for anything that refines the plan.

Out of scope this session: staging deployment and deploy-hook rebuilds,
real Turnstile keys, domain verification/SPF/DKIM, Square catalog, the Etsy
reviews pull, the newsletter question, the homepage FAQ, and the 1a polish
pass (still owed, separate session). If context runs long, the clean
boundary is: schema + studio + gallery/build-log migrated end to end +
D-027 closed; remaining collections carry to session 5.

Start by reading src/data/site.ts and the components that consume it, then
propose the schema — collection by collection, field types, and which
existing file feeds each — before creating anything.
```

---

## Notes on using it

**Why build-time fetch, no runtime.** §3b's stale-not-down property depends on it: if
Sanity is ever unreachable, the previous deploy keeps serving. A client-side CMS dependency
would trade that away for nothing this site needs.

**The schema is being designed for one moment**: Phase 2's acceptance test, where Randy adds
a gallery entry himself in the editor. Few fields, obvious names, nothing clever — if the
schema needs explaining, it failed. TinaCMS is the named fallback if he struggles (§3).

**The PII check is not optional.** Quote submissions carry names, emails, phone numbers, and
photos. Public Sanity datasets serve documents to anyone who knows the project id. Whatever
the free tier allows, the bar is: submissions unreadable without a token, or they don't get
stored — the email path already works alone (that was D-027's isolation contract).

**What "done" looks like:** Randy-proof studio running locally; the built site renders from
Sanity with no visible change; one form submission produces an email *and* a studio-visible
document; decision rows written; D-027 closed.

**Still on the books after this session:** staging deploy (real Turnstile keys, noindex,
deploy hook → rebuild-on-publish), the 1a polish pass, Square catalog (gated on §9.7
credentials), and Randy's question list (§9.4, §9.6–§9.9).
