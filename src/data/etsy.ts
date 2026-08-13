/**
 * Build-time reviews layer — the only file that talks to Etsy.
 *
 * Same contract as cms.ts / square.ts (D-030/D-036): top-level await at
 * build, fail-loud (§3b — a broken fetch fails the build, and the previous
 * deploy keeps serving; stale, never down), no Etsy code in any client
 * bundle.
 *
 * Modes (ETSY_SOURCE): "live" reads the Open API v3 with the key from
 * .dev.vars/env; "fixture" reads ./etsy-fixture.json — real reviews recorded
 * VERBATIM from the public shop page on 2026-08-12 while the API key sits in
 * Etsy's manual approval queue (plan §10 2026-08-12 verification row).
 * Fixture mode is an explicit opt-in and warns loudly at every build; there
 * is no silent fallback in either direction.
 *
 * Aggregate honesty (FTC framing, plan §10 2026-08-09): the featured strip
 * is a 5★-filtered pool, so the truthful aggregate — Etsy's own maintained
 * average plus the full review count — always ships alongside it. The public
 * shop page labels its average "Average item review" and computes it
 * recency-weighted, so we surface Etsy's number (Shop.review_average) rather
 * than a self-computed mean that could disagree with — or overstate — what a
 * visitor sees when they click through. (Confirmed at the live flip
 * 2026-08-13: review_average 4.84 renders "4.8", matching the page; the
 * conservative floor-mean fallback below only fires if Etsy serves null.)
 *
 * Display freshness: Etsy's API Terms cap displayed non-listing content at
 * 24h stale — the CI session owes a DAILY scheduled rebuild (plan §10).
 */

import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { QUOTE_BAND, REVIEWS } from './cms';
// Static import so the fixture travels with the bundled module — an
// import.meta.url-relative fs read breaks after Astro bundles this file
// into dist/chunks/. Server-side only; never reaches a client bundle.
import fixtureJson from './etsy-fixture.json';

/* ---------------------------------------------------------------------------
 * Env (square.ts pattern: process.env first for CI, then .dev.vars locally)
 * ------------------------------------------------------------------------- */

const env: Record<string, string> = { ...(process.env as Record<string, string>) };
const devVars = path.resolve(process.cwd(), '.dev.vars');
if (existsSync(devVars)) {
  for (const line of readFileSync(devVars, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*?)\s*$/);
    if (m && !(m[1] in env && env[m[1]] !== '')) env[m[1]] = m[2];
  }
}

const SOURCE = env.ETSY_SOURCE ?? 'live';
if (SOURCE !== 'live' && SOURCE !== 'fixture') {
  throw new Error(`[etsy] ETSY_SOURCE must be "live" or "fixture", got "${SOURCE}".`);
}

/* ---------------------------------------------------------------------------
 * Raw shapes (subset of Etsy Open API v3 getShop / getReviewsByShop)
 * ------------------------------------------------------------------------- */

interface EtsyShop {
  shop_id: number;
  shop_name: string;
  url: string;
  /** Lifetime sales — unlike review_count/review_average, which are past-year. */
  transaction_sold_count: number;
  review_average: number | null;
  review_count: number | null;
}

interface EtsyReview {
  rating: number;
  review: string | null;
  language?: string;
  create_timestamp: number;
}

interface EtsyReviewsPage {
  count: number;
  results: EtsyReview[];
}

let shop: EtsyShop;
let reviewsTotal: number;
let allReviews: EtsyReview[];

if (SOURCE === 'fixture') {
  console.warn(
    '[etsy] FIXTURE MODE — serving reviews recorded from the public shop page on ' +
      '2026-08-12. Flip ETSY_SOURCE=live once the API key clears approval.',
  );
  const fixture = fixtureJson as unknown as { shop: EtsyShop; reviews: EtsyReviewsPage };
  shop = fixture.shop;
  reviewsTotal = fixture.reviews.count;
  allReviews = fixture.reviews.results;
} else {
  const KEY = env.ETSY_API_KEY;
  const SECRET = env.ETSY_SHARED_SECRET;
  const SHOP_ID = env.ETSY_SHOP_ID;
  if (!KEY || !SECRET || !SHOP_ID) {
    throw new Error(
      '[etsy] ETSY_API_KEY / ETSY_SHARED_SECRET / ETSY_SHOP_ID missing (expected in ' +
        '.dev.vars or env) — refusing to build without them. (Without an approved key, ' +
        'set ETSY_SOURCE=fixture.)',
    );
  }

  const API = 'https://openapi.etsy.com/v3/application';
  // Header format settled empirically at the live flip (2026-08-13): Etsy
  // enforces the spec's "keystring:shared_secret" — keystring alone 403s with
  // "Shared secret is required in x-api-key header."
  const etsyGet = async <T>(pathname: string): Promise<T> => {
    const res = await fetch(API + pathname, { headers: { 'x-api-key': `${KEY}:${SECRET}` } });
    const body = (await res.json().catch(() => ({}))) as T & { error?: string };
    if (!res.ok) {
      throw new Error(`[etsy] GET ${pathname} → ${res.status}: ${body.error ?? JSON.stringify(body).slice(0, 300)}`);
    }
    return body;
  };

  shop = await etsyGet<EtsyShop>(`/shops/${SHOP_ID}`);
  if (shop.shop_name !== 'Limitless3DDesign') {
    throw new Error(
      `[etsy] shop ${SHOP_ID} resolved to "${shop.shop_name}", expected "Limitless3DDesign" — wrong ETSY_SHOP_ID.`,
    );
  }

  // Page the FULL review set (100/page; ~6 requests at 576 reviews). The
  // total drives the count stat, and the whole set feeds the featured pool.
  allReviews = [];
  const first = await etsyGet<EtsyReviewsPage>(`/shops/${SHOP_ID}/reviews?limit=100&offset=0`);
  reviewsTotal = first.count;
  allReviews.push(...first.results);
  for (let offset = 100; offset < reviewsTotal && offset < 2000; offset += 100) {
    const page = await etsyGet<EtsyReviewsPage>(`/shops/${SHOP_ID}/reviews?limit=100&offset=${offset}`);
    if (page.results.length === 0) break;
    allReviews.push(...page.results);
  }
}

if (reviewsTotal <= 0 || allReviews.length === 0) {
  throw new Error('[etsy] no reviews returned — refusing to build with an empty reviews section.');
}

/* ---------------------------------------------------------------------------
 * Aggregate (the truthful numbers, always displayed beside the 5★ pool)
 * ------------------------------------------------------------------------- */

/** Etsy's maintained average; conservative floored mean only if Etsy sends null. */
const rating =
  shop.review_average ??
  Math.floor((allReviews.reduce((s, r) => s + r.rating, 0) / allReviews.length) * 10) / 10;
if (!(rating >= 1 && rating <= 5)) {
  throw new Error(`[etsy] implausible review average ${rating} — refusing to build.`);
}

export const ETSY_AGGREGATE = {
  rating,
  reviewsTotal,
  ordersTotal: shop.transaction_sold_count,
  shopUrl: shop.url,
} as const;

/**
 * Proof-bar values by stat key (the Sanity singleton's row keys). Rounded
 * DOWN into the prototype's "N+" vocabulary so the bar never overstates:
 * 576 → "500+", 3,533 → "3,500+". The "star" row (Star Seller) has no API
 * source and stays owner-edited in Sanity.
 */
export const ETSY_STAT_VALUES: Record<'rating' | 'reviews' | 'orders', string> = {
  rating: `★ ${rating.toFixed(1)}`,
  reviews: reviewsTotal >= 100 ? `${Math.floor(reviewsTotal / 100) * 100}+` : `${reviewsTotal}`,
  orders:
    shop.transaction_sold_count >= 500
      ? `${(Math.floor(shop.transaction_sold_count / 500) * 500).toLocaleString('en-US')}+`
      : `${shop.transaction_sold_count}`,
};

/* ---------------------------------------------------------------------------
 * Featured pool — recent 5★ reviews, verbatim, sized to fit an rcard
 * ------------------------------------------------------------------------- */

/** Selection rules (decision row, session 8; dedupe added at the live flip):
 * 5★ · has text · 40–340 chars (never truncate: a review either fits the card
 * whole or isn't featured) · English · not a duplicate of an owner-curated
 * Sanity testimonial · deduped within the pool (buyers who order two items
 * paste the same text on each — the live API really does this; newest kept) ·
 * newest first · top 4. */
const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
const curated = [QUOTE_BAND, ...REVIEWS].map((t) => normalize(t.quote));
const isCurated = (text: string) => {
  const n = normalize(text);
  return curated.some((c) => c.includes(n) || n.includes(c));
};

export interface EtsyRecentReview {
  /** Verbatim review text (fits the card whole — never truncated). */
  text: string;
  /** e.g. "July 2026" — no day, no name; the API exposes no display names. */
  when: string;
}

export const ETSY_RECENT: EtsyRecentReview[] = allReviews
  .filter(
    (r): r is EtsyReview & { review: string } =>
      r.rating === 5 &&
      typeof r.review === 'string' &&
      r.review.length >= 40 &&
      r.review.length <= 340 &&
      (!r.language || r.language.toLowerCase().startsWith('en')) &&
      !isCurated(r.review),
  )
  .sort((a, b) => b.create_timestamp - a.create_timestamp)
  .filter(
    (() => {
      const seen = new Set<string>();
      return (r: EtsyReview & { review: string }) => {
        const n = normalize(r.review);
        if (seen.has(n)) return false;
        seen.add(n);
        return true;
      };
    })(),
  )
  .slice(0, 4)
  .map((r) => ({
    text: r.review,
    when: new Date(r.create_timestamp * 1000).toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    }),
  }));

if (ETSY_RECENT.length === 0) {
  throw new Error('[etsy] featured pool is empty — refusing to build an empty reviews strip.');
}

/* ---------------------------------------------------------------------------
 * Required attribution (Etsy API Terms; exact text, do not edit)
 * ------------------------------------------------------------------------- */

export const ETSY_ATTRIBUTION =
  "The term 'Etsy' is a trademark of Etsy, Inc. This Application uses Etsy's API, but is not endorsed or certified by Etsy.";
