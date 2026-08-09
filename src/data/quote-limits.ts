/**
 * Photo-attachment limits for the quote form — imported by BOTH sides:
 * the client script (validate before sending, clear message instead of an opaque
 * API failure) and the Pages Function (enforce; never trust the client).
 *
 * The function imports this by relative path, not the `~/` alias — wrangler's
 * bundler resolves it independently of Astro.
 *
 * Budget math: Resend caps an email at 40 MB AFTER base64 encoding (×4/3).
 * 25 MB raw ≈ 33.4 MB encoded, leaving headroom for body + JSON overhead.
 */

export const MAX_PHOTOS = 5;
export const MAX_FILE_MB = 8;
export const MAX_TOTAL_MB = 25;

export const MB = 1024 * 1024;

/**
 * Returns a user-showable message when the selection breaks a limit, else null.
 * Lives here so the client warning and the server 400 use identical rules.
 */
export function photoLimitError(files: { name: string; size: number }[]): string | null {
  if (files.length > MAX_PHOTOS) {
    return `That's ${files.length} photos — the form can take up to ${MAX_PHOTOS}. The rest can go in a reply email.`;
  }
  for (const f of files) {
    if (f.size > MAX_FILE_MB * MB) {
      return `"${f.name}" is ${(f.size / MB).toFixed(1)} MB — each photo needs to be under ${MAX_FILE_MB} MB.`;
    }
  }
  const total = files.reduce((n, f) => n + f.size, 0);
  if (total > MAX_TOTAL_MB * MB) {
    return `Those photos add up to ${(total / MB).toFixed(1)} MB — the form can take about ${MAX_TOTAL_MB} MB total.`;
  }
  return null;
}
