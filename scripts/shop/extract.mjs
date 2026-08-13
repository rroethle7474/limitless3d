/**
 * One-off product-inventory extraction for the Square catalog demo (plan §10
 * 2026-08-11: sandbox seeded with Randy's public product data).
 *
 * Sources, merged by product number (the `_p<N>_` in every image filename ==
 * the live site's `site_product_id` == the trailing id in /product/<slug>/<id>):
 *
 *  1. Randy's live Square Online storefront API (public, no auth) — the same
 *     endpoint his own shop's product pages fetch:
 *       https://cdn5.editmysite.com/app/store/api/v28/editor/users/{USER}/sites/{SITE}
 *         /store-locations/{LOCATION}/products?include=images,options,...
 *     Canonical for: name, description HTML, price, options, full image
 *     galleries, inventory badges. All copy is VERBATIM from here.
 *  2. docs/prototype-snapshot/shop.html (D-024) — the approved design's
 *     editorial layer: machine label, filter bucket (data-cats), grid order.
 *
 * Outputs:
 *   scripts/shop/products.json      — committed seed inventory (verbatim)
 *   src/data/parts-editorial.json   — machine/bucket by normalized name (the
 *                                     only shop data that must survive the
 *                                     cutover credential swap, so it keys on
 *                                     product name, not any sandbox id)
 *   scripts/shop/images/p<id>_i<n>.jpeg — with --images: gallery downloads at
 *                                     width<=1600 (gitignored; re-runnable, so
 *                                     the repo carries URLs, not binaries)
 *
 * Idempotent: pure fetch + derive, same discipline as studio/scripts/seed.ts.
 * Verifies as it goes (count parity, name/price parity, slug uniqueness and
 * slug==slugify(name)) and prints every discrepancy rather than papering over.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(HERE, '../..')

const USER = '140396716'
const SITE = '666696764460511456'
const LOCATION = '11ec716becf977e0aba0f65a59b838f8'
const API =
  `https://cdn5.editmysite.com/app/store/api/v28/editor/users/${USER}/sites/${SITE}` +
  `/store-locations/${LOCATION}/products?page=1&per_page=100` +
  `&include=images,options,modifiers,category,media_files`

/** Same rule the site build will use: slug is a pure function of the name. */
export function slugify(name) {
  return name
    .toLowerCase()
    .replace(/[’']/g, '-')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

const decode = (s) =>
  s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')

const normName = (s) => decode(s).replace(/\s+/g, ' ').trim()

// ---- 1. snapshot editorial layer -------------------------------------------
const snapshot = readFileSync(
  path.join(ROOT, 'docs/prototype-snapshot/shop.html'),
  'utf8',
)
const cardRe =
  /<a class="pcard reveal" href="\/parts\/([^"]+)" data-cats="([^"]+)">([\s\S]*?)<\/a>/g
const cards = []
for (const m of snapshot.matchAll(cardRe)) {
  const [, protoSlug, bucket, body] = m
  const img = body.match(/_p(\d+)_i1_w\d+/)
  const machine = body.match(/<div class="machine">([^<]+)<\/div>/)
  const h3 = body.match(/<h3>([^<]+)<\/h3>/)
  const price = body.match(/<div class="price">\$([\d.]+)<\/div>/)
  cards.push({
    id: Number(img[1]),
    protoSlug,
    bucket,
    machine: normName(machine[1]),
    name: normName(h3[1]),
    priceCents: Math.round(Number(price[1]) * 100),
    order: cards.length,
  })
}
console.log(`snapshot: ${cards.length} product cards`)

// ---- 2. live storefront API ------------------------------------------------
const res = await fetch(API)
if (!res.ok) throw new Error(`storefront API ${res.status}`)
const api = (await res.json()).data
console.log(`live API: ${api.length} products`)

// ---- 3. join + verify ------------------------------------------------------
const problems = []
const byId = new Map(api.map((p) => [Number(p.site_product_id), p]))
const products = []

for (const card of cards) {
  const live = byId.get(card.id)
  if (!live) {
    problems.push(`#${card.id} "${card.name}" in snapshot but not in live API`)
    continue
  }
  byId.delete(card.id)

  const name = normName(live.name)
  if (name !== card.name)
    problems.push(`#${card.id} name drift:\n  live: ${name}\n  snap: ${card.name}`)
  if (live.price.low_subunits !== card.priceCents)
    problems.push(
      `#${card.id} price drift: live ${live.price.low_subunits}¢ vs snapshot ${card.priceCents}¢`,
    )
  if (live.price.low_subunits !== live.price.high_subunits)
    problems.push(`#${card.id} has a price range — seed assumes one price`)

  const slug = slugify(name)
  const protoNorm = card.protoSlug.replace(/-+$/, '')
  if (slug !== protoNorm)
    problems.push(`#${card.id} slug drift: derived "${slug}" vs prototype "${protoNorm}"`)

  const options = (live.options.data ?? []).map((o) => ({
    name: o.name,
    choices: o.choice_order,
  }))
  if (options.length > 1)
    problems.push(`#${card.id} has ${options.length} option axes — seed assumes <=1`)

  products.push({
    id: card.id,
    name: live.name,
    slug,
    machine: card.machine,
    bucket: card.bucket,
    order: card.order,
    priceCents: live.price.low_subunits,
    currency: 'USD',
    descriptionHtml: live.short_description,
    option: options[0] ?? null,
    images: (live.images.data ?? []).map((i, n) => ({
      seq: n + 1,
      url: i.absolute_url.split('?')[0],
    })),
    inventory: {
      total: live.inventory.total,
      lowStock: live.badges.low_stock,
      outOfStock: live.badges.out_of_stock,
    },
    sourceUrl: live.absolute_site_link,
  })
}
for (const orphan of byId.values())
  problems.push(`#${orphan.site_product_id} "${orphan.name}" live but not in snapshot`)

const slugs = new Set(products.map((p) => p.slug))
if (slugs.size !== products.length) problems.push('slug collision!')

// ---- 4. write --------------------------------------------------------------
products.sort((a, b) => a.order - b.order)
writeFileSync(
  path.join(HERE, 'products.json'),
  JSON.stringify(
    { extractedAt: new Date().toISOString(), source: API, products },
    null,
    2,
  ),
)

const editorial = {}
for (const p of products)
  editorial[normName(p.name).toLowerCase()] = { machine: p.machine, bucket: p.bucket, order: p.order }
writeFileSync(
  path.join(ROOT, 'src/data/parts-editorial.json'),
  JSON.stringify(editorial, null, 2),
)

console.log(`wrote ${products.length} products; ${products.filter((p) => p.option).length} with an option axis; ${products.reduce((a, p) => a + p.images.length, 0)} images`)
if (problems.length) {
  console.log(`\n${problems.length} discrepancies:`)
  for (const p of problems) console.log('  - ' + p)
} else console.log('no discrepancies')

// ---- 5. optional image download -------------------------------------------
if (process.argv.includes('--images')) {
  const dir = path.join(HERE, 'images')
  mkdirSync(dir, { recursive: true })
  let got = 0,
    skipped = 0
  for (const p of products)
    for (const img of p.images) {
      const file = path.join(dir, `p${p.id}_i${img.seq}.jpeg`)
      if (existsSync(file)) {
        skipped++
        continue
      }
      const r = await fetch(`${img.url}?width=1600`)
      if (!r.ok) throw new Error(`image ${p.id}/${img.seq}: ${r.status}`)
      writeFileSync(file, Buffer.from(await r.arrayBuffer()))
      got++
    }
  console.log(`images: ${got} downloaded, ${skipped} already cached`)
}
