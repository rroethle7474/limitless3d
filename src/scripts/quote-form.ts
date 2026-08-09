/**
 * Quote form — real submission (Phase 1b).
 *
 * POSTs multipart FormData to /api/quote, a Cloudflare Pages Function
 * (functions/api/quote.ts — the request/response contract lives there). The
 * Vite dev server does NOT run the function; test against
 * `npx wrangler pages dev dist`.
 *
 * Spam: Cloudflare Turnstile. The third-party script loads only when the
 * visitor nears the form (or focuses a field), renders into `.turnstile-slot`,
 * and drops its token into the form as a hidden `cf-turnstile-response` input.
 *
 * Fail-loud (plan §3b): any non-2xx or network failure shows an honest error
 * with the phone/email fallback and keeps the form intact for a retry — never
 * a fake success. A lost lead is the worst silent failure this site has.
 */

import { photoLimitError } from '~/data/quote-limits';
import { BUSINESS } from '~/data/site';

declare global {
  interface Window {
    turnstile?: {
      render: (el: Element, opts: Record<string, unknown>) => string | undefined;
      reset: (id?: string) => void;
    };
    _l3dTurnstileReady?: () => void;
  }
}

const form = document.getElementById('quote-form') as HTMLFormElement | null;

if (form) {
  const fileInput = form.querySelector<HTMLInputElement>('input[type=file]');
  const fileNote = form.querySelector<HTMLElement>('.file-note');
  const btn = form.querySelector<HTMLButtonElement>('button[type=submit]')!;
  const btnLabel = btn.textContent;
  const DEFAULT_NOTE = 'JPG, PNG or HEIC. Up to 5 photos.';

  /* ---- Turnstile, lazily ------------------------------------------------ */

  const slot = form.querySelector<HTMLElement>('.turnstile-slot');
  let widgetId: string | undefined;
  let injected = false;

  const renderWidget = () => {
    if (!slot || widgetId !== undefined || !window.turnstile) return;
    widgetId = window.turnstile.render(slot, {
      sitekey: slot.dataset.sitekey,
      /* The site pins its own theme on <html>; 'auto' would follow the OS. */
      theme: document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light',
    });
  };

  const loadTurnstile = () => {
    if (injected) return;
    injected = true;
    if (window.turnstile) {
      renderWidget();
      return;
    }
    window._l3dTurnstileReady = renderWidget;
    const s = document.createElement('script');
    s.src =
      'https://challenges.cloudflare.com/turnstile/v0/api.js?onload=_l3dTurnstileReady&render=explicit';
    s.async = true;
    document.head.appendChild(s);
  };

  /* Load when the visitor approaches the section, or touches the form —
     whichever happens first. Keeps the third-party script off the wire for
     everyone who never scrolls near the form. */
  form.addEventListener('focusin', loadTurnstile, { once: true });
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          io.disconnect();
          loadTurnstile();
        }
      },
      { rootMargin: '600px 0px' },
    );
    io.observe(form);
  } else {
    loadTurnstile();
  }

  /* ---- photo feedback + validation -------------------------------------- */

  const photoError = () => photoLimitError(Array.from(fileInput?.files ?? []));

  /* Show what was picked — an upload field with no feedback feels broken. */
  fileInput?.addEventListener('change', () => {
    if (!fileNote) return;
    const files = Array.from(fileInput.files ?? []);
    const err = photoError();
    fileNote.classList.toggle('err', !!err);
    if (err) {
      fileNote.textContent = err;
      return;
    }
    if (!files.length) {
      fileNote.textContent = DEFAULT_NOTE;
      return;
    }
    const mb = files.reduce((n, f) => n + f.size, 0) / (1024 * 1024);
    fileNote.textContent =
      `${files.length} photo${files.length > 1 ? 's' : ''} attached · ${mb.toFixed(1)} MB`;
  });

  /* ---- submit ------------------------------------------------------------ */

  const esc = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;');

  const showSuccess = () => {
    const ok = document.createElement('div');
    ok.className = 'form-ok';
    ok.innerHTML =
      '<div class="mono accent">Request received</div>' +
      '<h3>Thanks, we have got it.</h3>' +
      '<p>You will hear back from the workshop shortly, usually the same day.</p>';
    form.replaceWith(ok);
  };

  const showFailure = (message?: string) => {
    btn.disabled = false;
    btn.textContent = btnLabel;
    /* Tokens are single-use — the consumed one can't back a retry. */
    window.turnstile?.reset(widgetId);

    const box = document.createElement('div');
    box.className = 'form-err';
    box.setAttribute('role', 'alert');
    box.innerHTML =
      `<b>${esc(message ?? "That didn't send.")}</b> ` +
      'Nothing was lost on your end — try again in a moment, or reach us directly: ' +
      `<a href="${BUSINESS.phoneHref}">${BUSINESS.phone}</a> or ` +
      `<a href="${BUSINESS.emailHref}">${BUSINESS.email}</a>.`;
    btn.before(box);
  };

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const data = new FormData(form);

    /* Honeypot: only bots fill this, so drop the submission silently. */
    if (data.get('website')) return;
    data.delete('website');

    const err = photoError();
    if (err) {
      if (fileNote) {
        fileNote.textContent = err;
        fileNote.classList.add('err');
      }
      fileInput?.focus();
      return;
    }

    data.set('page', location.pathname);

    form.querySelector('.form-err')?.remove();
    btn.textContent = 'Sending...';
    btn.disabled = true;

    let message: string | undefined;
    try {
      const res = await fetch('/api/quote', { method: 'POST', body: data });
      if (res.ok) {
        showSuccess();
        return;
      }
      const body = (await res.json().catch(() => null)) as { message?: string } | null;
      if (res.status === 400 && body?.message) message = body.message;
    } catch {
      /* Network down / offline — the generic failure copy covers it. */
    }
    showFailure(message);
  });
}
