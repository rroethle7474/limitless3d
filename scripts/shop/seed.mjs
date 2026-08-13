/**
 * One-off catalog seed: pushes scripts/shop/products.json (Randy's public
 * product data, extracted by extract.mjs — D-034) into a Square catalog via
 * the Catalog API. Built for Ryan's SANDBOX (§10 2026-08-11); pointing it at
 * production at cutover is the same script with different env values, and
 * doubles as the migration tool if Randy's real Square Catalog turns out to
 * be empty (his products live in the legacy Weebly commerce layer — D-034).
 *
 * Run:  node scripts/shop/seed.mjs            (add --dry-run to preview)
 *
 * Credentials come from .dev.vars (never the repo):
 *   SQUARE_ACCESS_TOKEN   — sandbox access token
 *   SQUARE_ENVIRONMENT    — "sandbox" | "production"
 *   SQUARE_LOCATION_ID    — checked against ListLocations, used by the build
 *
 * Idempotent, same discipline as studio/scripts/seed.ts, but Square assigns
 * object ids (no createOrReplace): existing items are matched BY EXACT NAME,
 * their ids + versions carried into the upsert; variations match by variation
 * name within the item. Re-running with no source changes is a no-op upsert.
 * Items that exist in Square but not in products.json are REPORTED, never
 * deleted. Images: skipped when the item already has >= the expected count
 * (uploads run in gallery order, so a partial failure resumes where it left
 * off); gallery order and the primary flag ride on upload order + is_primary.
 *
 * Modeling judgment calls (log rows in docs/design-decisions.md):
 *  - The 25 single-axis dropdowns (color / grate / item number; no price
 *    deltas) become one ITEM_VARIATION per choice, named after the choice —
 *    hosted checkout then shows "Product (Matte Black)" with no ITEM_OPTION
 *    machinery. Optionless products get Square's conventional "Regular".
 *  - Inventory counts and shipping rates are NOT seeded (demo scope; the
 *    checkout asks for a shipping address but charges no shipping fee).
 */

import { readFileSync, existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(HERE, '../..')
const DRY = process.argv.includes('--dry-run')

// ---- env (from .dev.vars, like the quote function's local runs) ------------
const env = { ...process.env }
const devVars = path.join(ROOT, '.dev.vars')
if (existsSync(devVars))
  for (const line of readFileSync(devVars, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*?)\s*$/)
    if (m && !(m[1] in env)) env[m[1]] = m[2]
  }
const TOKEN = env.SQUARE_ACCESS_TOKEN
const ENVIRONMENT = env.SQUARE_ENVIRONMENT ?? 'sandbox'
if (!TOKEN) throw new Error('SQUARE_ACCESS_TOKEN missing (expected in .dev.vars)')
if (ENVIRONMENT === 'production' && !process.argv.includes('--yes-production'))
  throw new Error('refusing production without --yes-production')

const BASE =
  ENVIRONMENT === 'production'
    ? 'https://connect.squareup.com'
    : 'https://connect.squareupsandbox.com'

async function sq(pathname, init = {}) {
  const res = await fetch(BASE + pathname, {
    ...init,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      ...(init.body && !(init.body instanceof FormData)
        ? { 'Content-Type': 'application/json' }
        : {}),
      ...init.headers,
    },
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok)
    throw new Error(
      `${init.method ?? 'GET'} ${pathname} → ${res.status}: ${JSON.stringify(body.errors ?? body).slice(0, 500)}`,
    )
  return body
}

// ---- source ----------------------------------------------------------------
const { products } = JSON.parse(
  readFileSync(path.join(HERE, 'products.json'), 'utf8'),
)
const IMG_DIR = path.join(HERE, 'images')
for (const p of products)
  for (const img of p.images)
    if (!existsSync(path.join(IMG_DIR, `p${p.id}_i${img.seq}.jpeg`)))
      throw new Error(
        `image cache incomplete (p${p.id}_i${img.seq}) — run: node scripts/shop/extract.mjs --images`,
      )

// ---- location check --------------------------------------------------------
const { locations = [] } = await sq('/v2/locations')
console.log(
  `${ENVIRONMENT}: ${locations.length} location(s):`,
  locations.map((l) => `${l.id} "${l.name}" ${l.status}`).join(' | '),
)
if (env.SQUARE_LOCATION_ID && !locations.some((l) => l.id === env.SQUARE_LOCATION_ID))
  throw new Error(`SQUARE_LOCATION_ID ${env.SQUARE_LOCATION_ID} not in this account`)

// ---- existing catalog ------------------------------------------------------
const existing = new Map() // name → ITEM object
let cursor
do {
  const page = await sq('/v2/catalog/list?types=ITEM' + (cursor ? `&cursor=${cursor}` : ''))
  for (const obj of page.objects ?? []) existing.set(obj.item_data.name, obj)
  cursor = page.cursor
} while (cursor)
console.log(`existing catalog items: ${existing.size}`)

// ---- build upsert batch ----------------------------------------------------
const variationNames = (p) => (p.option ? p.option.choices : ['Regular'])

const objects = []
let creates = 0,
  updates = 0
for (const p of products) {
  const prior = existing.get(p.name)
  const itemId = prior ? prior.id : `#l3d-item-${p.id}`
  const priorVars = new Map(
    (prior?.item_data.variations ?? []).map((v) => [v.item_variation_data.name, v]),
  )
  const variations = variationNames(p).map((name, i) => {
    const pv = priorVars.get(name)
    return {
      type: 'ITEM_VARIATION',
      id: pv ? pv.id : `#l3d-var-${p.id}-${i}`,
      ...(pv ? { version: pv.version } : {}),
      present_at_all_locations: true,
      item_variation_data: {
        item_id: itemId,
        name,
        ordinal: i,
        pricing_type: 'FIXED_PRICING',
        price_money: { amount: p.priceCents, currency: p.currency },
      },
    }
  })
  for (const [name] of priorVars)
    if (!variationNames(p).includes(name))
      console.log(`  NOTE #${p.id} "${p.name}": stale variation "${name}" left in place`)

  objects.push({
    type: 'ITEM',
    id: itemId,
    ...(prior ? { version: prior.version } : {}),
    present_at_all_locations: true,
    item_data: {
      name: p.name,
      description_html: p.descriptionHtml,
      variations,
    },
  })
  prior ? updates++ : creates++
  existing.delete(p.name)
}
for (const [name] of existing)
  console.log(`  NOTE not in products.json (left untouched): "${name}"`)
console.log(`upsert plan: ${creates} create, ${updates} update`)

if (DRY) {
  console.log('dry run — stopping before writes')
  process.exit(0)
}

const upsert = await sq('/v2/catalog/batch-upsert', {
  method: 'POST',
  body: JSON.stringify({
    idempotency_key: `l3d-seed-${Date.now()}`,
    batches: [{ objects }],
  }),
})
console.log(`upserted ${upsert.objects?.length ?? 0} objects`)

// ---- images ----------------------------------------------------------------
// Refetch so image_ids reflect reality (upsert response carries them too, but
// a fresh list keeps the resume logic honest after partial runs).
const itemsNow = new Map()
cursor = undefined
do {
  const page = await sq('/v2/catalog/list?types=ITEM' + (cursor ? `&cursor=${cursor}` : ''))
  for (const obj of page.objects ?? []) itemsNow.set(obj.item_data.name, obj)
  cursor = page.cursor
} while (cursor)

let uploaded = 0,
  skipped = 0
for (const p of products) {
  const item = itemsNow.get(p.name)
  if (!item) throw new Error(`post-upsert: "${p.name}" not found`)
  const have = item.item_data.image_ids?.length ?? 0
  if (have >= p.images.length) {
    skipped += p.images.length
    continue
  }
  for (const img of p.images.slice(have)) {
    const file = path.join(IMG_DIR, `p${p.id}_i${img.seq}.jpeg`)
    const form = new FormData()
    form.append(
      'request',
      JSON.stringify({
        idempotency_key: `l3d-img-${p.id}-${img.seq}`,
        object_id: item.id,
        image: {
          type: 'IMAGE',
          id: `#l3d-img-${p.id}-${img.seq}`,
          image_data: { name: `${p.slug} ${img.seq}`, is_primary: img.seq === 1 },
        },
      }),
    )
    form.append(
      'image_file',
      new Blob([readFileSync(file)], { type: 'image/jpeg' }),
      `p${p.id}_i${img.seq}.jpeg`,
    )
    await sq('/v2/catalog/images', { method: 'POST', body: form })
    uploaded++
    if (uploaded % 25 === 0) console.log(`  images: ${uploaded} uploaded…`)
  }
}
console.log(`images: ${uploaded} uploaded, ${skipped} already present`)

// ---- verify ----------------------------------------------------------------
const verify = []
cursor = undefined
do {
  const page = await sq('/v2/catalog/list?types=ITEM' + (cursor ? `&cursor=${cursor}` : ''))
  verify.push(...(page.objects ?? []))
  cursor = page.cursor
} while (cursor)
const byName = new Map(verify.map((o) => [o.item_data.name, o]))
let ok = 0
for (const p of products) {
  const item = byName.get(p.name)
  const vars = item?.item_data.variations ?? []
  const priceOk = vars.every(
    (v) => v.item_variation_data.price_money?.amount === p.priceCents,
  )
  const imgOk = (item?.item_data.image_ids?.length ?? 0) === p.images.length
  const varOk = vars.length === variationNames(p).length
  if (item && priceOk && imgOk && varOk) ok++
  else
    console.log(
      `  VERIFY FAIL #${p.id} "${p.name}": item=${!!item} price=${priceOk} imgs=${item?.item_data.image_ids?.length ?? 0}/${p.images.length} vars=${vars.length}/${variationNames(p).length}`,
    )
}
console.log(`verify: ${ok}/${products.length} items fully correct`)
