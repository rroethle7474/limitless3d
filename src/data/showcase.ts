import type { ImageMetadata } from 'astro';

import pondNozzle from '~/assets/work/pond-nozzle.jpg';
import nozzleCad from '~/assets/work/nozzle-cad.jpg';
import skiBoot from '~/assets/work/ski-boot.jpg';
import customDivider from '~/assets/work/custom-divider.jpg';
import heirloom from '~/assets/work/heirloom.jpg';
import rcCars from '~/assets/work/rc-cars.jpg';

export interface ShowcaseEntry {
  img: ImageMetadata;
  /** Uppercase mono kicker above the title. */
  kicker: string;
  title: string;
  /** Uppercase mono line below the title. */
  sub: string;
  /** Real alt text — the prototype left these empty, which was a miss. */
  alt: string;
}

/**
 * The homepage build log.
 *
 * TODO(phase-1b): becomes the "Gallery / build log entries" Sanity collection (plan §4.1),
 * where each entry is fresh indexed content. The shape here is deliberately close to that
 * model so the migration is mechanical.
 */
export const SHOWCASE: ShowcaseEntry[] = [
  {
    img: pondNozzle,
    kicker: 'COMMERCIAL COMMISSION',
    title: 'Pond fountain nozzles',
    sub: 'DESIGNED FOR WI PONDWORKS',
    alt: 'Custom 3D printed pond fountain nozzles',
  },
  {
    img: nozzleCad,
    kicker: 'THE DESIGN FILE',
    title: 'The model behind it',
    sub: 'REVERSE ENGINEERED IN CAD',
    alt: 'CAD model of the fountain nozzle, reverse engineered from a scan',
  },
  {
    img: skiBoot,
    kicker: 'REPAIR',
    title: 'Ski boot repair',
    sub: 'BACK ON THE MOUNTAIN',
    alt: 'A 3D printed replacement part repairing a ski boot',
  },
  {
    img: customDivider,
    kicker: 'HOME SOLUTION',
    title: 'Custom drawer storage',
    sub: 'BUILT TO FIT EXACTLY',
    alt: 'Custom 3D printed drawer dividers built to fit exactly',
  },
  {
    img: heirloom,
    kicker: 'RESTORATION',
    title: 'Antique concertina',
    sub: 'PARTS MADE TO MATCH',
    alt: 'An antique concertina restored with 3D printed matching parts',
  },
  {
    img: rcCars,
    kicker: 'HOBBY',
    title: 'Hobby RC builds',
    sub: 'BODIES AND PARTS',
    alt: '3D printed bodies and parts for hobby RC cars',
  },
];
