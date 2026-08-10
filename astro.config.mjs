// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  // The real production domain. Drives canonical URLs, og:url, and sitemap entries.
  // Staging deploys stay noindex (plan §5.6), so this stays pointed at production.
  site: 'https://www.limitless3ddesign.com',

  output: 'static',

  integrations: [sitemap()],

  image: {
    // Sharp handles the local pipeline; every content photo is imported from src/assets
    // and emitted as AVIF/WebP at display size. Nothing is ever hotlinked (plan §6).
    responsiveStyles: true,
    layout: 'constrained',
    // Owner-managed photos (gallery, service pages) live in Sanity. Authorizing the
    // domain makes Astro FETCH them at build and run them through the same Sharp
    // pipeline — dist/ still serves local optimized files, nothing hotlinks the CDN.
    domains: ['cdn.sanity.io'],
  },

  vite: {
    plugins: [tailwindcss()],
  },
});
