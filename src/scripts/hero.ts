/**
 * Home hero: the brand mark scanned, printed, and dissolved, on loop.
 *
 * Ported from the prototype's hero.js (docs/prototype-snapshot/hero.js). The geometry and
 * phase timings are reproduced exactly — see docs/design-reference.md §7.1 for the maths.
 *
 * Differences from the prototype, all performance-motivated:
 *   - named imports from `three` instead of a self-hosted full three.min.js, so Vite
 *     tree-shakes the ~60% of the library this scene never touches
 *   - loaded via dynamic import() from Hero.astro behind requestIdleCallback +
 *     IntersectionObserver, exactly as the prototype gated its script injection
 *
 * A <canvas> is not an LCP candidate, so deferring all of this does not affect LCP — the
 * hero h1 is the LCP element.
 */

import {
  AdditiveBlending,
  AmbientLight,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  Clock,
  DirectionalLight,
  DoubleSide,
  Float32BufferAttribute,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  NormalBlending,
  PerspectiveCamera,
  Plane,
  PlaneGeometry,
  PointLight,
  Points,
  PointsMaterial,
  Scene,
  Vector3,
  WebGLRenderer,
} from 'three';

type Tier = 'mobile' | 'tablet' | 'desktop';

export function initHero(): void {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const canHover = window.matchMedia('(hover: hover)').matches;

  const canvas = document.getElementById('hero-canvas') as HTMLCanvasElement | null;
  const heroEl = document.getElementById('hero');
  const caption = document.getElementById('obj-caption');
  if (!canvas || !heroEl) return;

  /** No WebGL, or ?nogl=1 — drop a static brand mark in place of the canvas. */
  function fallback() {
    canvas?.remove();
    caption?.remove();
    heroEl!.insertAdjacentHTML(
      'beforeend',
      '<svg viewBox="0 0 100 50" fill="none" aria-hidden="true" style="position:absolute;z-index:1;right:6%;top:26%;width:min(44vw,560px);filter:drop-shadow(0 0 46px rgba(94,23,235,.4))">' +
        '<path d="M50 25 C42 8, 16 8, 12 25 C8 42, 34 42, 50 25 C66 8, 92 8, 88 25 C84 42, 58 42, 50 25 Z" stroke="#5E17EB" stroke-width="6" stroke-linecap="round"/></svg>',
    );
  }

  let renderer: WebGLRenderer;
  try {
    if (/[?&]nogl=1/.test(location.search)) throw new Error('nogl');
    renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true });
  } catch {
    fallback();
    return;
  }

  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.localClippingEnabled = true;

  const scene = new Scene();
  const camera = new PerspectiveCamera(38, 1, 0.1, 100);
  camera.position.set(0, 1.4, 8.4);
  camera.lookAt(0, 0, 0);

  const THEMES = {
    dark: {
      amb: [0x8890a8, 0.55], key: [0xffffff, 1.05], rim: [0x5e17eb, 13, 20], fill: [0xb49aff, 4, 16],
      pts: 0xb49aff, ptsBlend: 'add', band: 0xe7ddff, shadow: 0.5,
    },
    light: {
      amb: [0xffffff, 0.85], key: [0xffffff, 0.95], rim: [0x5e17eb, 6, 20], fill: [0x4a12bc, 2, 16],
      pts: 0x4a12bc, ptsBlend: 'normal', band: 0x2e0b8f, shadow: 0.17,
    },
  } as const;

  const amb = new AmbientLight();
  const key = new DirectionalLight();
  key.position.set(3, 5, 4);
  const rim = new PointLight();
  rim.position.set(-3.4, 1.2, -2.2);
  const fill = new PointLight();
  fill.position.set(2.6, -1.4, 2.6);
  scene.add(amb, key, rim, fill);

  /* ---- the brand mark as a lemniscate with a gentle over/under weave ---- */
  function lemni(t: number, out: Vector3): Vector3 {
    const th = t * Math.PI * 2;
    const d = 1 + Math.sin(th) * Math.sin(th);
    const a = 2.15;
    out.set((a * Math.cos(th)) / d, (a * Math.sin(th) * Math.cos(th)) / d, 0.34 * Math.sin(2 * th));
    return out;
  }

  /** Brush-stroke taper along the path, matching the logo's varying stroke weight. */
  function brushR(t: number): number {
    return 0.2 * (0.78 + 0.3 * Math.sin(t * Math.PI * 4 + 0.7));
  }

  function buildTube(): BufferGeometry {
    const SEG = 440;
    const RAD = 26;
    const v = new Vector3();
    const v2 = new Vector3();
    const pts: Vector3[] = [];
    for (let i = 0; i <= SEG; i++) pts.push(lemni(i / SEG, new Vector3()));

    const pos: number[] = [];
    const norm: number[] = [];
    const idx: number[] = [];
    const tang = new Vector3();
    const nrm = new Vector3(0, 0, 1);
    const bin = new Vector3();
    const prevN = new Vector3(0, 0, 1);

    for (let i = 0; i <= SEG; i++) {
      const p = pts[i]!;
      tang.subVectors(pts[(i + 1) % SEG]!, pts[(i - 1 + SEG) % SEG]!).normalize();
      bin.crossVectors(tang, prevN).normalize();
      nrm.crossVectors(bin, tang).normalize();
      prevN.copy(nrm);
      const r = brushR(i / SEG);
      for (let j = 0; j <= RAD; j++) {
        const an = (j / RAD) * Math.PI * 2;
        const cx = Math.cos(an) * r;
        const cy = Math.sin(an) * r;
        v.copy(nrm).multiplyScalar(cx).addScaledVector(bin, cy).add(p);
        pos.push(v.x, v.y, v.z);
        v2.copy(nrm).multiplyScalar(cx).addScaledVector(bin, cy).normalize();
        norm.push(v2.x, v2.y, v2.z);
      }
    }
    for (let i = 0; i < SEG; i++) {
      for (let j = 0; j < RAD; j++) {
        const a = i * (RAD + 1) + j;
        const b = a + RAD + 1;
        idx.push(a, b, a + 1, b, b + 1, a + 1);
      }
    }

    const g = new BufferGeometry();
    g.setAttribute('position', new Float32BufferAttribute(pos, 3));
    g.setAttribute('normal', new Float32BufferAttribute(norm, 3));
    g.setIndex(idx);
    return g;
  }

  const geo = buildTube();
  geo.computeBoundingBox();
  const minY = geo.boundingBox!.min.y;
  const maxY = geo.boundingBox!.max.y;

  const clipMain = new Plane(new Vector3(0, -1, 0), minY);
  const clipBandLo = new Plane(new Vector3(0, 1, 0), -minY);
  const clipBandHi = new Plane(new Vector3(0, -1, 0), minY);

  const mat = new MeshPhysicalMaterial({
    color: 0x5e17eb,
    roughness: 0.34,
    metalness: 0.12,
    clearcoat: 0.45,
    clearcoatRoughness: 0.25,
    clippingPlanes: [clipMain],
    side: DoubleSide,
    transparent: true,
    opacity: 1,
  });
  const mesh = new Mesh(geo, mat);

  const bandMat = new MeshBasicMaterial({
    clippingPlanes: [clipBandLo, clipBandHi],
    side: DoubleSide,
    toneMapped: false,
  });
  const band = new Mesh(geo, bandMat);

  /* ---- scan cloud: surface samples sorted by height so the print consumes them bottom up ---- */
  const N = 2200;
  const samples: { x: number; y: number; z: number }[] = [];
  {
    const sv = new Vector3();
    const st = new Vector3();
    const sb = new Vector3();
    const sn = new Vector3(0, 0, 1);
    const sprev = new Vector3(0, 0, 1);
    for (let i = 0; i < N; i++) {
      const t = Math.random();
      const p = lemni(t, new Vector3());
      const p2 = lemni((t + 0.002) % 1, new Vector3());
      st.subVectors(p2, p).normalize();
      sb.crossVectors(st, sprev).normalize();
      sn.crossVectors(sb, st).normalize();
      sprev.copy(sn);
      const an = Math.random() * Math.PI * 2;
      const r = brushR(t);
      sv.copy(sn).multiplyScalar(Math.cos(an) * r).addScaledVector(sb, Math.sin(an) * r).add(p);
      samples.push({ x: sv.x, y: sv.y, z: sv.z });
    }
  }
  samples.sort((a, b) => a.y - b.y);

  const target = new Float32Array(N * 3);
  const start = new Float32Array(N * 3);
  const sortedY = new Float64Array(N);
  for (let i = 0; i < N; i++) {
    const s = samples[i]!;
    target[i * 3] = s.x;
    target[i * 3 + 1] = s.y;
    target[i * 3 + 2] = s.z;
    sortedY[i] = s.y;
  }

  function randomizeStarts() {
    for (let i = 0; i < N; i++) {
      const th = Math.random() * Math.PI * 2;
      const ph = Math.acos(2 * Math.random() - 1);
      const rr = 3.4 + Math.random() * 2.6;
      start[i * 3] = rr * Math.sin(ph) * Math.cos(th);
      start[i * 3 + 1] = rr * Math.cos(ph) * 0.7;
      start[i * 3 + 2] = rr * Math.sin(ph) * Math.sin(th);
    }
  }
  randomizeStarts();

  const ptsGeo = new BufferGeometry();
  const ptsPos = new Float32Array(N * 3);
  ptsPos.set(start);
  ptsGeo.setAttribute('position', new BufferAttribute(ptsPos, 3));
  const ptsMat = new PointsMaterial({
    size: 0.042,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.9,
    depthWrite: false,
  });
  const points = new Points(ptsGeo, ptsMat);

  function shadowTexture(): CanvasTexture {
    const c = document.createElement('canvas');
    c.width = c.height = 256;
    const x = c.getContext('2d')!;
    const g = x.createRadialGradient(128, 128, 10, 128, 128, 124);
    g.addColorStop(0, 'rgba(0,0,0,1)');
    g.addColorStop(0.55, 'rgba(0,0,0,.45)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = g;
    x.fillRect(0, 0, 256, 256);
    return new CanvasTexture(c);
  }

  const shadowMat = new MeshBasicMaterial({
    map: shadowTexture(),
    transparent: true,
    opacity: 0.5,
    depthWrite: false,
  });
  const shadow = new Mesh(new PlaneGeometry(5.6, 3.4), shadowMat);
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = minY - 0.55;

  const group = new Group();
  group.add(mesh, band, points);
  const rig = new Group();
  rig.add(group, shadow);
  scene.add(rig);

  function applySceneTheme() {
    const T =
      THEMES[document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light'];
    amb.color.setHex(T.amb[0]);
    amb.intensity = T.amb[1];
    key.color.setHex(T.key[0]);
    key.intensity = T.key[1];
    rim.color.setHex(T.rim[0]);
    rim.intensity = T.rim[1];
    rim.distance = T.rim[2];
    fill.color.setHex(T.fill[0]);
    fill.intensity = T.fill[1];
    fill.distance = T.fill[2];
    ptsMat.color.setHex(T.pts);
    ptsMat.blending = T.ptsBlend === 'add' ? AdditiveBlending : NormalBlending;
    ptsMat.needsUpdate = true;
    bandMat.color.setHex(T.band);
    shadowMat.opacity = T.shadow;
  }
  applySceneTheme();

  /* ---- per-tier placement so the free object works on every device ---- */
  const LAY: Record<Tier, { x: number; y: number; s: number; camZ: number }> = {
    mobile: { x: 0, y: 1.42, s: 0.44, camZ: 10.4 },
    tablet: { x: 1.15, y: 0.15, s: 0.86, camZ: 8.8 },
    desktop: { x: 1.85, y: 0.05, s: 1, camZ: 8.4 },
  };
  const tierFor = (w: number): Tier => (w <= 640 ? 'mobile' : w <= 1024 ? 'tablet' : 'desktop');
  let tier: Tier | null = null;

  function applyLayout() {
    const t = tierFor(window.innerWidth);
    if (t === tier) return;
    tier = t;
    const L = LAY[t];
    rig.position.set(L.x, L.y, 0);
    rig.scale.setScalar(L.s);
    camera.position.z = L.camZ;
  }

  function resize() {
    const w = heroEl!.clientWidth;
    const h = heroEl!.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    applyLayout();
  }
  resize();
  window.addEventListener('resize', resize);

  /* ---- the four-phase loop ---- */
  const PH = [
    { name: 'scan', dur: 3.2 },
    { name: 'print', dur: 4.6 },
    { name: 'done', dur: 4.4 },
    { name: 'dissolve', dur: 1.9 },
  ] as const;

  let phase = 0;
  let pt = 0;
  const TOTAL_LAYERS = 212;

  let qPhase = location.search.match(/[?&]phase=(scan|print|done)/)?.[1];
  if (/[?&]done=1/.test(location.search)) qPhase = 'done';
  const locked = !!qPhase || reduced;
  if (qPhase === 'print') {
    phase = 1;
    pt = PH[1].dur * 0.62;
  } else if (qPhase === 'done' || reduced) {
    phase = 2;
    pt = 0;
  } else if (qPhase === 'scan') {
    phase = 0;
    pt = PH[0].dur * 0.7;
  }

  const ease = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : 1 - Math.pow(1 - x, 2.2));

  /** Binary search over the height-sorted samples: how many are below the print plane. */
  function countBelow(h: number): number {
    let lo = 0;
    let hi = N;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (sortedY[mid]! < h) lo = mid + 1;
      else hi = mid;
    }
    return lo;
  }

  function setCaption(html: string) {
    if (caption && caption.innerHTML !== html) caption.innerHTML = html;
  }

  function applyPhase() {
    const name = PH[phase]!.name;
    const e = ease(pt / PH[phase]!.dur);

    if (name === 'scan') {
      mesh.visible = false;
      band.visible = false;
      points.visible = true;
      ptsMat.opacity = 0.25 + 0.65 * Math.min(1, e * 2.2);
      for (let i = 0; i < N; i++) {
        const k = i * 3;
        const d = ease(Math.min(1, e * 1.25 - ((i % 17) / 17) * 0.25));
        ptsPos[k] = start[k]! + (target[k]! - start[k]!) * d;
        ptsPos[k + 1] = start[k + 1]! + (target[k + 1]! - start[k + 1]!) * d;
        ptsPos[k + 2] = start[k + 2]! + (target[k + 2]! - start[k + 2]!) * d;
      }
      ptsGeo.attributes.position!.needsUpdate = true;
      ptsGeo.setDrawRange(0, N);
      setCaption('SCANNING&hellip; <b>' + Math.round(e * 100) + '%</b>');
    } else if (name === 'print') {
      mesh.visible = true;
      band.visible = true;
      points.visible = true;
      mat.opacity = 1;
      const h = minY + (maxY - minY) * e;
      // Clipping planes are world space: map local height through the rig transform.
      const s = rig.scale.x;
      const hw = rig.position.y + s * h;
      clipMain.constant = hw;
      clipBandHi.constant = hw;
      clipBandLo.constant = -(hw - 0.055 * s);
      const printed = countBelow(h);
      ptsGeo.setDrawRange(printed, N - printed);
      setCaption(
        'PRINTING&hellip; <b>' + Math.round(e * 100) + '%</b> &middot; LAYER <b>' +
          Math.max(1, Math.round(e * TOTAL_LAYERS)) + '</b>/' + TOTAL_LAYERS,
      );
    } else if (name === 'done') {
      mesh.visible = true;
      band.visible = false;
      points.visible = false;
      mat.opacity = 1;
      clipMain.constant = 1000;
      setCaption(
        'COMPLETE &middot; <b>0.02 MM</b> ACCURACY' + (canHover ? ' &middot; DRAG TO SPIN' : ''),
      );
    } else {
      mesh.visible = true;
      band.visible = false;
      points.visible = true;
      mat.opacity = 1 - e;
      ptsMat.opacity = 0.9 * e;
      for (let i = 0; i < N; i++) {
        const k = i * 3;
        const d = ease(e);
        ptsPos[k] = target[k]! + (start[k]! - target[k]!) * d;
        ptsPos[k + 1] = target[k + 1]! + (start[k + 1]! - target[k + 1]!) * d;
        ptsPos[k + 2] = target[k + 2]! + (start[k + 2]! - target[k + 2]!) * d;
      }
      ptsGeo.attributes.position!.needsUpdate = true;
      ptsGeo.setDrawRange(0, N);
      setCaption('&nbsp;');
    }
  }

  /* ---- drag to spin, with inertia ---- */
  let targRY = 0;
  let velY = 0;
  let dragging = false;
  let px = 0;

  canvas.addEventListener('pointerdown', (e) => {
    dragging = true;
    px = e.clientX;
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    targRY += (e.clientX - px) * 0.008;
    velY = (e.clientX - px) * 0.008;
    px = e.clientX;
  });
  window.addEventListener('pointerup', () => {
    dragging = false;
  });

  /* ---- pointer parallax ---- */
  let parX = 0;
  let parY = 0;
  if (canHover && !reduced) {
    window.addEventListener('pointermove', (e) => {
      parX = e.clientX / window.innerWidth - 0.5;
      parY = e.clientY / window.innerHeight - 0.5;
    });
  }

  let heroVisible = true;
  new IntersectionObserver((es) => {
    heroVisible = es[0]!.isIntersecting;
  }, { threshold: 0 }).observe(heroEl);

  const clock = new Clock();

  function tick() {
    requestAnimationFrame(tick);
    if (!heroVisible) return;
    const dt = Math.min(clock.getDelta(), 0.05);

    if (!locked) {
      pt += dt;
      if (pt >= PH[phase]!.dur) {
        pt = 0;
        phase = (phase + 1) % PH.length;
        if (phase === 0) randomizeStarts();
      }
    }

    rig.position.x = LAY[tier!].x + parX * 0.35;
    rig.position.y = LAY[tier!].y - parY * 0.22;
    applyPhase();

    if (!dragging) {
      if (Math.abs(velY) > 0.0004) {
        targRY += velY;
        velY *= 0.94;
      } else if (!reduced) {
        targRY += dt * (PH[phase]!.name === 'done' ? 0.3 : 0.1);
      }
    }
    group.rotation.y += (targRY - group.rotation.y) * 0.12;
    renderer.render(scene, camera);
  }

  applyPhase();
  tick();
}
