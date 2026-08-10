/**
 * Build-time content layer — the only file that talks to Sanity.
 *
 * Runs at build (and dev-server start) via top-level await; no Sanity code ever
 * reaches the browser. Client scripts must not import this module — the one
 * that needed business facts (quote-form.ts) reads them from the DOM instead.
 *
 * Fail-loud by design (plan §3b): if Sanity is unreachable or a document is
 * missing, the BUILD fails — a failed build never deploys, so the previous
 * deploy keeps serving. Stale, never down.
 *
 * No token: the dataset is public and this reads only published documents.
 * `useCdn: false` so a rebuild always sees the latest publish, not an edge
 * cache; a full build is a handful of queries.
 */

import { toHTML } from '@portabletext/to-html';
import type { PortableTextBlock } from '@portabletext/types';
import { createClient } from '@sanity/client';

import { SANITY_API_VERSION, SANITY_DATASET, SANITY_PROJECT_ID } from './sanity-project';

const client = createClient({
  projectId: SANITY_PROJECT_ID,
  dataset: SANITY_DATASET,
  apiVersion: SANITY_API_VERSION,
  useCdn: false,
  perspective: 'published',
});

/** A Sanity-hosted photo, sized for Astro's remote-image pipeline. */
export interface CmsImage {
  src: string;
  width: number;
  height: number;
}

const IMG_PROJECTION = `{
  "src": asset->url,
  "width": asset->metadata.dimensions.width,
  "height": asset->metadata.dimensions.height,
  "alt": alt
}`;

interface RawImage extends CmsImage {
  alt: string;
}

function need<T>(value: T | null | undefined, what: string): T {
  if (value === null || value === undefined) {
    throw new Error(`[cms] ${what} is missing in Sanity — refusing to build without it.`);
  }
  return value;
}

/* ---------------------------------------------------------------------------
 * Gallery / build log (plan §4.1)
 * ------------------------------------------------------------------------- */

export interface ShowcaseEntry {
  img: CmsImage;
  /** Uppercase mono kicker above the title. */
  kicker: string;
  title: string;
  /** Uppercase mono line below the title. */
  sub: string;
  /** Real alt text — required in the schema (D-014). */
  alt: string;
}

interface RawGalleryEntry {
  title: string;
  kicker: string;
  sub: string;
  featured: boolean;
  photo: RawImage;
}

const rawGallery = await client.fetch<RawGalleryEntry[]>(
  `*[_type == "galleryEntry"] | order(order asc) {
    title, kicker, sub, featured, "photo": photo ${IMG_PROJECTION}
  }`,
);

const toShowcase = (e: RawGalleryEntry): ShowcaseEntry => ({
  img: {
    src: need(e.photo?.src, `gallery entry "${e.title}" photo`),
    width: e.photo.width,
    height: e.photo.height,
  },
  kicker: e.kicker,
  title: e.title,
  sub: e.sub,
  alt: e.photo.alt,
});

/** Every entry, gallery-page order. */
export const GALLERY: ShowcaseEntry[] = rawGallery.map(toShowcase);

/** The homepage build log: entries flagged "Show on the homepage". */
export const SHOWCASE: ShowcaseEntry[] = rawGallery.filter((e) => e.featured).map(toShowcase);

if (GALLERY.length === 0) throw new Error('[cms] no gallery entries — refusing to build.');
if (SHOWCASE.length === 0) throw new Error('[cms] no homepage-featured gallery entries — refusing to build.');

/* ---------------------------------------------------------------------------
 * Testimonials (plan §4.2)
 * ------------------------------------------------------------------------- */

interface RawTestimonial {
  quote: string;
  highlight?: string;
  attribution: string;
  quoteBand?: boolean;
}

const rawTestimonials = await client.fetch<RawTestimonial[]>(
  `*[_type == "testimonial"] | order(order asc) { quote, highlight, attribution, quoteBand }`,
);

/** The single quote in the site-wide band (homepage, gallery, about). */
export const QUOTE_BAND = need(
  rawTestimonials.find((t) => t.quoteBand),
  'a testimonial with "Use in the big quote band" switched on',
);

/** The reviews-page cards, in order. */
export const REVIEWS = rawTestimonials.filter((t) => !t.quoteBand);

/* ---------------------------------------------------------------------------
 * Homepage stats (plan §4.3) + business info (plan §4.4)
 * ------------------------------------------------------------------------- */

const rawStats = await client.fetch<{ stats: { value: string; label: string }[] } | null>(
  `*[_id == "siteStats"][0] { stats }`,
);

/** Headline numbers for the proof bar. */
export const STATS: readonly { value: string; label: string }[] = need(
  rawStats?.stats,
  'the "Homepage stats" singleton',
).map(({ value, label }) => ({ value, label }));

const rawBiz = need(
  await client.fetch<{
    phone: string;
    email: string;
    areaServed: string[];
    areaServedState: string;
  } | null>(`*[_id == "businessInfo"][0] { phone, email, areaServed, areaServedState }`),
  'the "Business info" singleton',
);

/**
 * Same shape site.ts used to export, so consumers only changed an import line.
 * Editable facts come from Sanity; identity facts (legal name, owner, address —
 * JSON-LD only, effectively fixed) stay in code per §4.
 */
export const BUSINESS = {
  legalName: 'Limitless 3D LLC',
  shortName: 'Limitless 3D',
  owner: 'Randy',
  phone: rawBiz.phone,
  phoneHref: 'tel:1' + rawBiz.phone.replace(/\D/g, ''),
  email: rawBiz.email,
  emailHref: `mailto:${rawBiz.email}`,
  address: {
    locality: 'Neenah',
    region: 'WI',
    postalCode: '54956',
    country: 'US',
  },
  areaServed: rawBiz.areaServed,
  areaServedState: rawBiz.areaServedState,
};

/* ---------------------------------------------------------------------------
 * Service page copy (plan §4.5)
 * ------------------------------------------------------------------------- */

export interface ServiceSplit {
  kicker: string;
  heading: string;
  image: CmsImage;
  alt: string;
  /** Portable text rendered to HTML at build; slotted into <Split> via set:html. */
  bodyHtml: string;
}

export interface ServiceCopy {
  lead: string;
  heroImage: CmsImage;
  heroAlt: string;
  splits: ServiceSplit[];
}

interface RawServicePage {
  service: 'scanning' | 'design' | 'printing';
  lead: string;
  heroImage: RawImage;
  splits: {
    kicker: string;
    heading: string;
    image: RawImage;
    body: PortableTextBlock[];
  }[];
}

const rawServices = await client.fetch<RawServicePage[]>(
  `*[_type == "servicePage"] {
    service, lead,
    "heroImage": heroImage ${IMG_PROJECTION},
    splits[] { kicker, heading, "image": image ${IMG_PROJECTION}, body }
  }`,
);

const serviceCopy = (key: RawServicePage['service']): ServiceCopy => {
  const raw = need(
    rawServices.find((s) => s.service === key),
    `the "${key}" service page`,
  );
  return {
    lead: raw.lead,
    heroImage: { src: raw.heroImage.src, width: raw.heroImage.width, height: raw.heroImage.height },
    heroAlt: raw.heroImage.alt,
    splits: raw.splits.map((s) => ({
      kicker: s.kicker,
      heading: s.heading,
      image: { src: s.image.src, width: s.image.width, height: s.image.height },
      alt: s.image.alt,
      bodyHtml: toHTML(s.body),
    })),
  };
};

export const SERVICE_COPY = {
  scanning: serviceCopy('scanning'),
  design: serviceCopy('design'),
  printing: serviceCopy('printing'),
} as const;
