/**
 * Code-fixed site constants: navigation, social URLs, the shop link, the brand
 * mark. These are layout/identity, deliberately NOT editable (plan §4:
 * "everything else is code-fixed").
 *
 * The editable business facts (phone, email, service area) and the proof-bar
 * STATS moved to Sanity in Phase 1b — import { BUSINESS, STATS } from
 * '~/data/cms' (build-time fetch; the shapes are unchanged).
 */

export const SOCIAL = {
  instagram: 'https://www.instagram.com/limitless3ddesign/',
  facebook: 'https://www.facebook.com/Limitless3Ddesign',
  etsy: 'https://limitless3ddesign.etsy.com',
  etsyShop: 'https://www.etsy.com/shop/Limitless3DDesign',
} as const;

/*
 * The parts shop lives on-site at /parts since D-037 (Square catalog demo,
 * session 7) — the D-011 `SHOP_URL` subdomain link-out is retired. Whether the
 * old Square Online store also survives at shop.limitless3ddesign.com is the
 * §9.7 fallback question, decided at cutover.
 */

export const NAV_LINKS = [
  { href: '/3d-scanning', label: 'Scanning' },
  { href: '/3d-printing', label: 'Printing' },
  { href: '/3d-design', label: 'Design' },
  { href: '/gallery', label: 'Gallery' },
  { href: '/parts', label: 'Parts Shop' },
  { href: '/about', label: 'About' },
] as const;

export const FOOTER_LINKS = {
  services: [
    { href: '/3d-scanning', label: '3D Scanning' },
    { href: '/3d-printing', label: '3D Printing' },
    { href: '/3d-design', label: '3D Design' },
    { href: '/gallery', label: 'Gallery' },
  ],
  shopAndContact: [
    { href: '/parts', label: 'Parts Shop' },
    { href: '/reviews', label: 'Reviews' },
    { href: '/about', label: 'About' },
    { href: '/contact', label: 'Contact' },
    { href: '/shipping-and-returns', label: 'Shipping and returns' },
  ],
} as const;

/** The brand mark: a lemniscate drawn as a single brush stroke. */
export const BRAND_PATH =
  'M50 25 C42 8, 16 8, 12 25 C8 42, 34 42, 50 25 C66 8, 92 8, 88 25 C84 42, 58 42, 50 25 Z';
