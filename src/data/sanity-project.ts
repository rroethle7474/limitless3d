/**
 * Sanity project coordinates — NOT secrets. The dataset is public: site content
 * is world-readable by design, and quote submissions stay token-gated because
 * they exist only as `drafts.`-prefixed documents (the dot-in-_id rule; see
 * functions/api/quote.ts and D-027's closure row).
 *
 * Imported by the build-time fetch layer (src/data/cms.ts) and relative-imported
 * by the Pages Function, the same pattern as quote-limits.ts. The studio keeps
 * its own copy in studio/sanity.config.ts — keep them in sync if they change.
 *
 * The write token (function only) is env: SANITY_API_TOKEN in .dev.vars / Pages.
 */

// TODO(session-5): filled in right after the project is created.
export const SANITY_PROJECT_ID = 'REPLACE_WITH_PROJECT_ID';
export const SANITY_DATASET = 'production';
export const SANITY_API_VERSION = '2026-08-01';
