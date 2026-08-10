/**
 * POST /api/quote — the quote form's backend (Cloudflare Pages Function).
 *
 * The site stays fully static (plan §2); this file lives outside src/ and is
 * picked up by Cloudflare Pages from the repo-root `functions/` dir. Locally it
 * runs with `npx wrangler pages dev dist` against the built site — the Vite dev
 * server does NOT serve it.
 *
 * Pipeline (§3, §3b): parse multipart → honeypot → validate fields → validate
 * photos → Turnstile siteverify → storage seam → Resend email with the photo
 * attachments. Responses are always JSON `{ ok, error?, message? }`; `message`
 * is user-showable and the client displays it verbatim on a 400.
 *
 * Fail-loud contract: a lost lead is the worst silent failure this site has.
 * Anything that prevents the email becomes a non-2xx so the client can show
 * the phone/email fallback — never a fake success. The one deliberate lie is
 * the honeypot's fake 200, which teaches bots nothing.
 */

import { MAX_TOTAL_MB, MB, photoLimitError } from '../../src/data/quote-limits';
import { SANITY_API_VERSION, SANITY_DATASET, SANITY_PROJECT_ID } from '../../src/data/sanity-project';

interface Env {
  /** Resend API key (test mode sends from onboarding@resend.dev). */
  RESEND_API_KEY: string;
  /** Delivery address. Ryan's inbox for now; production address is plan §9.4. */
  QUOTE_TO_EMAIL: string;
  /** Turnstile secret — the always-passing test key locally, real key at staging. */
  TURNSTILE_SECRET_KEY: string;
  /**
   * Sanity write token — the §3b dual-write's storage half (D-027). Optional by
   * contract: a missing token degrades to email-only with a loud log, never a
   * failed request.
   */
  SANITY_API_TOKEN?: string;
}

type QuoteError = 'validation' | 'turnstile' | 'email' | 'config';

const json = (status: number, body: { ok: boolean; error?: QuoteError; message?: string }) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

const ok200 = () => json(200, { ok: true });
const fail = (status: number, error: QuoteError, message?: string) =>
  json(status, { ok: false, error, message });

/** Multipart overhead on top of the raw file budget is boundaries + text fields. */
const MAX_REQUEST_BYTES = (MAX_TOTAL_MB + 2) * MB;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_DETAILS_CHARS = 10_000;

export const onRequestPost = async (context: {
  request: Request;
  env: Env;
}): Promise<Response> => {
  const { request, env } = context;

  /* Fail closed on missing config — a misconfigured deploy must not silently
     skip the spam check or swallow leads. */
  if (!env.RESEND_API_KEY || !env.QUOTE_TO_EMAIL || !env.TURNSTILE_SECRET_KEY) {
    console.error('[quote] missing env config (RESEND_API_KEY / QUOTE_TO_EMAIL / TURNSTILE_SECRET_KEY)');
    return fail(500, 'config');
  }

  const declared = Number(request.headers.get('Content-Length') ?? '0');
  if (declared > MAX_REQUEST_BYTES) {
    return fail(400, 'validation', `Those photos are too big to send — keep the total under ${MAX_TOTAL_MB} MB.`);
  }

  let data: FormData;
  try {
    data = await request.formData();
  } catch {
    return fail(400, 'validation', 'The submission arrived garbled — please try again.');
  }

  /* Honeypot (client checks it too, but bots POST directly). Fake success. */
  if (typeof data.get('website') === 'string' && (data.get('website') as string).length > 0) {
    return ok200();
  }

  const field = (k: string) => {
    const v = data.get(k);
    return typeof v === 'string' ? v.trim() : '';
  };

  const name = field('name');
  const email = field('email');
  const phone = field('phone');
  const service = field('service');
  const details = field('details');
  const page = field('page');

  if (!name) return fail(400, 'validation', 'Please tell us your name.');
  if (!EMAIL_RE.test(email)) return fail(400, 'validation', 'That email address does not look right — please check it.');
  if (details.length > MAX_DETAILS_CHARS) {
    return fail(400, 'validation', 'That message is too long for the form — trim it down, or email us directly.');
  }

  /* Photos: browsers send one zero-byte nameless File when nothing was picked. */
  const photos = data
    .getAll('photos')
    .filter((v): v is File => v instanceof File && v.size > 0);

  for (const p of photos) {
    /* accept="image/*" filters client-side; HEIC sometimes arrives with an
       empty type, so only reject a *declared* non-image. */
    if (p.type && !p.type.startsWith('image/')) {
      return fail(400, 'validation', `"${p.name}" is not an image — the form takes photos only.`);
    }
  }
  const limitErr = photoLimitError(photos);
  if (limitErr) return fail(400, 'validation', limitErr);

  /* Turnstile — verify before doing any real work. Tokens are single-use; the
     client resets its widget on failure so a retry gets a fresh one. */
  const token = field('cf-turnstile-response');
  if (!token) return fail(403, 'turnstile');
  try {
    const verify = new FormData();
    verify.append('secret', env.TURNSTILE_SECRET_KEY);
    verify.append('response', token);
    verify.append('remoteip', request.headers.get('CF-Connecting-IP') ?? '');
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: verify,
    });
    const outcome = (await res.json()) as { success: boolean; 'error-codes'?: string[] };
    if (!outcome.success) {
      console.warn('[quote] turnstile rejected:', outcome['error-codes']);
      return fail(403, 'turnstile');
    }
  } catch (err) {
    /* siteverify unreachable — failing open would disable the spam check, so
       fail loud; the client shows the phone/email fallback. */
    console.error('[quote] turnstile siteverify unreachable:', err);
    return fail(403, 'turnstile');
  }

  const submission = { name, email, phone, service, details, page, photos };

  /* §3b dual-write: storage must never block or fail the email path. */
  await storeSubmission(env, submission).catch((err) => {
    console.error('[quote] storeSubmission failed (email path continues):', err);
  });

  try {
    const sent = await sendEmail(env, submission);
    if (!sent.ok) {
      console.error(`[quote] resend rejected: ${sent.status} ${sent.body}`);
      return fail(502, 'email');
    }
  } catch (err) {
    console.error('[quote] resend unreachable:', err);
    return fail(502, 'email');
  }

  return ok200();
};

interface Submission {
  name: string;
  email: string;
  phone: string;
  service: string;
  details: string;
  page: string;
  photos: File[];
}

/**
 * The §3b dual-write's storage half (closes D-027): every submission also
 * becomes a Sanity document, so a mail hiccup can never lose a lead.
 *
 * The _id is `drafts.`-prefixed ON PURPOSE and must stay that way: the dataset
 * is public (free tier), and documents whose _id contains a period are the ones
 * the API refuses to serve without a token — that dot is what keeps names,
 * emails, and phone numbers private. The studio strips the Publish action for
 * this type so nobody can accidentally make one world-readable.
 *
 * Raw Mutations API via fetch — no SDK dependency inside the Worker. Photos are
 * not uploaded (the email carries them); only filename/size metadata is kept.
 * Isolation contract: the caller catches; a storage failure (including a
 * missing token) must never block or fail the email path.
 */
async function storeSubmission(env: Env, s: Submission): Promise<void> {
  if (!env.SANITY_API_TOKEN) {
    console.warn(
      `[quote] SANITY_API_TOKEN not set — submission from ${s.email} not persisted (email is the only record)`,
    );
    return;
  }

  const doc = {
    _id: `drafts.${crypto.randomUUID()}`,
    _type: 'quoteSubmission',
    submittedAt: new Date().toISOString(),
    name: s.name,
    email: s.email,
    phone: s.phone,
    service: s.service,
    details: s.details,
    page: s.page,
    photos: s.photos.map((p, i) => ({ _key: `photo-${i}`, filename: p.name, size: p.size })),
  };

  const res = await fetch(
    `https://${SANITY_PROJECT_ID}.api.sanity.io/v${SANITY_API_VERSION}/data/mutate/${SANITY_DATASET}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.SANITY_API_TOKEN}`,
      },
      body: JSON.stringify({ mutations: [{ create: doc }] }),
    },
  );
  if (!res.ok) {
    throw new Error(`Sanity mutate rejected: ${res.status} ${await res.text()}`);
  }
}

async function sendEmail(env: Env, s: Submission) {
  const attachments = await Promise.all(
    s.photos.map(async (p, i) => ({
      filename: p.name.replace(/[\r\n"\\]/g, '_') || `photo-${i + 1}`,
      content: base64(await p.arrayBuffer()),
      ...(p.type ? { content_type: p.type } : {}),
    })),
  );

  const lines = [
    'New quote request from the website.',
    '',
    `Name:    ${s.name}`,
    `Email:   ${s.email}`,
    `Phone:   ${s.phone || '—'}`,
    `Service: ${s.service || '—'}`,
    `Page:    ${s.page || '—'}`,
    '',
    'Details:',
    s.details || '—',
    '',
    s.photos.length
      ? `${s.photos.length} photo${s.photos.length > 1 ? 's' : ''} attached.`
      : 'No photos attached.',
  ];

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      /* onboarding@resend.dev is Resend's test sender — swapping to the real
         domain (with SPF/DKIM, plan §3b) is an env/staging concern, not code. */
      from: 'Limitless 3D quote form <onboarding@resend.dev>',
      to: [env.QUOTE_TO_EMAIL],
      reply_to: s.email,
      subject: `Quote request — ${s.name}${s.service ? ` (${s.service})` : ''}`,
      text: lines.join('\n'),
      attachments,
    }),
  });

  return { ok: res.ok, status: res.status, body: res.ok ? '' : await res.text() };
}

/** Workers have no Buffer; chunked to stay under argument-count limits. */
function base64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let bin = '';
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    bin += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(bin);
}
