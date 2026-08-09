/**
 * Site-wide behaviour: theme preview flag, mobile drawer, scroll reveals.
 *
 * Loaded on every page from Base.astro. Everything section-specific lives in its own module
 * and is imported by the component that owns it, so a page only ships the JS it actually
 * uses — the prototype shipped one bundle to every page (docs/design-reference.md §7).
 */

export {}; // side-effect module — keeps declarations out of the global scope

const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- theme: light is the shipped default; ?theme=dark is internal preview only ---------- */
const qTheme = location.search.match(/[?&]theme=(light|dark)/)?.[1];
if (qTheme) document.documentElement.setAttribute('data-theme', qTheme);

/* ---------- mobile nav drawer ---------- */
const burger = document.querySelector<HTMLButtonElement>('.burger');
const scrim = document.querySelector<HTMLElement>('.scrim');

function closeMenu() {
  document.body.classList.remove('menu-open');
  burger?.setAttribute('aria-expanded', 'false');
}

burger?.addEventListener('click', () => {
  const open = document.body.classList.toggle('menu-open');
  burger.setAttribute('aria-expanded', open ? 'true' : 'false');
});

scrim?.addEventListener('click', closeMenu);
document.querySelectorAll('.drawer a').forEach((a) => a.addEventListener('click', closeMenu));
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeMenu();
});
window.addEventListener('resize', () => {
  if (window.innerWidth > 1024) closeMenu();
});

/* ---------- reveal on scroll ---------- */
if (!reduced) {
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add('on');
          io.unobserve(e.target);
        }
      });
    },
    { threshold: 0.15 },
  );
  document.querySelectorAll('.reveal').forEach((el) => io.observe(el));
}
