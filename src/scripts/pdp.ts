/**
 * PDP interactions, imported only by /parts/[slug] (per-section JS, D-015).
 *
 * Gallery: all images are server-rendered stacked in .pdp-main and toggled by
 * class — the D-012 pattern — so every image rides the build pipeline with a
 * real srcset and no URL is ever built in JS.
 *
 * Variation select: the Buy link's href follows the chosen variation. Each
 * option carries its Square-hosted checkout URL in data-buy-url.
 */

const thumbs = document.querySelector<HTMLElement>('.pdp-thumbs');
if (thumbs) {
  const slides = Array.from(document.querySelectorAll<HTMLElement>('.pdp-main img'));
  thumbs.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest('button');
    if (!b) return;
    const i = Number(b.dataset.index);
    slides.forEach((img, n) => img.classList.toggle('on', n === i));
    thumbs.querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === b));
  });
}

const select = document.querySelector<HTMLSelectElement>('#pdp-variation');
const buy = document.querySelector<HTMLAnchorElement>('#pdp-buy');
if (select && buy) {
  select.addEventListener('change', () => {
    const url = select.selectedOptions[0]?.dataset.buyUrl;
    if (url) buy.href = url;
  });
}
