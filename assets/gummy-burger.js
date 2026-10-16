// The gummy burger: the menu button and the menu are the same seven candies on one canvas.
// Closed, they sit stacked as a little burger inside the header's #Burger button. Opening the menu grows that
// burger out of the button and pulls it apart, each layer flying to its own menu row; closing restacks them
// and shrinks them back into the button.
// Built for speed: one cheap opaque material for everything (fastGummyMaterial, no transmission pass), each
// layer merged into a single mesh of a few hundred vertices, so the whole burger is 7 draw calls. The canvas
// is fixed and drawn only when something moves; while the menu is closed it shrinks to the button's own
// box, renders once and idles.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { warmRoom, gummyRenderer, envRig, fastGummyMaterial, fastGummyUniforms } from './gummy-look.js';

const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const coarse = matchMedia('(pointer: coarse)').matches;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const SPAN = 2.1;          // the bun's diameter, in model units
const TILT_BTN = 0.34, TILT_MENU = 0.58;

// ---------- geometry ----------
// A superellipsoid slab: around the y axis the outline is R(θ); the cross-section is a rounded box whose top
// and bottom halves can bulge differently (a dome bun, a flat cut face). deform(v, θ) nudges each vertex.
function slab({ R = () => 1, top = 0.1, bot = 0.1, nTop = 3, nBot = 3, seg = 40, rows = 12, deform }) {
  const pos = [], idx = [];
  const at = (th, ph) => {
    const c = Math.cos(ph), s = Math.sin(ph), up = s >= 0;
    const n = up ? nTop : nBot, H = up ? top : bot;
    const r = R(th) * Math.pow(Math.abs(c), 2 / n);
    const v = new THREE.Vector3(r * Math.cos(th), H * Math.sign(s) * Math.pow(Math.abs(s), 2 / n), -r * Math.sin(th));
    deform?.(v, th);
    return v;
  };
  pos.push(at(0, Math.PI / 2));
  for (let j = 1; j < rows; j++) {
    const ph = Math.PI / 2 - (j / rows) * Math.PI;
    for (let i = 0; i < seg; i++) pos.push(at((i / seg) * Math.PI * 2, ph));
  }
  pos.push(at(0, -Math.PI / 2));
  const ring = (j, i) => 1 + (j - 1) * seg + ((i + seg) % seg), last = pos.length - 1;
  for (let i = 0; i < seg; i++) idx.push(0, ring(1, i), ring(1, i + 1));
  for (let j = 1; j < rows - 1; j++) for (let i = 0; i < seg; i++) {
    const a = ring(j, i), b = ring(j, i + 1), c = ring(j + 1, i), d = ring(j + 1, i + 1);
    idx.push(a, c, b, b, c, d);
  }
  for (let i = 0; i < seg; i++) idx.push(last, ring(rows - 1, i + 1), ring(rows - 1, i));
  const g = new THREE.BufferGeometry().setFromPoints(pos);
  g.setIndex(idx);
  g.computeVertexNormals();
  if (g.attributes.normal.getY(0) < 0) { g.index.array.reverse(); g.computeVertexNormals(); }
  return g;
}
// colour (sRGB hex, or a function of the vertex) and finish [jelly, sour, gloss] for every vertex
const tmpV = new THREE.Vector3(), tmpC = new THREE.Color();
function paint(g, color, mat) {
  const n = g.attributes.position.count, col = new Float32Array(n * 3), m = new Float32Array(n * 3);
  const fixed = typeof color === 'function' ? null : new THREE.Color(color);
  for (let i = 0; i < n; i++) {
    tmpV.fromBufferAttribute(g.attributes.position, i);
    const c = fixed || color(tmpV, tmpC);
    col.set([c.r, c.g, c.b], i * 3); m.set(mat, i * 3);
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.setAttribute('aMat', new THREE.BufferAttribute(m, 3));
  return g;
}
const mixHex = (a, b) => { const A = new THREE.Color(a), B = new THREE.Color(b); return (t, out) => out.copy(A).lerp(B, clamp(t, 0, 1)); };
// little ellipsoids (seeds): place(i) -> {p, n, s: Vector3 scale, spin}
function bits(count, place, color, mat) {
  const base = new THREE.SphereGeometry(1, 7, 4); base.deleteAttribute('uv');
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), q2 = new THREE.Quaternion();
  const out = [];
  for (let i = 0; i < count; i++) {
    const { p, n, s, spin = 0 } = place(i);
    q.setFromUnitVectors(up, n).multiply(q2.setFromAxisAngle(up, spin));
    out.push(paint(base.clone().applyMatrix4(m4.compose(p, q, s)), color, mat));
  }
  return out;
}

// ---------- The layers, top to bottom (same order as the menu) ----------
// stackY: where the layer sits in the closed burger (model units, burger centre at 0).
// menuY: a nudge so the candy sits centred on its menu row. h: height, for the squash.
function buildLayers() {
  const out = {};
  // Jason (2026-10-16): the logo's translucent neon gummy, not clip art: every layer is see-through jelly with a
  // wet gloss, in candy-bright colors
  const MILKY = [0.75, 0, 0.8], SEED = [0.2, 0, 0.7], CLEAR = [1, 0, 0.9], SOUR = [0.85, 0.8, 0.6];
  {
    const tone = mixHex('#ffd98a', '#ff8a1f');
    const geo = paint(slab({ R: (t) => 1.02 * (1 + 0.012 * Math.sin(3 * t)), top: 0.5, bot: 0.08, nTop: 2.3, nBot: 5, seg: 44, rows: 16 }),
      (v, c) => tone(smooth(0.04, 0.42, v.y), c), MILKY);
    const gold = 2.39996;
    const seeds = bits(13, (i) => {
      const r = 0.8 * Math.sqrt((i + 0.6) / 13), th = i * gold + 0.3;
      const c = Math.pow(clamp(r / 1.02, 0, 1), 2.3 / 2);
      const y = 0.5 * Math.pow(Math.sqrt(1 - c * c), 2 / 2.3);
      const p = new THREE.Vector3(r * Math.cos(th), y, -r * Math.sin(th));
      const n = new THREE.Vector3(p.x / 1.02, (y / 0.5) * 1.4, p.z / 1.02).normalize();
      p.addScaledVector(n, 0.006);
      return { p, n, s: new THREE.Vector3(0.08, 0.03, 0.045), spin: th * 1.7 + i };
    }, '#fff7e6', SEED);
    out['bun-top'] = { geo: mergeGeometries([geo, ...seeds]), h: 0.58, menuY: -0.18, stackY: 1.2 };
  }
  {
    const R = (t) => 1.1 * (1 + 0.035 * Math.sin(7 * t) + 0.02 * Math.sin(13 * t + 1));
    const tone = mixHex('#c4ff5a', '#28d43c');
    const geo = paint(slab({ R, top: 0.04, bot: 0.04, nTop: 2.4, nBot: 2.4, seg: 120, rows: 6, deform: (v, t) => {
      const r = Math.hypot(v.x, v.z);
      v.y += 0.08 * smooth(0.6, 1.12, r) * Math.sin(9 * t + 0.9 * Math.sin(3 * t)) + 0.022 * smooth(0.7, 1.15, r) * Math.sin(21 * t);
    } }), (v, c) => tone(smooth(0.5, 1.1, Math.hypot(v.x, v.z)), c), CLEAR);
    out.lettuce = { geo, h: 0.3, menuY: 0, stackY: 1.1 };
  }
  {
    const tone = mixHex('#ff6f5a', '#ff1340');
    const geo = paint(slab({ R: (t) => 0.93 * (1 + 0.015 * Math.sin(5 * t)), top: 0.09, bot: 0.09, nTop: 3, nBot: 3, seg: 40, rows: 10 }),
      (v, c) => tone(smooth(0.2, 0.85, Math.hypot(v.x, v.z)), c), CLEAR);
    const seeds = bits(18, (i) => {
      const loc = Math.floor(i / 3), k = i % 3;
      const th = (loc / 6) * Math.PI * 2 + 0.3 + (k - 1) * 0.16;
      const r = 0.45 + (k % 2) * 0.13;
      return { p: new THREE.Vector3(r * Math.cos(th), 0.078, -r * Math.sin(th)), n: new THREE.Vector3(0, 1, 0), s: new THREE.Vector3(0.06, 0.02, 0.035), spin: th };
    }, '#ffe9a6', [0.3, 0, 0.7]);
    out.tomato = { geo: mergeGeometries([geo, ...seeds]), h: 0.18, menuY: 0, stackY: 1.0 };
  }
  {
    const p = 7, rot = 0.22;
    const R = (t) => 1.0 / Math.pow(Math.pow(Math.abs(Math.cos(t - rot)), p) + Math.pow(Math.abs(Math.sin(t - rot)), p), 1 / p);
    const geo = paint(slab({ R, top: 0.05, bot: 0.05, nTop: 3, nBot: 3, seg: 64, rows: 12, deform: (v) => {
      v.y -= 0.42 * Math.pow(smooth(0.78, 1.42, Math.hypot(v.x, v.z)), 1.3);
    } }), '#ffe11a', [0.8, 0.4, 0.8]);
    out.cheese = { geo, h: 0.3, menuY: 0.08, stackY: 0.86, stackS: 0.9 };
  }
  {
    const R = (t) => 1.0 * (1 + 0.025 * Math.sin(5 * t + 1) + 0.018 * Math.sin(9 * t + 2) + 0.01 * Math.sin(17 * t));
    const geo = paint(slab({ R, top: 0.2, bot: 0.19, nTop: 3.4, nBot: 3.4, seg: 48, rows: 14, deform: (v) => {
      const k = noise3(v.x * 4.2, v.y * 4.2, v.z * 4.2) - 0.5;
      const len = Math.hypot(v.x, v.y * 2.5, v.z) || 1, s = 0.05 * k;
      v.x += (v.x / len) * s; v.y += (v.y * 2.5 / len) * s * 0.8; v.z += (v.z / len) * s;
    } }), '#b8501c', [0.95, 0, 1]);
    out.patty = { geo, h: 0.4, menuY: 0, stackY: 0.68 };
  }
  {
    const parts = [];
    const m4 = new THREE.Matrix4(), e = new THREE.Euler();
    [[-0.45, 0.04, 0.22, 0.1], [0.45, -0.02, -0.16, -0.08]].forEach(([x, y, rz, rx], j) => {
      m4.compose(new THREE.Vector3(x, y, j ? 0.05 : -0.05), new THREE.Quaternion().setFromEuler(e.set(rx, j * 2, rz)), new THREE.Vector3(1, 1, 1));
      parts.push(paint(slab({ R: (t) => 0.5 * (1 + 0.03 * Math.sin(16 * t)), top: 0.07, bot: 0.07, nTop: 2.6, nBot: 2.6, seg: 40, rows: 8 }), '#7dff3a', SOUR).applyMatrix4(m4));
      parts.push(paint(slab({ R: (t) => 0.33 * (1 + 0.05 * Math.sin(7 * t + 1)), top: 0.076, bot: 0.076, nTop: 2.4, nBot: 2.4, seg: 24, rows: 6 }), '#e6f5ae', [0.2, 0.4, 0.3]).applyMatrix4(m4));
    });
    out.pickle = { geo: mergeGeometries(parts), h: 0.2, menuY: 0, stackY: 1.0 };   // in the tomato's place (Scott 2026-10-16)
  }
  {
    const tone = mixHex('#ff8a1f', '#ffd98a');
    const geo = paint(slab({ R: (t) => 1.0 * (1 + 0.01 * Math.sin(4 * t)), top: 0.12, bot: 0.27, nTop: 3.2, nBot: 2.6, seg: 44, rows: 12 }),
      (v, c) => tone(smooth(0.02, 0.11, v.y), c), MILKY);
    out['bun-bottom'] = { geo, h: 0.36, menuY: 0.04, stackY: 0.27 };
  }
  for (const k in out) out[k].stackY -= 0.86;   // burger centre at 0
  return out;
}
const hash = (x, y, z) => { const s = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453; return s - Math.floor(s); };
function noise3(x, y, z) {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z), xf = x - xi, yf = y - yi, zf = z - zi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf), w = zf * zf * (3 - 2 * zf);
  const L = (a, b, t) => a + (b - a) * t, h = (i, j, k) => hash(xi + i, yi + j, zi + k);
  return L(L(L(h(0, 0, 0), h(1, 0, 0), u), L(h(0, 1, 0), h(1, 1, 0), u), v), L(L(h(0, 0, 1), h(1, 0, 1), u), L(h(0, 1, 1), h(1, 1, 1), u), v), w);
}

const outBack = (t) => { const s = 1.25, u = t - 1; return 1 + (s + 1) * u * u * u + s * u * u; };
const inOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

// button: the header's #Burger; menu: #Menu; slots: each row's (hidden) drawing, which sets where its candy
// sits; rows: the row links (hover/press make the candy jiggle); keys: the layer names, in row order.
export async function createGummyBurger({ button, menu, slots, rows, keys }) {
  const canvas = document.createElement('canvas');
  canvas.className = 'gummy-burger';
  canvas.setAttribute('aria-hidden', 'true');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setClearColor(0x000000, 0);
  const room = await warmRoom(renderer);
  gummyRenderer(renderer, room);

  const scene = new THREE.Scene();
  scene.environment = room.texture;
  const rig = new THREE.Group(); scene.add(rig);
  const camera = new THREE.OrthographicCamera(0, 1, 0, -1, 1, 4000);
  camera.position.z = 2000;
  rig.add(camera);
  const U = fastGummyUniforms();
  const mat = fastGummyMaterial(U);
  const parts = buildLayers();
  const L = keys.map((k, i) => {
    const p = parts[k];
    const holder = new THREE.Group(), bounce = new THREE.Group(), mesh = new THREE.Mesh(p.geo, mat);
    bounce.add(mesh); holder.add(bounce); rig.add(holder);
    return { k, i, ...p, holder, bounce, mesh, e: 0, e0: 0, e1: 0, t0: 0, dur: 1, ease: inOut, landed: true,
      s: 0, sv: 0, w: 0, wv: 0, lift: 0, liftV: 0, hover: false, mx: 0, my: 0 };
  });
  document.body.append(canvas);

  // ---------- where things are (CSS px; world units are CSS px with y flipped) ----------
  const btn = { x: 0, y: 0, ppu: 20 };
  let ppuM = 60, full = false, region = { x: 0, y: 0, w: 1, h: 1 }, pr = 1;
  const dprCap = Math.min(devicePixelRatio || 1, coarse ? 1.25 : 1.5);   // the open menu's big canvas: soft candy needs fewer pixels (final crit: open faster)
  let dprFull = dprCap;
  function measure() {
    const b = button.getBoundingClientRect();
    btn.x = b.left + b.width / 2; btn.y = b.top + b.height / 2 + b.height * 0.04;
    btn.ppu = (b.width * 0.9) / SPAN;
    if (menu.hidden) return;
    const rects = slots.map((s) => s.getBoundingClientRect());
    const w = Math.max(...rects.map((r) => r.width));
    if (!w) return;
    ppuM = (w * 0.86) / SPAN;
    L.forEach((l, i) => { const r = rects[i]; l.mx = r.left + r.width / 2; l.my = r.top + r.height / 2; });
  }
  function setRegion(isFull) {
    full = isFull;
    const vw = document.documentElement.clientWidth || innerWidth, vh = innerHeight;
    if (full) {
      // just the box that holds the button and every row's candy (plus room for jiggle), not the whole screen
      const b = button.getBoundingClientRect(), px = ppuM * 1.5, py = ppuM * 1.1;
      let x0 = b.left - 14, y0 = b.top - 14, x1 = b.right + 14, y1 = b.bottom + 14;
      for (const l of L) { x0 = Math.min(x0, l.mx - px); x1 = Math.max(x1, l.mx + px); y0 = Math.min(y0, l.my - py); y1 = Math.max(y1, l.my + py); }
      x0 = Math.max(0, Math.floor(x0)); y0 = Math.max(0, Math.floor(y0)); x1 = Math.min(vw, Math.ceil(x1)); y1 = Math.min(vh, Math.ceil(y1));
      region = { x: x0, y: y0, w: Math.max(1, x1 - x0), h: Math.max(1, y1 - y0) };
    }
    else { const pad = 14, b = button.getBoundingClientRect(); region = { x: Math.floor(b.left - pad), y: Math.floor(b.top - pad), w: Math.ceil(b.width + pad * 2), h: Math.ceil(b.height + pad * 2) }; }
    // the little button gets every device pixel (it is tiny and drawn once); the full view is capped
    pr = full ? dprFull : Math.min(devicePixelRatio || 1, 3);
    const st = canvas.style;
    st.left = `${region.x}px`; st.top = `${region.y}px`; st.width = `${region.w}px`; st.height = `${region.h}px`;
    st.zIndex = full ? '41' : '';
    if (canvas.width !== Math.floor(region.w * pr) || canvas.height !== Math.floor(region.h * pr)) { renderer.setPixelRatio(pr); renderer.setSize(region.w, region.h, false); }
    camera.left = region.x; camera.right = region.x + region.w; camera.top = -region.y; camera.bottom = -(region.y + region.h);
    camera.updateProjectionMatrix();
  }
  function layout() { measure(); setRegion(full); wake(); }
  addEventListener('resize', layout);
  visualViewport?.addEventListener('resize', layout);
  menu.addEventListener('scroll', () => { measure(); if (full) setRegion(true); wake(); }, { passive: true });

  // ---------- the lamp and the room follow the pointer (only while the menu is open, or over the button) ----------
  const ptr = { x: -1, y: -1, has: false };
  const lamp = new THREE.Vector3(), lampTo = new THREE.Vector3();
  const aim = new THREE.Vector2(-0.35, 0.45), aimTo = aim.clone(), AIM0 = aim.clone();
  let hoverBtn = false;
  function point(e) {
    if (e.pointerType === 'touch' && !full) return;
    ptr.x = e.clientX; ptr.y = e.clientY; ptr.has = true;
    if (full || hoverBtn) wake();
  }
  addEventListener('pointermove', point, { passive: true });
  addEventListener('pointerdown', point, { passive: true });
  function lampTarget() {
    if (full && ptr.has) {
      lampTo.set(ptr.x, ptr.y, 320);
      aimTo.set(clamp((ptr.x / innerWidth) * 2 - 1, -1, 1), clamp(-((ptr.y / innerHeight) * 2 - 1), -1, 1));
    } else if (!full && hoverBtn && ptr.has) {
      lampTo.set(ptr.x, ptr.y, 60); aimTo.copy(AIM0);
    } else if (full) {
      lampTo.set(L[0].mx - ppuM, L[0].my - ppuM, 320); aimTo.copy(AIM0);
    } else { lampTo.set(btn.x - 26, btn.y - 34, 60); aimTo.copy(AIM0); }
  }

  // ---------- jelly ----------
  const wob = { b: 0, bv: 0, sc: 1, scv: 0 };
  const kick = (l, squash, w) => { if (reduce) return; l.sv += squash; l.wv += w; wake(); };
  rows.forEach((row, i) => {
    const on = () => { if (!L[i].hover) { L[i].hover = true; kick(L[i], 3.2, 5); } };
    const off = () => { L[i].hover = false; wake(); };
    row.addEventListener('pointerenter', (e) => { if (e.pointerType !== 'touch') on(); });
    row.addEventListener('focus', () => { if (row.matches(':focus-visible')) on(); });
    row.addEventListener('pointerleave', off); row.addEventListener('blur', off);
    row.addEventListener('pointerdown', () => kick(L[i], 4, -6));
  });
  button.addEventListener('pointerenter', (e) => {
    if (e.pointerType === 'touch') return;
    hoverBtn = true; ptr.x = e.clientX; ptr.y = e.clientY; ptr.has = true;
    if (!reduce) { wob.bv += 7; L.forEach((l) => (l.sv += 1.2)); }
    wake();
  });
  button.addEventListener('pointerleave', () => { hoverBtn = false; wake(); });
  button.addEventListener('pointerdown', () => { if (!reduce && !full) { wob.bv -= 5; L.forEach((l) => (l.sv += 2.5)); wake(); } });

  // idle: now and then the closed burger jiggles top to bottom, like the logo's letters puffing
  if (!reduce) setInterval(() => {
    if (full || document.hidden || menu.classList.contains('open')) return;
    L.forEach((l) => setTimeout(() => kick(l, 2.4, l.i % 2 ? 3 : -3), l.i * 70));
    wob.bv += 4;
  }, 5200);

  // ---------- open / close: every layer tweens e from 0 (stacked in the button) to 1 (on its row) ----------
  let closing = false;
  function go(to) {
    const now = performance.now();
    L.forEach((l) => {
      l.e0 = l.e; l.e1 = to; l.landed = false;
      if (reduce) { l.e = to; l.dur = 0; l.t0 = now; return; }
      if (to) { l.t0 = now + 30 + l.i * 38; l.dur = 560; l.ease = outBack; }
      else { l.t0 = now + (L.length - 1 - l.i) * 22; l.dur = 400; l.ease = inOut; }
    });
  }

  let raf = 0, last = 0, slow = 0, fast = 0, ema = 16;
  const wake = () => { if (!raf) raf = requestAnimationFrame(frame); };
  function frame(now) {
    raf = 0;
    const dt = Math.min((now - (last || now)) / 1000, 0.05); last = now;
    let busy = false;
    lampTarget();
    if (!lamp.z) lamp.copy(lampTo);
    lamp.lerp(lampTo, 1 - Math.exp(-dt * 10));
    aim.lerp(aimTo, 1 - Math.exp(-dt * 5));
    if (lamp.distanceToSquared(lampTo) > 0.5 || aim.distanceToSquared(aimTo) > 1e-6) busy = true;
    envRig(rig, room.rotation + aim.x * 0.9, aim.y * 0.25);
    U.uLamp.value.set((lamp.x - region.x) * pr, (region.y + region.h - lamp.y) * pr, lamp.z * pr);

    // the little burger's wobble and hover pop
    wob.bv += (-150 * wob.b - 7 * wob.bv) * dt; wob.b += wob.bv * dt;
    const scTo = hoverBtn && !full ? 1.08 : 1;
    wob.scv += (-(wob.sc - scTo) * 260 - 20 * wob.scv) * dt; wob.sc += wob.scv * dt;
    if (Math.abs(wob.b) + Math.abs(wob.bv) + Math.abs(wob.sc - scTo) + Math.abs(wob.scv) > 1e-3) busy = true;

    for (const l of L) {
      if (!l.landed) {
        const p = l.dur ? clamp((now - l.t0) / l.dur, 0, 1) : 1;
        l.e = l.e0 + (l.e1 - l.e0) * l.ease(p);
        if (p >= 1) {
          l.landed = true; l.e = l.e1;
          if (l.e1) kick(l, 2.2, l.i % 2 ? 2.5 : -2.5); else kick(l, 1.2, 0);
        } else busy = true;
      }
      l.sv += (-230 * l.s - 6 * l.sv) * dt; l.s += l.sv * dt;      // loose, jelly-like springs
      l.wv += (-150 * l.w - 5 * l.wv) * dt; l.w += l.wv * dt;
      const liftTo = l.hover && full ? 0.16 : 0;
      l.liftV += (-(l.lift - liftTo) * 160 - 14 * l.liftV) * dt; l.lift += l.liftV * dt;
      if (Math.abs(l.s) + Math.abs(l.sv) + Math.abs(l.w) + Math.abs(l.wv) + Math.abs(l.liftV) + Math.abs(l.lift - liftTo) > 2e-3) busy = true;

      const e = l.e, ec = clamp(e, 0, 1), k = 1 - ec;
      const sB = btn.ppu * wob.sc;
      // stacked: the burger is tilted as a whole, so a layer's height shows as screen y (and depth)
      const sx = btn.x + wob.b * l.stackY * sB * 0.12;
      const sy = btn.y - l.stackY * Math.cos(TILT_BTN) * sB;
      const sz = l.stackY * Math.sin(TILT_BTN) * sB;
      const sc = sB * (l.stackS || 1) * k + ppuM * e;
      l.holder.position.set(sx + (l.mx - sx) * ec, -(sy + (l.my - sy) * ec) + l.lift * ppuM * ec, sz * k);
      l.holder.scale.setScalar(sc);
      const spin = Math.sin(Math.PI * ec) * 0.6 * (l.i % 2 ? 1 : -1);
      l.holder.rotation.set(TILT_BTN + (TILT_MENU - TILT_BTN) * ec - aim.y * 0.1 * ec + l.w * 0.05,
        aim.x * 0.16 * ec + spin, l.w * 0.09 + wob.b * 0.05 * k);
      l.mesh.position.y = l.menuY * ec;
      const s = clamp(l.s, -0.6, 0.8);
      l.bounce.scale.set(1 + s * 0.2, 1 - s * 0.36, 1 + s * 0.2);
      l.bounce.position.y = -s * 0.36 * l.h * 0.5;
    }
    renderer.render(scene, camera);

    if (full && dt > 0 && dt < 0.1) {   // adaptive resolution while the big view runs
      ema += (dt * 1000 - ema) * 0.1;
      if (ema > 22) { if (++slow > 20 && dprFull > 1) { dprFull = Math.max(1, dprFull - 0.25); slow = 0; setRegion(true); } } else slow = 0;
      if (ema < 12) { if (++fast > 150 && dprFull < dprCap) { dprFull = Math.min(dprCap, dprFull + 0.25); fast = 0; setRegion(true); } } else fast = 0;
    }
    // once every layer is back in the stack, drop back to the button's own little box (the last wobble
    // plays out there, then it idles)
    if (closing && L.every((l) => l.landed)) { closing = false; setRegion(false); busy = true; }
    if (busy) wake(); else last = 0;
  }

  function night() {
    const on = document.body.classList.contains('spooky');
    renderer.toneMappingExposure = room.exposure * (on ? 0.8 : 1);
    U.uLampOn.value = on ? 1.5 : 1;
    wake();
  }
  addEventListener('grumpl-night', night);
  night();

  measure(); setRegion(false);
  renderer.compile(scene, camera);
  frame(performance.now());

  const api = {
    canvas,
    open() {
      closing = false; measure(); setRegion(true);
      L.forEach((l) => { l.hover = false; });
      // grow the canvas and draw one still frame now; the flight starts on the next frame, so the cost of
      // the resize never lands inside the animation as a jump
      if (raf) { cancelAnimationFrame(raf); raf = 0; }
      frame(performance.now());
      if (raf) { cancelAnimationFrame(raf); raf = 0; }
      requestAnimationFrame(() => { go(1); wake(); });
    },
    close() {
      measure(); closing = true; go(0); wake();
    },
    debug: { L, renderer, scene, camera, U, wake, get region() { return region; } },
  };
  return api;
}
