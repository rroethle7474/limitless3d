/**
 * The three perpetual loops inside the service cards: a point-cloud scan, a self-drawing CAD
 * sketch, and a nozzle laying print layers.
 *
 * Ported from the prototype's site.js (docs/design-reference.md §7.2). Each is gated on an
 * IntersectionObserver so nothing animates off-screen, and each has a static end-state under
 * prefers-reduced-motion.
 */

export {}; // side-effect module — keeps declarations out of the global scope

const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const e01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : 1 - Math.pow(1 - x, 2.4));
const isDark = () => document.documentElement.getAttribute('data-theme') === 'dark';

function visWatch(el: Element, obj: { on: boolean }) {
  new IntersectionObserver((es) => {
    obj.on = es[0]!.isIntersecting;
  }, { threshold: 0.3 }).observe(el);
}

/* ---------- 01 scan: dots converge, measure line sweeps, dissolve, repeat ---------- */
const vc = document.getElementById('viz-scan') as HTMLCanvasElement | null;
if (vc) {
  const vctx = vc.getContext('2d')!;
  const NN = 340;
  let pts: { rx: number; ry: number; tx: number; ty: number }[] = [];
  const vis = { on: false };
  let t0: number | null = null;

  function seed() {
    const W = (vc!.width = vc!.clientWidth * 2);
    const H = (vc!.height = vc!.clientHeight * 2);
    pts = [];
    for (let i = 0; i < NN; i++) {
      const t = i / NN;
      const th = t * Math.PI * 2;
      const d = 1 + Math.sin(th) * Math.sin(th);
      pts.push({
        rx: Math.random() * W,
        ry: Math.random() * H,
        tx: W / 2 + W * 0.34 * (Math.cos(th) / d),
        ty: H / 2 + H * 0.62 * ((Math.sin(th) * Math.cos(th)) / d),
      });
    }
  }
  seed();
  window.addEventListener('resize', seed);

  const CYC = 6.8;
  const scanFrame = (ts: number) => {
    requestAnimationFrame(scanFrame);
    if (!vis.on) {
      t0 = null;
      return;
    }
    if (t0 === null) t0 = ts;
    const s = reduced ? 2 : ((ts - t0) / 1000) % CYC;
    const W = vc.width;
    const H = vc.height;
    const dark = isDark();
    const conv = s < 1.7 ? e01(s / 1.7) : s < 5.2 ? 1 : s < 6.2 ? 1 - e01((s - 5.2) / 1) : 0;
    const sweepX = s >= 1.9 && s < 4.9 ? W * ((s - 1.9) / 3) : -1;

    vctx.clearRect(0, 0, W, H);

    if (sweepX >= 0) {
      const g = vctx.createLinearGradient(sweepX - 70, 0, sweepX + 4, 0);
      g.addColorStop(0, 'rgba(94,23,235,0)');
      g.addColorStop(1, dark ? 'rgba(180,154,255,.35)' : 'rgba(94,23,235,.22)');
      vctx.fillStyle = g;
      vctx.fillRect(sweepX - 70, 0, 74, H);
    }

    for (let i = 0; i < NN; i++) {
      const p = pts[i]!;
      const x = p.rx + (p.tx - p.rx) * conv;
      const y = p.ry + (p.ty - p.ry) * conv;
      const near = sweepX >= 0 && Math.abs(x - sweepX) < 46;
      vctx.fillStyle = near
        ? dark ? '#EDE6FF' : '#2E0B8F'
        : dark ? 'rgba(180,154,255,.8)' : 'rgba(74,18,188,.75)';
      const sz = near ? 4.4 : 2.4;
      vctx.fillRect(x - sz / 2, y - sz / 2, sz, sz);
    }

    if (sweepX >= 0) {
      vctx.fillStyle = dark ? '#B49AFF' : '#5E17EB';
      vctx.fillRect(sweepX, 0, 2, H);
    }
  };
  requestAnimationFrame(scanFrame);
  visWatch(vc, vis);
}

/* ---------- 02 design: the drawing redraws itself ---------- */
const cad = document.getElementById('viz-cad');
if (cad) {
  const items: SVGGeometryElement[] = [];
  const vis2 = { on: false };

  cad.querySelectorAll<SVGGeometryElement>('.draw').forEach((el) => {
    const len = el.getTotalLength ? el.getTotalLength() : 400;
    (el as SVGGeometryElement & { _len: number })._len = len;
    el.style.strokeDasharray = String(len);
    el.style.strokeDashoffset = reduced ? '0' : String(len);
    items.push(el);
  });

  visWatch(cad, vis2);

  if (!reduced) {
    const cadLoop = () => {
      if (vis2.on) {
        items.forEach((el) => {
          el.style.transition = 'none';
          el.style.strokeDashoffset = String((el as SVGGeometryElement & { _len: number })._len);
        });
        void cad.getBoundingClientRect();
        items.forEach((el, i) => {
          el.style.transition = `stroke-dashoffset 1.3s ease ${i * 0.16}s`;
          el.style.strokeDashoffset = '0';
        });
      }
      setTimeout(cadLoop, 6800);
    };
    cadLoop();
  }
}

/* ---------- 03 print: nozzle lays each layer, stack resets ---------- */
const vp = document.getElementById('viz-print');
if (vp) {
  const bars = Array.from(vp.querySelectorAll<HTMLElement>('.layers i'));
  const noz = vp.querySelector<HTMLElement>('.nozzle')!;
  const layersEl = vp.querySelector<HTMLElement>('.layers')!;
  const vis3 = { on: false };
  let p0: number | null = null;

  visWatch(vp, vis3);

  const NB = bars.length;
  const PER = 0.3;
  const HOLD = 1.7;
  const FADE = 0.6;
  const TOT = NB * PER + HOLD + FADE;

  if (reduced) {
    bars.forEach((b) => {
      b.style.opacity = '.92';
      b.style.transform = 'scaleX(1)';
    });
  } else {
    const printFrame = (ts: number) => {
      requestAnimationFrame(printFrame);
      if (!vis3.on) {
        p0 = null;
        return;
      }
      if (p0 === null) p0 = ts;
      const s = ((ts - p0) / 1000) % TOT;
      const vr = vp.getBoundingClientRect();
      const lr = layersEl.getBoundingClientRect();

      if (s < NB * PER) {
        const li = Math.floor(s / PER);
        const lp = (s % PER) / PER;
        for (let i = 0; i < NB; i++) {
          const isDone = i < li;
          const isCur = i === li;
          bars[i]!.style.opacity = isDone || isCur ? '.92' : '0';
          bars[i]!.style.transform = `scaleX(${isDone ? 1 : isCur ? lp : 0})`;
        }
        const y = lr.bottom - vr.top - (li + 1) * (lr.height / NB);
        const x = lr.left - vr.left + lr.width * lp;
        noz.style.opacity = '1';
        noz.style.transform = `translate(${x - 6}px,${y - 5}px)`;
      } else if (s < NB * PER + HOLD) {
        bars.forEach((b) => {
          b.style.opacity = '.92';
          b.style.transform = 'scaleX(1)';
        });
        noz.style.opacity = '0';
      } else {
        const f = 1 - (s - NB * PER - HOLD) / FADE;
        bars.forEach((b) => {
          b.style.opacity = String(0.92 * f);
        });
        noz.style.opacity = '0';
      }
    };
    requestAnimationFrame(printFrame);
  }
}
