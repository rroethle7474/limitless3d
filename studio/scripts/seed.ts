/**
 * One-off content seed: migrates the hardcoded Phase 1a content into Sanity.
 *
 * Run from the studio directory (cwd matters for image paths):
 *
 *   npx sanity exec scripts/seed.ts --with-user-token
 *
 * Auth comes from the CLI login — no token to manage. Idempotent: documents use
 * stable _ids and createOrReplace; re-uploading an unchanged image returns the
 * same content-addressed asset.
 *
 * Copy is VERBATIM from the source files (src/data/showcase.ts,
 * src/pages/gallery.astro, src/pages/reviews.astro, src/components/
 * Testimonial.astro, src/data/site.ts, and the three service pages) — the
 * dist-diff in the wiring step verifies it survived. The script cannot import
 * those files directly: they import images through Vite's `~` alias and asset
 * pipeline, which `sanity exec`'s bundler cannot resolve.
 *
 * The one deliberate normalization (decision row pending): testimonial quotes
 * are stored WITHOUT surrounding “ ” marks — the templates add them.
 */

import {createReadStream} from 'node:fs'
import path from 'node:path'

import {getCliClient} from 'sanity/cli'

const client = getCliClient({apiVersion: '2026-08-01'})

const WORK_DIR = path.resolve(process.cwd(), '../src/assets/work')

/** The ten workshop photos. Key = filename stem, used in doc references below. */
const IMAGES = [
  'pond-nozzle',
  'nozzle-cad',
  'ski-boot',
  'custom-divider',
  'heirloom',
  'rc-cars',
  'display-stand',
  'workshop-01',
  'workshop-02',
  'pond-nozzle-2',
] as const

type ImageKey = (typeof IMAGES)[number]

/** Minimal portable-text builders — enough for paragraphs with bold runs. */
type Span = {_type: 'span'; _key: string; text: string; marks: string[]}
const span = (key: string, text: string, marks: string[] = []): Span => ({
  _type: 'span',
  _key: key,
  text,
  marks,
})
const block = (key: string, children: Span[]) => ({
  _type: 'block' as const,
  _key: key,
  style: 'normal' as const,
  markDefs: [] as never[],
  children,
})
/** A plain paragraph. */
const p = (key: string, text: string) => block(key, [span(`${key}s0`, text)])

const imageRef = (assetId: string, alt: string) => ({
  _type: 'image' as const,
  asset: {_type: 'reference' as const, _ref: assetId},
  alt,
})

async function main() {
  console.log(`Uploading ${IMAGES.length} images from ${WORK_DIR} …`)
  const assetIds = {} as Record<ImageKey, string>
  for (const key of IMAGES) {
    const file = path.join(WORK_DIR, `${key}.jpg`)
    const asset = await client.assets.upload('image', createReadStream(file), {
      filename: `${key}.jpg`,
    })
    assetIds[key] = asset._id
    console.log(`  ${key}.jpg → ${asset._id}`)
  }

  const img = (key: ImageKey, alt: string) => imageRef(assetIds[key], alt)

  /* ---- gallery entries (src/data/showcase.ts + gallery.astro extras) ---- */

  const gallery = [
    // The homepage six (featured), in showcase.ts order.
    {key: 'pond-nozzle', kicker: 'COMMERCIAL COMMISSION', title: 'Pond fountain nozzles', sub: 'DESIGNED FOR WI PONDWORKS', alt: 'Custom 3D printed pond fountain nozzles', featured: true},
    {key: 'nozzle-cad', kicker: 'THE DESIGN FILE', title: 'The model behind it', sub: 'REVERSE ENGINEERED IN CAD', alt: 'CAD model of the fountain nozzle, reverse engineered from a scan', featured: true},
    {key: 'ski-boot', kicker: 'REPAIR', title: 'Ski boot repair', sub: 'BACK ON THE MOUNTAIN', alt: 'A 3D printed replacement part repairing a ski boot', featured: true},
    {key: 'custom-divider', kicker: 'HOME SOLUTION', title: 'Custom drawer storage', sub: 'BUILT TO FIT EXACTLY', alt: 'Custom 3D printed drawer dividers built to fit exactly', featured: true},
    {key: 'heirloom', kicker: 'RESTORATION', title: 'Antique concertina', sub: 'PARTS MADE TO MATCH', alt: 'An antique concertina restored with 3D printed matching parts', featured: true},
    {key: 'rc-cars', kicker: 'HOBBY', title: 'Hobby RC builds', sub: 'BODIES AND PARTS', alt: '3D printed bodies and parts for hobby RC cars', featured: true},
    // The gallery-page four.
    {key: 'display-stand', kicker: 'PROTOTYPE', title: 'Display stand', sub: 'FROM DRAWING TO PART', alt: 'A black printed display stand resting on the dimensioned drawing it was made from', featured: false},
    {key: 'workshop-01', kicker: 'RESIN DETAIL', title: 'Sculpted figure', sub: 'PRINTED IN RESIN', alt: 'A classical figure sculpture printed in white resin, down to the folds of the dress', featured: false},
    {key: 'workshop-02', kicker: 'RESIN DETAIL', title: 'Textured vase', sub: 'FINE LAYER FINISH', alt: 'A translucent printed vase covered in a finely ridged, woven surface texture', featured: false},
    {key: 'pond-nozzle-2', kicker: 'ENGINEERED PART', title: 'Nozzle underside', sub: 'FUNCTION FIRST', alt: 'The threaded underside of the fountain nozzle, with its orange O-ring seated in the groove', featured: false},
  ].map((e, i) => ({
    _id: `galleryEntry-${e.key}`,
    _type: 'galleryEntry',
    title: e.title,
    kicker: e.kicker,
    sub: e.sub,
    photo: img(e.key as ImageKey, e.alt),
    featured: e.featured,
    order: (i + 1) * 10,
  }))

  /* ---- testimonials (Testimonial.astro + reviews.astro) ---- */

  const testimonials = [
    {
      _id: 'testimonial-quoteband',
      _type: 'testimonial',
      quote: 'Randy was incredible to work with. Fair pricing, and you can tell he loves what he does.',
      highlight: 'you can tell he loves what he does.',
      attribution: 'Verified customer · fountain nozzle project',
      quoteBand: true,
      order: 0,
    },
    {
      _id: 'testimonial-review-nozzle',
      _type: 'testimonial',
      quote:
        'Randy was incredible to work with. He is very easy to work with, has fair pricing, and you can tell he loves what he does. I would recommend him to absolutely anyone.',
      attribution: 'Verified customer · fountain nozzle design',
      quoteBand: false,
      order: 10,
    },
    {
      _id: 'testimonial-review-etsy',
      _type: 'testimonial',
      quote:
        'Dispatched on time, tracking every step, and questions answered fast. That is what Etsy Star Seller status is measured on, and it is held across more than 500 reviews.',
      attribution: 'Etsy shop record · four years selling',
      source: 'Etsy',
      quoteBand: false,
      order: 20,
    },
  ]

  /* ---- singletons (src/data/site.ts) ---- */

  const siteStats = {
    _id: 'siteStats',
    _type: 'siteStats',
    stats: [
      {_key: 'rating', value: '★ 4.8', label: 'Average rating'},
      {_key: 'reviews', value: '500+', label: 'Customer reviews'},
      {_key: 'orders', value: '3,000+', label: 'Orders shipped'},
      {_key: 'star', value: 'Star Seller', label: 'Etsy recognition'},
    ],
  }

  const businessInfo = {
    _id: 'businessInfo',
    _type: 'businessInfo',
    phone: '920-360-7543',
    email: 'limitless3ddesign@gmail.com',
    areaServed: ['Neenah', 'Appleton', 'Oshkosh', 'Menasha'],
    areaServedState: 'Wisconsin',
  }

  /* ---- service pages (the three src/pages/3d-*.astro) ---- */

  const servicePages = [
    {
      _id: 'servicePage-scanning',
      _type: 'servicePage',
      service: 'scanning',
      lead: 'Our newest scanning system gives metrology grade accuracy without markers and without scanning spray. If it exists, we can turn it into a file you can use.',
      heroImage: img('pond-nozzle-2', 'Close view of a 3D printed fountain nozzle'),
      splits: [
        {
          _type: 'split',
          _key: 'metrology',
          kicker: 'Metrology grade',
          heading: 'Accurate scans, not just pretty ones',
          image: img('heirloom', 'Antique concertina, a delicate object suited to marker free scanning'),
          body: [
            block('sc1p1', [
              span('sc1p1s0', 'Plenty of scanners produce something that looks right. We measure. Our system holds dimensional accuracy to '),
              span('sc1p1s1', '0.02 mm', ['strong']),
              span('sc1p1s2', ' in every axis, which is the difference between a picture of your part and a file you can build from.'),
            ]),
            p('sc1p2', 'The newest addition to the workshop is a self tracking scanner, so there are no stickers, no markers, and no chalky spray on the object we are capturing. That matters when the thing in your hands is old, delicate, or the only one left.'),
            p('sc1p3', 'Rates are competitive, and the deliverables are ones you can hand to an engineer with confidence.'),
          ],
        },
        {
          _type: 'split',
          _key: 'hardones',
          kicker: 'The hard ones',
          heading: 'Some jobs take a steady hand',
          image: img('workshop-01', 'Finely detailed resin print of a sculpted figure'),
          body: [
            p('sc2p1', 'Scanning a rare piece is rarely one and done. A turn of the century street lamp we digitized took multiple detailed sessions, a steady hand, and a fair amount of determination before the data was clean enough to build from.'),
            p('sc2p2', 'That is the part most people do not see, and it is exactly why the file you get back is worth having. Complex geometry, deep recesses, and reflective surfaces all get handled rather than glossed over.'),
          ],
        },
      ],
    },
    {
      _id: 'servicePage-design',
      _type: 'servicePage',
      service: 'design',
      lead: 'Twenty-five years of professional design work for civil and mechanical engineering firms, now pointed at your project. If you have an idea, we can do the heavy lifting.',
      heroImage: img('display-stand', 'A 3D printed display stand resting on its engineering drawing'),
      splits: [
        {
          _type: 'split',
          _key: 'howwework',
          kicker: 'How we work',
          heading: 'Details, details, details',
          image: img('nozzle-cad', 'CAD model of a pond fountain nozzle'),
          body: [
            p('de1p1', 'Twenty-five years in the consulting engineering world means hundreds of detailed plans for civil and mechanical firms, and the habits that come with them. Those habits are the reason your part fits the first time.'),
            block('de1p2', [
              span('de1p2s0', 'Every project that comes through the door gets treated like one of our own, on the old rule of '),
              span('de1p2s1', 'measure twice, cut once', ['strong']),
              span('de1p2s2', '. Getting it right on the screen is far cheaper than getting it wrong in material.'),
            ]),
          ],
        },
        {
          _type: 'split',
          _key: 'tools',
          kicker: 'Cutting edge tools',
          heading: 'The software has kept up. So have we.',
          image: img('pond-nozzle', 'Finished 3D printed pond fountain nozzle'),
          body: [
            p('de2p1', 'Autodesk tools have changed a lot over twenty-five years, and we have used most versions along the way. That means modern modeling when a project calls for it, and none of the guesswork when a drawing has to be read by somebody else.'),
            p('de2p2', 'Bring a sketch on paper, a photo, a broken original, or a description you have been carrying around for years. Any of those is a starting point.'),
          ],
        },
      ],
    },
    {
      _id: 'servicePage-printing',
      _type: 'servicePage',
      service: 'printing',
      lead: 'We are in the Fox Valley, so service is fast and local. Pick the material, the color, the texture, and the strength, and we will make the thing.',
      heroImage: img('workshop-02', 'Translucent resin printed vase with fine layer detail'),
      splits: [
        {
          _type: 'split',
          _key: 'printmyfile',
          kicker: 'Print my file',
          heading: 'Already have a file? Send it over.',
          image: img('rc-cars', 'Two 3D printed RC car bodies, one black and one clear'),
          body: [
            p('pr1p1', 'There are plenty of good print files out there, and Thingiverse alone has more than most people could work through in a lifetime. Find one you want in your hands and send it our way.'),
            p('pr1p2', 'With the design work already done, printing is billed at a reasonable hourly rate, so this is the cheapest way to get something made properly. We will still check the file over and tell you if it needs a tweak before it prints well.'),
            p('pr1p3', 'No file and no idea where to start? That happens more often, and it is what the design side of the shop is for.'),
          ],
        },
      ],
    },
  ]

  type SeedDoc = {_id: string; _type: string} & Record<string, unknown>
  const docs: SeedDoc[] = [...gallery, ...testimonials, siteStats, businessInfo, ...servicePages]

  console.log(`Writing ${docs.length} documents …`)
  let tx = client.transaction()
  for (const doc of docs) tx = tx.createOrReplace(doc)
  await tx.commit()

  console.log('Done. Open the studio and check: 10 gallery entries, 3 testimonials, 2 singletons, 3 service pages.')
}

main().catch((err) => {
  console.error('Seed failed:', err)
  process.exit(1)
})
