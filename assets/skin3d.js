// Every clickable thing, rendered in 3D (Scott, 2026-10-16): each button is a puffed-up cushion of its own shape,
// facing the camera dead on, in the selected Grumpl's finish (finish.js), lit by the forest room and the cursor light.
// One small offscreen renderer draws every button in turn into its own 2D canvas behind the label, only when
// something changed: the finish, the cursor, the room's turn, a hover or a press, a resize.
//   skin(el, { shape: 'pill' | 'round' | 'x', color: css color or var name, edge })
// The element keeps its label, layout and click handling; only its painted box is replaced.
import * as THREE from 'three';
import { ROOM, roomEnv, turnEnv, setTurn, roomAim, turnRoom, NEUTRAL_TM } from './room.js';
import { onFinish, skinParams, SKIN_KEYS, cursor, onCursor, CURSOR_LIGHT } from './finish.js';

const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const PAD = 14;                       // css px of room round each button for its sides, rim and contact shadow
const SHEAR = { x: -0.32, y: 0.5 };    // how far the face sits up and left of the base, per px of depth: the sides show down and right
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

// ---- geometry (Scott 2026-10-16): not a puffed cushion but a thick slab of gummy. The button's own outline
// (its CSS corners) extruded toward the viewer with a small rounded bevel, so it reads as a block with depth.
// The X is one merged silhouette (a plus turned 45 degrees), so it has one rim, not two crossing pills.
const geoCache = new Map();
function roundedRect(a, b, r) {
  const s = new THREE.Shape();
  s.moveTo(-a + r, -b); s.lineTo(a - r, -b); s.quadraticCurveTo(a, -b, a, -b + r);
  s.lineTo(a, b - r); s.quadraticCurveTo(a, b, a - r, b); s.lineTo(-a + r, b);
  s.quadraticCurveTo(-a, b, -a, b - r); s.lineTo(-a, -b + r); s.quadraticCurveTo(-a, -b, -a + r, -b);
  return s;
}
function crossShape(size, thick) {
  // a plus with arms of width `thick` and reach size/2, corners softened, turned 45 degrees
  const h = size / 2, t = thick / 2, r = Math.min(t * 0.9, 3);
  const pts = [[t, t], [t, h], [-t, h], [-t, t], [-h, t], [-h, -t], [-t, -t], [-t, -h], [t, -h], [t, -t], [h, -t], [h, t]];
  const c = Math.SQRT1_2, P = pts.map(([x, y]) => new THREE.Vector2((x - y) * c, (x + y) * c));
  const s = new THREE.Shape(), n = P.length;
  // round every corner a little: cut each corner by r and curve through it
  for (let i = 0; i < n; i++) {
    const p0 = P[(i - 1 + n) % n], p1 = P[i], p2 = P[(i + 1) % n];
    const a0 = p1.clone().add(p0.clone().sub(p1).setLength(r)), a1 = p1.clone().add(p2.clone().sub(p1).setLength(r));
    if (i === 0) s.moveTo(a0.x, a0.y); else s.lineTo(a0.x, a0.y);
    s.quadraticCurveTo(p1.x, p1.y, a1.x, a1.y);
  }
  s.closePath();
  return s;
}
function slab(shape, key, d) {
  const k = `${key}|${d.toFixed(1)}`;
  if (geoCache.has(k)) return geoCache.get(k);
  const bev = Math.min(4, d * 0.4);
  const g = new THREE.ExtrudeGeometry(shape, { depth: Math.max(0.5, d - bev), bevelEnabled: true, bevelThickness: bev, bevelSize: bev * 0.85,
    bevelOffset: -bev * 0.85, bevelSegments: 4, curveSegments: 10 });
  // the extrusion runs from z = -bev to d; the back is never seen, so drop nothing but keep the front at z = d
  g.translate(0, 0, bev * 0 + 0);
  g.computeBoundingBox();
  const z0 = g.boundingBox.min.z, z1 = g.boundingBox.max.z;
  g.translate(0, 0, -z0);
  g.userData.depth = z1 - z0;
  geoCache.set(k, g);
  return g;
}
const rectGeo = (a, b, r, d) => slab(roundedRect(a, b, Math.min(r, a, b)), `r|${a.toFixed(1)}|${b.toFixed(1)}|${r.toFixed(1)}`, d);
const crossGeo = (size, thick, d) => slab(crossShape(size, thick), `x|${size.toFixed(1)}|${thick.toFixed(1)}`, d);

// the contact shadow: a tight, soft darkening right under the slab's outline, like ambient occlusion where it
// meets the page (not a drop shadow). A quad with a rounded-rect distance field.
function shadowMat() {
  return new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: { uScale: { value: new THREE.Vector2(1, 1) }, uHalf: { value: new THREE.Vector2(10, 10) }, uR: { value: 4 }, uSoft: { value: 4 }, uAmt: { value: 0.28 }, uCross: { value: 0 } },
    vertexShader: 'uniform vec2 uScale; varying vec2 vP; void main() { vP = position.xy * uScale; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `uniform vec2 uHalf; uniform float uR, uSoft, uAmt, uCross; varying vec2 vP;
      float box(vec2 p, vec2 b, float r) { vec2 q = abs(p) - b + r; return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r; }
      void main() {
        float d;
        if (uCross > 0.5) {
          vec2 p = mat2(0.70710678, -0.70710678, 0.70710678, 0.70710678) * vP;
          d = min(box(p, vec2(uHalf.x, uHalf.y), uR), box(p, vec2(uHalf.y, uHalf.x), uR));
        } else d = box(vP, uHalf, uR);
        float a = uAmt * (1.0 - smoothstep(-uSoft * 0.6, uSoft, d));
        gl_FragColor = vec4(0.04, 0.03, 0.06, a);
      }`,
  });
}

// ---- the material: gummy you can see into (Scott 2026-10-16, after the puff logo's gummy): clear-coated, the
// room's light on top, the page showing through the face, the colour deepening and going opaque toward the
// edges and down the sides, and a soft glow through the middle where the light passes through.
function makeMat() {
  const m = new THREE.MeshPhysicalMaterial({ transparent: true });
  m.userData.u = { uEdge: { value: new THREE.Color() }, uEdgeAmt: { value: 0.7 }, uDepth: { value: 10 }, uGlow: { value: 0 }, uJelly: { value: 1 } };
  m.onBeforeCompile = (sh) => {
    turnEnv(sh, envRot);
    Object.assign(sh.uniforms, m.userData.u);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying float vZ;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvZ = position.z;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
      uniform vec3 uEdge; uniform float uEdgeAmt, uDepth, uGlow, uJelly; varying float vZ;`)
      .replace('#include <opaque_fragment>', `{
        vec3 base = diffuseColor.rgb;
        float ndv = saturate(dot(normal, geometryViewDir));
        float fres = pow(1.0 - ndv, 2.0);
        float side = 1.0 - smoothstep(0.55, 0.95, vZ / uDepth);        // 1 down the sides, 0 on the face
        vec3 deep = mix(base, uEdge, uEdgeAmt) * 0.85;
        outgoingLight *= mix(vec3(1.0), deep * 1.25 + 0.04, max(fres, side * 0.8) * 0.8 * uJelly);
        outgoingLight += base * 0.3 * pow(ndv, 1.5) * (1.0 - side) * uJelly;   // lit through the middle
        // a nightlight inside the jelly: light scattering out through a dense body, brightest where it's thickest
        outgoingLight += mix(base, vec3(1.0), 0.25) * uGlow * (0.65 * pow(ndv, 1.3) + 0.2 * (1.0 - side));
        diffuseColor.a = mix(diffuseColor.a, 0.97, max(fres * 0.9, side * 0.75));
      }
      #include <opaque_fragment>`);
  };
  m.customProgramCacheKey = () => 'skin3d-gummy';
  return m;
}
function applyMat(it) {
  const m = it.mat, c = it.cur;
  SKIN_KEYS.NUM.forEach((n) => { if (n in m && n !== 'opacity') m[n] = c[n]; });
  m.opacity = c.opacity; m.color.copy(c.color); m.sheenColor.copy(c.sheenColor);
  m.userData.u.uEdge.value.copy(c.edge); m.userData.u.uEdgeAmt.value = c.edgeAmt;
  m.userData.u.uJelly.value = it.kind === 'jelly' ? 1 : 0;
  if (it.kind === 'pearl') { m.emissive.set('#ffffff'); m.emissiveIntensity = 0.32; } else m.emissiveIntensity = 0;
  it.glow = it.kind === 'jelly' && it.opts.dot && it.el.getAttribute('aria-pressed') === 'true' ? 1 : 0;
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
// Each button's look (Scott 2026-10-16): jelly by default, tinted by its own colour; anything meant to be pure white
// is the logo cloud's pearl white instead; the flavor bar and its arrows are matte black plastic (no cursor light);
// the chosen flavor dot is a jelly nightlight.
const PEARL = { color: new THREE.Color('#f7f5f2'), sheenColor: new THREE.Color('#ffffff'), metalness: 0, roughness: 0.55, clearcoat: 0.15, clearcoatRoughness: 0.3,
  sheen: 0.6, sheenRoughness: 0.5, envMapIntensity: 1, opacity: 1, edgeAmt: 0, fuzz: 0 };
function looks(it, col, edge) {
  const white = /^#f[ef]f[ef]f[ef]$|^#fffff[ef]$/i.test(col) || col.toLowerCase() === '#ffffff';
  it.kind = it.opts.matte ? 'matte' : white ? 'pearl' : 'jelly';
  if (it.kind === 'pearl') return { ...PEARL, color: PEARL.color.clone(), sheenColor: PEARL.sheenColor.clone(), edge: new THREE.Color(edge) };
  const p = skinParams('gummy', col, edge);
  if (it.kind === 'matte') Object.assign(p, { roughness: 0.72, clearcoat: 0.05, clearcoatRoughness: 0.6, sheen: 0.25, envMapIntensity: 0.35, opacity: 1, edgeAmt: 0.25 });
  else if (it.opts.dot && it.el.getAttribute('aria-pressed') !== 'true') Object.assign(p, { roughness: 0.45, clearcoat: 0.3, envMapIntensity: 0.6, opacity: 1, edgeAmt: 0.5 });
  return p;
}
function retarget(it, now = performance.now()) {
  const { c, e } = colorOf(it);
  const col = cssColor(c), edge = cssColor(e || c);
  it.target = looks(it, col, edge);
  if (!it.cur) { it.cur = looks(it, col, edge); applyMat(it); }
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
  const it = { el, cv, ctx: cv.getContext('2d'), opts, mat: makeMat(), mesh: null, shadow: null, d: 8, w: 0, h: 0, seen: true, dirty: true,
    hover: 0, hv: 0, press: 0, pv: 0, wantHover: 0, wantPress: 0, anim: false };
  el.__skin = it;
  it.mesh = new THREE.Mesh(undefined, it.mat); it.mesh.matrixAutoUpdate = false;
  it.shadow = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), shadowMat()); it.shadow.renderOrder = -1;
  retarget(it); it.startAt = 0;
  new ResizeObserver(() => { size(it); wake(); }).observe(el);
  new IntersectionObserver(([en]) => { it.seen = en.isIntersecting; if (it.seen) { it.dirty = true; wake(); } }).observe(el);
  el.addEventListener('pointerenter', () => { it.wantHover = 1; wake(); });
  el.addEventListener('pointerleave', () => { it.wantHover = 0; it.wantPress = 0; wake(); });
  el.addEventListener('pointerdown', () => { if (!opts.noPress) { it.wantPress = 1; wake(); } });
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
  // thick enough to read as a block, never deeper than the button is tall
  const d = it.d = Math.max(5, Math.min(13, Math.min(a, b) * 0.62 * (it.opts.depth ? it.opts.depth / 0.95 : 1)));
  const su = it.shadow.material.uniforms;
  if (shape === 'x') {
    const size = Math.min(w, h) * 1.2, thick = Math.min(w, h) * 0.3;
    it.mesh.geometry = crossGeo(size, thick, d);
    su.uHalf.value.set(size / 2, thick / 2); su.uR.value = thick / 2; su.uCross.value = 1;
  } else {
    const cs = getComputedStyle(el);
    const rad = ['TopLeft', 'TopRight', 'BottomRight', 'BottomLeft'].map((k) => parseFloat(cs[`border${k}Radius`]) || 0);
    const r = shape === 'round' ? Math.min(a, b) : Math.min(Math.min(a, b), Math.max(4, rad.reduce((x, y) => x + y) / 4));
    it.mesh.geometry = rectGeo(a, b, r, d);
    su.uHalf.value.set(a, b); su.uR.value = r; su.uCross.value = 0;
  }
  it.mat.userData.u.uDepth.value = it.mesh.geometry.userData.depth;
  it.shadow.scale.set(w + PAD * 2, h + PAD * 2, 1); su.uScale.value.set(w + PAD * 2, h + PAD * 2);
  su.uSoft.value = Math.max(3, d * 0.45);
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
let _back = null;
function backMat() {
  if (_back) return _back;
  _back = new THREE.MeshPhysicalMaterial({ color: '#ffffff', roughness: 0.6, sheen: 0.6, sheenColor: new THREE.Color('#ffffff'), sheenRoughness: 0.5,
    emissive: new THREE.Color('#ffffff'), emissiveIntensity: 0.45, envMapIntensity: 0.6 });
  _back.onBeforeCompile = (sh) => turnEnv(sh, envRot);
  return _back;
}
const _shear = new THREE.Matrix4();
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
  // the flavor bar is housing: matte plastic the cursor light never reaches
  light.intensity = it.kind === 'matte' ? 0 : CURSOR_LIGHT;
  it.mat.userData.u.uGlow.value = (it.glow || 0) * 0.9 + (it.kind === 'jelly' ? it.hover * 0.3 : 0);
  // The base sits fixed down and right of the element's box, by the resting depth along the shear; it never moves.
  // Hover lifts the face a little; a press pushes the face (and the label riding on it) down into the base.
  const Dm = it.mesh.geometry.userData.depth;
  const sx = 1 + it.hover * 0.02 - it.press * 0.02;
  const sz = Math.max(0.25, 1 + it.hover * 0.25 - it.press * 0.6);
  _shear.set(sx, 0, SHEAR.x * sz, -SHEAR.x * Dm, 0, sx, SHEAR.y * sz, -SHEAR.y * Dm, 0, 0, sz, 0, 0, 0, 0, 1);
  it.mesh.matrix.copy(_shear); it.mesh.matrixWorldNeedsUpdate = true;
  it.shadow.position.set(-SHEAR.x * Dm, -SHEAR.y * Dm, -1);
  const fx = SHEAR.x * Dm * (sz - 1), fy = -SHEAR.y * Dm * (sz - 1);
  if (Math.abs(fx - (it.fx || 0)) + Math.abs(fy - (it.fy || 0)) > 0.05) {
    it.fx = fx; it.fy = fy;
    it.el.style.setProperty('--sk-x', `${fx.toFixed(2)}px`); it.el.style.setProperty('--sk-y', `${fy.toFixed(2)}px`);
  }
  // the white candy backing: a thinner pearl slab just inside the jelly, so the jelly reads dense and deep
  // against a flat page
  const back = it.kind === 'jelly' && !it.opts.dot && !it.opts.noBacking;
  if (back) {
    it.back ||= new THREE.Mesh(undefined, backMat()); it.back.matrixAutoUpdate = false;
    it.back.geometry = it.mesh.geometry;
    const bz = 0.55, bs = 1 - 4 / Math.max(it.w, it.h);
    it.back.matrix.set(bs, 0, SHEAR.x * bz, -SHEAR.x * Dm, 0, bs, SHEAR.y * bz, -SHEAR.y * Dm, 0, 0, bz, 0, 0, 0, 0, 1);
    it.back.matrixWorldNeedsUpdate = true;
    scene.add(it.back);
  }
  scene.add(it.shadow, it.mesh);
  R.setViewport(0, 0, pw, ph); R.setScissor(0, 0, pw, ph); R.setScissorTest(true);
  R.clear(); R.render(scene, cam);
  R.setScissorTest(false);
  scene.remove(it.shadow, it.mesh); if (it.back) scene.remove(it.back);
  it.ctx.clearRect(0, 0, pw, ph);
  it.ctx.drawImage(R.domElement, 0, fullH - ph, pw, ph, 0, 0, pw, ph);
}
