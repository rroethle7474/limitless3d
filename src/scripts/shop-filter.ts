/**
 * /parts category filter — ported verbatim from the prototype's site.js
 * (shopbar buttons toggle .pcard visibility by data-cats; the count follows).
 * Imported only by the parts index page (per-section JS, D-015).
 */

const bar = document.querySelector<HTMLElement>('.shopbar');
if (bar) {
  const cards = Array.from(document.querySelectorAll<HTMLElement>('.pcard'));
  const countEl = document.querySelector<HTMLElement>('.shop-count .n');
  bar.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest('button');
    if (!b) return;
    bar.querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === b));
    const cat = b.dataset.cat;
    let shown = 0;
    for (const c of cards) {
      const hit = cat === 'all' || (c.dataset.cats ?? '').split('|').includes(cat ?? '');
      c.style.display = hit ? '' : 'none';
      if (hit) shown++;
    }
    if (countEl) countEl.textContent = String(shown);
  });
}
