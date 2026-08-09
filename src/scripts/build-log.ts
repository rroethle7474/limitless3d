/**
 * Build-log spotlight: autoplay carousel with a scan-line sweep on every change.
 *
 * Ported from the prototype's site.js (docs/design-reference.md §7.3), with one change:
 * the prototype double-buffered two <img> elements and swapped their src, preloading all six
 * by hand. Here all six are rendered by Astro's image pipeline and crossfaded by class, so the
 * browser gets responsive srcsets, there is no decode flash on first change, and no image URL
 * is ever constructed in JS.
 */

export {}; // side-effect module — keeps declarations out of the global scope

const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const stage = document.getElementById('show-stage');
const thumbsEl = document.getElementById('show-thumbs');

if (stage && thumbsEl) {
  const slides = Array.from(stage.querySelectorAll<HTMLElement>('[data-slide]'));
  const thumbs = Array.from(thumbsEl.querySelectorAll<HTMLButtonElement>('button'));
  const sweep = document.getElementById('show-sweep');
  const kickerEl = document.getElementById('show-kicker')!;
  const titleEl = document.getElementById('show-title')!;
  const subEl = document.getElementById('show-sub')!;
  const countEl = document.getElementById('show-count')!;

  const total = slides.length;
  let cur = 0;
  let holdUntil = 0;
  const seen = { on: false };

  const pad = (n: number) => (n < 10 ? '0' : '') + n;

  function show(i: number) {
    cur = i;
    const slide = slides[i]!;

    slides.forEach((s, si) => s.classList.toggle('on', si === i));
    thumbs.forEach((b, bi) => b.classList.toggle('on', bi === i));

    kickerEl.textContent = slide.dataset.kicker ?? '';
    titleEl.textContent = slide.dataset.title ?? '';
    subEl.textContent = slide.dataset.sub ?? '';
    countEl.textContent = `${pad(i + 1)} / ${pad(total)}`;

    if (!reduced && sweep) {
      sweep.classList.remove('go');
      void sweep.offsetWidth; // force reflow so the animation restarts
      sweep.classList.add('go');
    }
  }

  thumbs.forEach((b, i) =>
    b.addEventListener('click', () => {
      holdUntil = Date.now() + 12000;
      show(i);
    }),
  );

  new IntersectionObserver((es) => {
    seen.on = es[0]!.isIntersecting;
  }, { threshold: 0.3 }).observe(stage);

  show(0);

  if (!reduced) {
    setInterval(() => {
      if (!seen.on || Date.now() < holdUntil) return;
      show((cur + 1) % total);
    }, 5000);
  }

  /* swipe */
  let sx: number | null = null;
  stage.addEventListener('pointerdown', (e) => {
    sx = e.clientX;
  });
  stage.addEventListener('pointerup', (e) => {
    if (sx === null) return;
    const dx = e.clientX - sx;
    sx = null;
    if (Math.abs(dx) > 44) {
      holdUntil = Date.now() + 12000;
      show((cur + (dx < 0 ? 1 : total - 1)) % total);
    }
  });
}
