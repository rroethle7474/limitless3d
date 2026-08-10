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

/**
 * The Square Online parts shop.
 *
 * TODO(phase-3): this subdomain is connected in Square's domain settings at cutover
 * (plan §7 Phase 3). Until then the link resolves to nothing — that is expected, and it is
 * deliberately not pointed at the current /s/shop URL, which gets 301'd here anyway.
 * Decision D-011.
 */
export const SHOP_URL = 'https://shop.limitless3ddesign.com';

export const NAV_LINKS = [
  { href: '/3d-scanning', label: 'Scanning' },
  { href: '/3d-printing', label: 'Printing' },
  { href: '/3d-design', label: 'Design' },
  { href: '/gallery', label: 'Gallery' },
  { href: SHOP_URL, label: 'Parts Shop', external: true },
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
    { href: SHOP_URL, label: 'Parts Shop', external: true },
    { href: '/reviews', label: 'Reviews' },
    { href: '/about', label: 'About' },
    { href: '/contact', label: 'Contact' },
    { href: '/shipping-and-returns', label: 'Shipping and returns' },
  ],
} as const;

/** The brand mark: a lemniscate drawn as a single brush stroke. */
export const BRAND_PATH =
  'M50 25 C42 8, 16 8, 12 25 C8 42, 34 42, 50 25 C66 8, 92 8, 88 25 C84 42, 58 42, 50 25 Z';
