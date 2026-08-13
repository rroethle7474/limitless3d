/**
 * Build-time catalog layer — the only file that talks to Square.
 *
 * Same contract as cms.ts (D-030): top-level await at build, fail-loud (§3b —
 * a broken fetch fails the build, and the previous deploy keeps serving), no
 * Square code in any client bundle. The site only ever READS the catalog and
 * renders it; commerce, inventory, and payments stay in whatever Square
 * account the credentials point at (D-002/D-024). Sandbox today; cutover to
 * Randy's production account is an env swap (plan §9.7 Path A).
 *
 * One deliberate write, ensure-semantics only: every sellable variation needs
 * a Square-hosted checkout link (CreatePaymentLink), and those are created
 * here the first time a build meets a variation without one. Steady-state
 * builds just list-and-match (link → order → variation, all derived from
 * Square state — no metadata side-channel). A new product added in the Square
 * Dashboard gets its link on the next build with no other steps.
 *
 * Credentials: process.env first (CI), then .dev.vars (local, wrangler's file
 * — the repo's one place for secrets). PUBLIC_ nothing: tokens stay server-side.
 */

import { existsSync, readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import path from 'node:path';

import editorialJson from './parts-editorial.json';

/* ---------------------------------------------------------------------------
 * Env + HTTP
 * ------------------------------------------------------------------------- */

const env: Record<string, string> = { ...(process.env as Record<string, string>) };
const devVars = path.resolve(process.cwd(), '.dev.vars');
if (existsSync(devVars)) {
  for (const line of readFileSync(devVars, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*?)\s*$/);
    if (m && !(m[1] in env && env[m[1]] !== '')) env[m[1]] = m[2];
  }
}

const TOKEN = env.SQUARE_ACCESS_TOKEN;
const LOCATION_ID = env.SQUARE_LOCATION_ID;
const ENVIRONMENT = env.SQUARE_ENVIRONMENT ?? 'sandbox';
if (!TOKEN || !LOCATION_ID) {
  throw new Error(
    '[square] SQUARE_ACCESS_TOKEN / SQUARE_LOCATION_ID missing (expected in .dev.vars or env) — refusing to build without the catalog.',
  );
}

const BASE =
  ENVIRONMENT === 'production'
    ? 'https://connect.squareup.com'
    : 'https://connect.squareupsandbox.com';

async function sq<T>(pathname: string, init?: RequestInit): Promise<T> {
  const res = await fetch(BASE + pathname, {
    ...init,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      // Pinned to match scripts/shop/seed.mjs — KEEP IN SYNC. An unpinned
      // request falls back to the account default, which can predate
      // description_html and silently omit it from responses.
      'Square-Version': '2025-01-23',
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
    },
  });
  const body = (await res.json().catch(() => ({}))) as T & { errors?: unknown };
  if (!res.ok) {
    throw new Error(
      `[square] ${init?.method ?? 'GET'} ${pathname} → ${res.status}: ${JSON.stringify(body.errors ?? body).slice(0, 400)}`,
    );
  }
  return body;
}

/* ---------------------------------------------------------------------------
 * Catalog fetch
 * ------------------------------------------------------------------------- */

interface CatalogObject {
  type: string;
  id: string;
  item_data?: {
    name: string;
    description_html?: string;
    image_ids?: string[];
    variations?: CatalogObject[];
  };
  item_variation_data?: { name: string; price_money?: { amount: number; currency: string } };
  image_data?: { url?: string };
}

async function listCatalog(types: string): Promise<CatalogObject[]> {
  const out: CatalogObject[] = [];
  let cursor: string | undefined;
  do {
    const page = await sq<{ objects?: CatalogObject[]; cursor?: string }>(
      `/v2/catalog/list?types=${types}` + (cursor ? `&cursor=${cursor}` : ''),
    );
    out.push(...(page.objects ?? []));
    cursor = page.cursor;
  } while (cursor);
  return out;
}

const [rawItems, rawImages] = await Promise.all([listCatalog('ITEM'), listCatalog('IMAGE')]);
const imageUrlById = new Map(rawImages.map((o) => [o.id, o.image_data?.url ?? '']));

/* ---------------------------------------------------------------------------
 * Checkout links (ensure-semantics; the one write)
 * ------------------------------------------------------------------------- */

interface PaymentLink {
  id: string;
  url: string;
  order_id: string;
}

async function listPaymentLinks(): Promise<PaymentLink[]> {
  const out: PaymentLink[] = [];
  let cursor: string | undefined;
  do {
    const page = await sq<{ payment_links?: PaymentLink[]; cursor?: string }>(
      '/v2/online-checkout/payment-links?limit=100' + (cursor ? `&cursor=${cursor}` : ''),
    );
    out.push(...(page.payment_links ?? []));
    cursor = page.cursor;
  } while (cursor);
  return out;
}

/** variation id → checkout URL, derived purely from Square state. */
async function mapLinksToVariations(links: PaymentLink[]): Promise<Map<string, string>> {
  const byVariation = new Map<string, string>();
  const linkByOrder = new Map(links.map((l) => [l.order_id, l]));
  const orderIds = [...linkByOrder.keys()];
  for (let i = 0; i < orderIds.length; i += 50) {
    const { orders = [] } = await sq<{
      orders?: { id: string; line_items?: { catalog_object_id?: string }[] }[];
    }>('/v2/orders/batch-retrieve', {
      method: 'POST',
      body: JSON.stringify({ location_id: LOCATION_ID, order_ids: orderIds.slice(i, i + 50) }),
    });
    for (const order of orders) {
      const variationId = order.line_items?.[0]?.catalog_object_id;
      const link = linkByOrder.get(order.id);
      if (variationId && link && !byVariation.has(variationId)) {
        byVariation.set(variationId, link.url);
      }
    }
  }
  return byVariation;
}

const buyUrlByVariation = await mapLinksToVariations(await listPaymentLinks());

async function ensureBuyUrl(variationId: string): Promise<string> {
  const have = buyUrlByVariation.get(variationId);
  if (have) return have;
  const { payment_link } = await sq<{ payment_link: PaymentLink }>(
    '/v2/online-checkout/payment-links',
    {
      method: 'POST',
      body: JSON.stringify({
        idempotency_key: randomUUID(),
        order: {
          location_id: LOCATION_ID,
          line_items: [{ quantity: '1', catalog_object_id: variationId }],
        },
        checkout_options: { ask_for_shipping_address: true },
      }),
    },
  );
  buyUrlByVariation.set(variationId, payment_link.url);
  return payment_link.url;
}

/* ---------------------------------------------------------------------------
 * Shaping
 * ------------------------------------------------------------------------- */

/**
 * Same rule as scripts/shop/extract.mjs — KEEP IN SYNC. Verified there to
 * reproduce all 61 prototype /parts/<slug> hrefs (D-034).
 */
function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[’']/g, '-')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** description_html → the pre-line text the PDP design renders (D-024). */
function htmlToText(html: string): string {
  return html
    .replace(/\s*(<br\s*\/?>|<\/p>|\n)+\s*/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#x?\w+;/g, (e) => {
      const code = e.startsWith('&#x') ? parseInt(e.slice(3, -1), 16) : parseInt(e.slice(2, -1), 10);
      return Number.isNaN(code) ? e : String.fromCodePoint(code);
    })
    .trim();
}

const editorial = editorialJson as Record<
  string,
  { machine: string; bucket: string; order: number }
>;
const normName = (s: string) => s.replace(/\s+/g, ' ').trim().toLowerCase();

export interface PartVariation {
  id: string;
  name: string;
  buyUrl: string;
}

export interface Part {
  name: string;
  slug: string;
  /** Editorial machine label (D-034); brand fallback for catalog items we don't know. */
  machine: string;
  /** Filter bucket key for the D-024 shopbar; unknown items land in "other". */
  bucket: string;
  price: string;
  priceCents: number;
  /** Rendered with white-space: pre-line, paragraph breaks preserved. */
  descText: string;
  metaDescription: string;
  /** Ordered gallery, Square-hosted originals — Astro re-hosts them at build. */
  images: string[];
  variations: PartVariation[];
}

const fmtPrice = (cents: number) =>
  (cents / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' });

const parts: (Part & { order: number })[] = [];
for (const item of rawItems) {
  const data = item.item_data;
  if (!data) continue;
  const ed = editorial[normName(data.name)];
  const variations: PartVariation[] = [];
  for (const v of data.variations ?? []) {
    if (!v.item_variation_data?.price_money) continue;
    variations.push({
      id: v.id,
      name: v.item_variation_data.name,
      buyUrl: await ensureBuyUrl(v.id),
    });
  }
  if (variations.length === 0) continue; // nothing sellable, nothing to render
  const priceCents = data.variations?.[0]?.item_variation_data?.price_money?.amount ?? 0;
  const descText = htmlToText(data.description_html ?? '');
  const images = (data.image_ids ?? [])
    .map((id) => imageUrlById.get(id) ?? '')
    .filter(Boolean);
  if (images.length === 0) {
    throw new Error(`[square] "${data.name}" has no images — refusing to render a blank card.`);
  }
  parts.push({
    name: data.name,
    slug: slugify(data.name),
    machine: ed?.machine ?? 'Limitless 3D',
    bucket: ed?.bucket ?? 'other',
    order: ed?.order ?? Number.MAX_SAFE_INTEGER,
    price: fmtPrice(priceCents),
    priceCents,
    descText,
    metaDescription: descText.replace(/\s+/g, ' ').slice(0, 155).trim(),
    images,
    variations,
  });
}

parts.sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));

const slugSet = new Set(parts.map((p) => p.slug));
if (slugSet.size !== parts.length) {
  throw new Error('[square] slug collision between catalog items — refusing to build.');
}
if (parts.length === 0) throw new Error('[square] catalog came back empty — refusing to build.');

/** Every sellable catalog item, D-024 grid order. */
export const PARTS: Part[] = parts;

/** Related parts for a PDP: same machine first, then same bucket, grid order. */
export function relatedParts(part: Part, count = 4): Part[] {
  const others = PARTS.filter((p) => p.slug !== part.slug);
  const same = others.filter((p) => p.machine === part.machine);
  const near = others.filter((p) => p.machine !== part.machine && p.bucket === part.bucket);
  return [...same, ...near].slice(0, count);
}

console.log(
  `[square] ${ENVIRONMENT}: ${PARTS.length} parts, ${buyUrlByVariation.size} checkout links ready`,
);
