// Every clickable thing, rendered in 3D (Scott, 2026-10-16): each button is a puffed-up cushion of its own shape,
// facing the camera dead on, in the selected Grumpl's finish (finish.js), lit by the forest room and the cursor light.
// One small offscreen renderer draws every button in turn into its own 2D canvas behind the label, only when
// something changed: the finish, the cursor, the room's turn, a hover or a press, a resize.
//   skin(el, { shape: 'pill' | 'round' | 'x', color: css color or var name, edge })
// The element keeps its label, layout and click handling; only its painted box is replaced.
import * as THREE from 'three';
import { ROOM, roomEnv, turnEnv, setTurn, roomAim, turnRoom, NEUTRAL_TM } from './room.js';
import { finish, onFinish, skinParams, SKIN_KEYS, cursor, onCursor, CURSOR_LIGHT } from './finish.js';

const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const PAD = 6;                        // css px of room round each button for the antialiased rim
const items = new Set();
let R = null, scene, cam, light, key, envRot, ready = null, raf = 0;

function boot() {
  if (ready) return ready;
  const canvas = document.createElement('canvas');
  R = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, premultipliedAlpha: false, preserveDrawingBuffer: false });
  R.setPixelRatio(1); R.setSize(256, 128, false);
  R.setClearColor(0x000000, 0); R.autoClear = false;
  R.toneMapping = NEUTRAL_TM; R.toneMappingExposure = ROOM.exposure;
  scene = new THREE.Scene();
  cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 1, 2000); cam.position.set(0, 0, 1000);
  // the studio's key, high and to the left, kept soft; the cursor light does the moving
  key = new THREE.DirectionalLight(0xfff4ea, 1.5); key.position.set(-0.6, 0.8, 0.9); scene.add(key);
  scene.add(new THREE.HemisphereLight(0xffffff, 0xf2f0f6, 1.1));   // the white sweep's bounce: whites stay white
  light = new THREE.PointLight(0xffffff, CURSOR_LIGHT, 0, 0); scene.add(light);
  envRot = { value: new THREE.Matrix3() };
  ready = roomEnv(R).then((env) => { scene.environment = env; items.forEach((it) => it.dirty = true); wake(); });
  onFinish(() => { const now = performance.now(); items.forEach((it) => retarget(it, now)); wake(); });
  onCursor(() => { items.forEach((it) => { if (it.seen) it.dirty = true; }); wake(); });
  addEventListener('scroll', () => wake(), { passive: true });
  return ready;
}

// ---- geometry: a cushion over a rounded rectangle (half sizes a, b, corner radius r), puffed to depth d.
// Rings step inward from the outline; z follows a quarter circle, so the rim stands vertical like a pillow's seam.
const geoCache = new Map();
function ringPoint(a, b, r, u, out) {
  // u in [0,4): one unit per corner arc + the straight edge after it, walked anticlockwise from the right edge
  const q = Math.floor(u) % 4, f = u - Math.floor(u);
  const cx = [a - r, -(a - r), -(a - r), a - r][q], cy = [b - r, b - r, -(b - r), -(b - r)][q];
  const ang = (q * Math.PI) / 2 + f * Math.PI / 2;
  out[0] = cx + Math.cos(ang) * r; out[1] = cy + Math.sin(ang) * r;
}
function cushion(a, b, r, d) {
  const k = `${a.toFixed(1)}|${b.toFixed(1)}|${r.toFixed(1)}|${d.toFixed(1)}`;
  if (geoCache.has(k)) return geoCache.get(k);
  const T = Math.min(a, b), RINGS = 12;
  // points round the outline: each corner arc, then its straight edge, sampled with fixed counts so rings line up
  const nArc = 9, nH = Math.max(1, Math.round((2 * (a - r)) / 14)), nV = Math.max(1, Math.round((2 * (b - r)) / 14));
  const us = [];   // [u along corners, edge share]
  for (let q = 0; q < 4; q++) {
    for (let i = 0; i < nArc; i++) us.push({ q, arc: i / nArc });
    const n = q % 2 === 0 ? nH : nV;
    for (let i = 0; i < n; i++) us.push({ q, edge: i / n });
  }
  const N = us.length, pos = [], rim = [], idx = [], p = [0, 0];
  for (let k2 = 0; k2 <= RINGS; k2++) {
    const s = 1 - Math.cos((k2 / RINGS) * Math.PI / 2);         // dense near the rim
    const t = s * T * 0.999, aa = a - t, bb = b - t;
    // corners get rounder inward (never a sharp mitre), so the cushion has no creases running into its corners
    const rr = Math.min(Math.min(aa, bb), Math.max(0, r - t) + (Math.min(aa, bb) - Math.max(0, r - t)) * s);
    const z = d * Math.sqrt(Math.max(0, 1 - (1 - s) * (1 - s)));
    for (const e of us) {
      if (e.arc !== undefined) ringPoint(aa, bb, rr, e.q + e.arc, p);
      else {
        // the straight edge after corner q: from the end of arc q to the start of arc q+1
        const p0 = [0, 0], p1 = [0, 0];
        ringPoint(aa, bb, rr, e.q + 0.99999, p0); ringPoint(aa, bb, rr, (e.q + 1) % 4, p1);
        p[0] = p0[0] + (p1[0] - p0[0]) * e.edge; p[1] = p0[1] + (p1[1] - p0[1]) * e.edge;
      }
      pos.push(p[0], p[1], z); rim.push((1 - s) * (1 - s));
    }
  }
  for (let k2 = 0; k2 < RINGS; k2++) for (let i = 0; i < N; i++) {
    const a0 = k2 * N + i, a1 = k2 * N + (i + 1) % N, b0 = a0 + N, b1 = a1 + N;
    idx.push(a0, a1, b1, a0, b1, b0);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('rim', new THREE.Float32BufferAttribute(rim, 1));
  g.setIndex(idx); g.computeVertexNormals();
  geoCache.set(k, g);
  return g;
}
// the close X: two capsules crossed
function crossGeo(size, thick) {
  const k = `x|${size.toFixed(1)}|${thick.toFixed(1)}`;
  if (geoCache.has(k)) return geoCache.get(k);
  const len = size * 0.5, b = thick / 2;
  const one = cushion(len, b, b, b * 1.1);
  const g1 = one.clone().rotateZ(Math.PI / 4), g2 = one.clone().rotateZ(-Math.PI / 4).translate(0, 0, 0.6);
  const g = mergeTwo(g1, g2);
  geoCache.set(k, g);
  return g;
}
function mergeTwo(g1, g2) {
  const g = new THREE.BufferGeometry(), n1 = g1.attributes.position.count;
  for (const name of ['position', 'normal', 'rim']) {
    const A = g1.attributes[name], B = g2.attributes[name];
    const arr = new Float32Array(A.array.length + B.array.length); arr.set(A.array); arr.set(B.array, A.array.length);
    g.setAttribute(name, new THREE.BufferAttribute(arr, A.itemSize));
  }
  const i1 = g1.index.array, i2 = g2.index.array, ii = new Uint32Array(i1.length + i2.length);
  ii.set(i1); for (let i = 0; i < i2.length; i++) ii[i1.length + i] = i2[i] + n1;
  g.setIndex(new THREE.BufferAttribute(ii, 1));
  return g;
}

// ---- the material: physical, turned with the room, with the airbrushed edge color glowing in at the rim
function makeMat() {
  const m = new THREE.MeshPhysicalMaterial({ transparent: true });
  m.userData.u = { uEdge: { value: new THREE.Color() }, uEdgeAmt: { value: 0.7 }, uFuzz: { value: 0 } };
  m.onBeforeCompile = (sh) => {
    turnEnv(sh, envRot);
    Object.assign(sh.uniforms, m.userData.u);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float rim; varying float vRim; varying vec2 vXY;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvRim = rim; vXY = position.xy;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
      uniform vec3 uEdge; uniform float uEdgeAmt, uFuzz; varying float vRim; varying vec2 vXY;
      float skHash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        diffuseColor.rgb = mix(diffuseColor.rgb, uEdge, uEdgeAmt * smoothstep(0.25, 0.95, vRim));
        diffuseColor.rgb *= 1.0 - uFuzz * 0.12 * skHash(floor(vXY * 1.5));`);
  };
  m.customProgramCacheKey = () => 'skin3d';
  return m;
}
function applyMat(it) {
  const m = it.mat, c = it.cur;
  SKIN_KEYS.NUM.forEach((n) => { if (n in m && n !== 'opacity') m[n] = c[n]; });
  m.opacity = c.opacity; m.color.copy(c.color); m.sheenColor.copy(c.sheenColor);
  m.userData.u.uEdge.value.copy(c.edge); m.userData.u.uEdgeAmt.value = c.edgeAmt; m.userData.u.uFuzz.value = c.fuzz;
}
function colorOf(it) {
  const cs = getComputedStyle(it.el);
  const read = (v, fb) => { const s = cs.getPropertyValue(v).trim(); return s || fb; };
  return { c: read('--skin', it.opts.color || '#ffffff'), e: read('--skin-edge', it.opts.edge || '') };
}
const cssColor = (() => {
  const cv = document.createElement('canvas').getContext('2d');
  return (s, fb = '#ffffff') => { cv.fillStyle = fb; cv.fillStyle = s; return cv.fillStyle; };
})();
function retarget(it, now = performance.now()) {
  const { c, e } = colorOf(it);
  const col = cssColor(c), edge = cssColor(e || c);
  it.target = skinParams(finish.kind, col, edge);
  if (!it.cur) { it.cur = skinParams(finish.kind, col, edge); applyMat(it); }
  const r = it.el.getBoundingClientRect();
  it.startAt = now + (reduce ? 0 : Math.max(0, Math.min(1, (r.left + r.width / 2) / innerWidth)) * 420);
  it.anim = true; it.dirty = true;
}

// ---- the elements
export function skin(el, opts = {}) {
  if (!el || el.__skin) return;
  boot();
  const cv = document.createElement('canvas');
  cv.className = 'skin3d'; cv.setAttribute('aria-hidden', 'true');
  el.prepend(cv);
  if (getComputedStyle(el).position === 'static') el.style.position = 'relative';
  el.classList.add('skinned');
  const it = { el, cv, ctx: cv.getContext('2d'), opts, mat: makeMat(), mesh: null, w: 0, h: 0, seen: true, dirty: true,
    hover: 0, hv: 0, press: 0, pv: 0, wantHover: 0, wantPress: 0, anim: false };
  el.__skin = it;
  it.mesh = new THREE.Mesh(undefined, it.mat);
  retarget(it); it.startAt = 0;
  new ResizeObserver(() => { size(it); wake(); }).observe(el);
  new IntersectionObserver(([en]) => { it.seen = en.isIntersecting; if (it.seen) { it.dirty = true; wake(); } }).observe(el);
  el.addEventListener('pointerenter', () => { it.wantHover = 1; wake(); });
  el.addEventListener('pointerleave', () => { it.wantHover = 0; it.wantPress = 0; wake(); });
  el.addEventListener('pointerdown', () => { it.wantPress = 1; wake(); });
  const up = () => { if (it.wantPress) { it.wantPress = 0; it.pv += 6; wake(); } };
  el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
  // colors that come from CSS variables can change with the flavor: look again after any style change
  new MutationObserver(() => { retarget(it); wake(); }).observe(el, { attributes: true, attributeFilter: ['style', 'class', 'aria-pressed'] });
  // a label rewritten with innerHTML takes the canvas with it: put it back
  new MutationObserver(() => { if (cv.parentNode !== el) { el.prepend(cv); it.dirty = true; wake(); } }).observe(el, { childList: true });
  size(it); wake();
  return it;
}
export function reskin() { const now = performance.now(); items.forEach((it) => retarget(it, now)); wake(); }

function size(it) {
  const el = it.el, w = el.offsetWidth, h = el.offsetHeight;
  if (!w || !h) { it.w = it.h = 0; return; }
  items.add(it);
  if (w === it.w && h === it.h) return;
  it.w = w; it.h = h;
  const dpr = Math.min(devicePixelRatio || 1, 2);
  it.dpr = dpr;
  const bw = parseFloat(getComputedStyle(el).borderTopWidth) || 0;
  Object.assign(it.cv.style, { left: `${-PAD - bw}px`, top: `${-PAD - bw}px`, width: `${w + PAD * 2}px`, height: `${h + PAD * 2}px` });
  it.cv.width = Math.round((w + PAD * 2) * dpr); it.cv.height = Math.round((h + PAD * 2) * dpr);
  const shape = it.opts.shape || (Math.abs(w - h) < 2 && parseFloat(getComputedStyle(el).borderTopLeftRadius) >= w / 2 - 1 ? 'round' : 'pill');
  const a = w / 2, b = h / 2;
  if (shape === 'x') it.mesh.geometry = crossGeo(Math.min(w, h) * 1.25, Math.min(w, h) * 0.3);
  else {
    const cs = getComputedStyle(el);
    const rad = ['TopLeft', 'TopRight', 'BottomRight', 'BottomLeft'].map((k) => parseFloat(cs[`border${k}Radius`]) || 0);
    const r = shape === 'round' ? Math.min(a, b) : Math.min(Math.min(a, b), Math.max(6, rad.reduce((x, y) => x + y) / 4));
    it.mesh.geometry = cushion(a, b, r, Math.min(a, b) * (it.opts.depth ?? 0.95));
  }
  it.dirty = true;
}

// ---- drawing
function wake() { if (!raf) raf = requestAnimationFrame(frame); }
let last = 0;
function frame(now) {
  raf = 0; skinStats.frames++;
  if (!scene?.environment) return;
  const dt = Math.min(0.05, (now - (last || now)) / 1000); last = now;
  const roomMoving = turnRoom(now);
  setTurn(envRot, roomAim.x * 0.9, roomAim.y * 0.25);
  let more = roomMoving;
  for (const it of items) {
    if (!it.seen || !it.w) continue;
    if (roomMoving) it.dirty = true;
    // hover swells, a press squashes and springs back
    if (!reduce) {
      it.hv += ((it.wantHover - it.hover) * 260 - it.hv * 18) * dt; it.hover += it.hv * dt;
      it.pv += ((it.wantPress - it.press) * 420 - it.pv * 20) * dt; it.press += it.pv * dt;
      if (Math.abs(it.hv) + Math.abs(it.pv) + Math.abs(it.wantHover - it.hover) + Math.abs(it.wantPress - it.press) > 0.002) { it.dirty = true; more = true; }
    }
    if (it.anim) {
      if (now >= it.startAt) {
        const k = 1 - Math.exp(-dt * 7);
        let left = 0;
        SKIN_KEYS.NUM.forEach((n) => { it.cur[n] += (it.target[n] - it.cur[n]) * k; left += Math.abs(it.target[n] - it.cur[n]); });
        SKIN_KEYS.COL.forEach((n) => { it.cur[n].lerp(it.target[n], k); });
        applyMat(it);
        if (left < 0.003) { SKIN_KEYS.NUM.forEach((n) => it.cur[n] = it.target[n]); SKIN_KEYS.COL.forEach((n) => it.cur[n].copy(it.target[n])); applyMat(it); it.anim = false; }
      }
      it.dirty = true; more = more || it.anim;
    }
    if (it.dirty) draw(it);
  }
  if (more) wake();
}
export const skinStats = { draws: 0, frames: 0 };
window.__skin = { items, skinStats };
function draw(it) {
  it.dirty = false; skinStats.draws++;
  const W = it.w + PAD * 2, H = it.h + PAD * 2, pw = it.cv.width, ph = it.cv.height;
  const cw = R.domElement.width, ch = R.domElement.height;
  if (pw > cw || ph > ch) R.setSize(Math.max(cw, pw), Math.max(ch, ph), false);
  const fullH = R.domElement.height;
  cam.left = -W / 2; cam.right = W / 2; cam.top = H / 2; cam.bottom = -H / 2; cam.updateProjectionMatrix();
  // the cursor light, placed where the pointer is relative to this button, a little in front of the screen
  const r = it.el.getBoundingClientRect();
  light.position.set(cursor.x - (r.left + r.width / 2), -(cursor.y - (r.top + r.height / 2)), 260);
  light.intensity = CURSOR_LIGHT;
  const sx = 1 + it.hover * 0.025 - it.press * 0.035;
  it.mesh.scale.set(sx, sx, Math.max(0.2, 1 + it.hover * 0.25 - it.press * 0.55));
  scene.add(it.mesh);
  R.setViewport(0, 0, pw, ph); R.setScissor(0, 0, pw, ph); R.setScissorTest(true);
  R.clear(); R.render(scene, cam);
  R.setScissorTest(false);
  scene.remove(it.mesh);
  it.ctx.clearRect(0, 0, pw, ph);
  it.ctx.drawImage(R.domElement, 0, fullH - ph, pw, ph, 0, 0, pw, ph);
}
