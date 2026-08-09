/**
 * Quote form — UI ONLY.
 *
 * ============================================================================
 * TODO(phase-1b): THIS FORM DOES NOT SUBMIT ANYWHERE. Nothing is sent, stored,
 * or emailed. Wire it to the real endpoint before this site goes anywhere near
 * production traffic — a lost lead is the worst silent failure this site has
 * (plan §3b).
 *
 * The endpoint must, per plan §3 and §3b:
 *   1. POST multipart/form-data to a Cloudflare Pages Function at /api/quote
 *   2. verify a Cloudflare Turnstile token before doing any work
 *   3. DUAL-WRITE every submission — email to the owner via Resend (with the
 *      photo attachments) AND a stored Sanity document — so a mail delivery
 *      hiccup can never lose a customer
 *   4. fail loud: a non-2xx must surface a retry affordance plus the phone
 *      number and email, never a silent success
 * ============================================================================
 */

export {}; // side-effect module — keeps declarations out of the global scope

const form = document.getElementById('quote-form') as HTMLFormElement | null;

if (form) {
  const fileInput = form.querySelector<HTMLInputElement>('input[type=file]');
  const fileNote = form.querySelector<HTMLElement>('.file-note');

  /* Show what was picked — an upload field with no feedback feels broken. */
  fileInput?.addEventListener('change', () => {
    if (!fileNote) return;
    const files = Array.from(fileInput.files ?? []);
    if (!files.length) {
      fileNote.textContent = 'JPG, PNG or HEIC. Up to 5 photos.';
      return;
    }
    const mb = files.reduce((n, f) => n + f.size, 0) / (1024 * 1024);
    fileNote.textContent =
      `${files.length} photo${files.length > 1 ? 's' : ''} attached · ${mb.toFixed(1)} MB`;
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const data = new FormData(form);

    /* Honeypot: only bots fill this, so drop the submission silently. */
    if (data.get('website')) return;
    data.delete('website');

    const btn = form.querySelector<HTMLButtonElement>('button[type=submit]')!;
    btn.textContent = 'Sending...';
    btn.disabled = true;

    // --- STUB -------------------------------------------------------------
    // Replaced in Phase 1b by a real fetch() to /api/quote. Until then we log
    // the payload so the field wiring is verifiable, and show the success
    // state so the flow can be reviewed.
    const payload: Record<string, unknown> = {};
    data.forEach((v, k) => {
      if (v instanceof File) {
        if (!v.size) return;
        payload[k] = (payload[k] as string[] | undefined)
          ? [...(payload[k] as string[]), `${v.name} (${(v.size / 1024).toFixed(0)} KB)`]
          : [`${v.name} (${(v.size / 1024).toFixed(0)} KB)`];
      } else {
        payload[k] = v;
      }
    });
    payload.page = location.pathname;

    console.warn(
      '[quote-form] TODO(phase-1b): no endpoint wired yet — nothing was sent. Payload:',
      payload,
    );

    window.setTimeout(() => {
      const ok = document.createElement('div');
      ok.className = 'form-ok';
      ok.innerHTML =
        '<div class="mono accent">Request received</div>' +
        '<h3>Thanks, we have got it.</h3>' +
        '<p>You will hear back from the workshop shortly, usually the same day.</p>';
      form.replaceWith(ok);
    }, 400);
    // --- END STUB ---------------------------------------------------------
  });
}
