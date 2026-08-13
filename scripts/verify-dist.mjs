/**
 * Post-build integrity check: every `/_astro/...` asset referenced by any HTML
 * file in dist/ (src, srcset, href, url()) must exist on disk.
 *
 * Exists because an Astro remote-image cache revalidation failure once emitted
 * srcset URLs whose variant files were silently never written (D-038) — the
 * page shipped, Cloudflare Pages soft-404'd the missing variants as HTML, and
 * the hero rendered as alt text. Run after `npm run build`, before deploying:
 *
 *   node scripts/verify-dist.mjs
 */

import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const DIST = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../dist')

const htmlFiles = []
;(function walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = path.join(dir, name)
    if (statSync(p).isDirectory()) walk(p)
    else if (name.endsWith('.html')) htmlFiles.push(p)
  }
})(DIST)

const refs = new Map() // asset path → first referencing page
for (const file of htmlFiles) {
  const html = readFileSync(file, 'utf8')
  for (const m of html.matchAll(/\/_astro\/[^\s"'()?,]+/g)) {
    if (!refs.has(m[0])) refs.set(m[0], path.relative(DIST, file))
  }
}

let missing = 0
for (const [ref, page] of refs) {
  if (!existsSync(path.join(DIST, decodeURIComponent(ref)))) {
    console.error(`MISSING ${ref}  (referenced by ${page})`)
    missing++
  }
}

console.log(`${htmlFiles.length} pages, ${refs.size} unique /_astro refs, ${missing} missing`)
if (missing) process.exit(1)
