// The 3D logo finishes (gummy, chrome): the puff-logo experiment (grumpl/logo/grumpl-puff-logo.html, Cloud view),
// value for value, in its own small canvas laid exactly over the hero's cloud.
// Why its own canvas: it renders at the screen's full resolution whatever the hero has dropped to, its
// transmission pass only ever sees the badge (never the Grumpls), and its cost stays out of the hero's frame.
// Same mesh pack, same materials, same warm room HDRI at exposure 1.1 turned 240°, Khronos Neutral tone mapping,
// same tilt, sway and puffs. It stops drawing when it's hidden, scrolled away or the tab is in the background.
import * as THREE from 'three';
import { ROOM, roomAim, turnRoom, setTurn, roomEnv, NEUTRAL_TM, turnEnv } from './room.js';
import { finish, cursor, onCursor, CURSOR_LIGHT, flockShader } from './finish.js';

const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const PACK = 'assets/logo/cloud.pack.gz';
const UNITS_W = 13.07;                   // the pack is 100 px of the 1307 px logo to a unit
const PAD = { x: 0.07, y: 0.14 };       // room around the badge for the tilt and the puffs, as a share of its size

// lit by the shared warm room (room.js), exactly as the experiment was
const envRot = { value: new THREE.Matrix3() };   // the room's turn plus the logo's own slow sway
const flockU = { uFlockAmt: { value: 0 } };     // the flocked Grumpl's pile on the letters (finish.js), eased in and out
// One color like the Grumpl (Jason + Scott 2026-10-16): letters and drips both take the flavor's base color, and
// the airbrushed edge color sits only in the crevices, where letters and drips run into each other (aSeam, worked
// out once from the mesh) and, softer, low on the walls where they press into the cloud.
function turnable(m, U) {
  m.onBeforeCompile = (sh) => {
    turnEnv(sh, envRot); flockShader(sh, flockU, 0.6);
    Object.assign(sh.uniforms, U);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float aSeam; varying float vSeam; varying float vAZ;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvSeam = aSeam; vAZ = position.z;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform vec3 uEdge; uniform float uTop, uAir; varying float vSeam; varying float vAZ;')
      .replace('#include <color_fragment>', `#include <color_fragment>
        float air = max(vSeam, (1.0 - smoothstep(0.0, uTop * 0.5, vAZ)) * 0.7) * uAir;
        diffuseColor.rgb = mix(diffuseColor.rgb, uEdge, air * 0.95);`);
  };
  m.customProgramCacheKey = () => 'logo3d-room';
  return m;
}
// how close each letter/drip vertex is to another piece: 1 where they meet, 0 beyond R (a grid keeps it quick)
function seams(pieces, R = 0.3) {
  const parts = pieces.filter((p) => p.kind !== 'puff'), grid = new Map(), key = (x, y, z) => `${x},${y},${z}`;
  const world = (p, i, P) => [P[i * 3] + p.pivot.position.x, P[i * 3 + 1] + p.pivot.position.y, P[i * 3 + 2] + p.pivot.position.z];
  parts.forEach((p, pi) => {
    const P = p.mesh.geometry.attributes.position.array;
    for (let i = 0; i < P.length / 3; i++) {
      const [x, y, z] = world(p, i, P), k = key(Math.floor(x / R), Math.floor(y / R), Math.floor(z / R));
      let b = grid.get(k); if (!b) grid.set(k, b = []); b.push(x, y, z, pi);
    }
  });
  for (const p of pieces) {
    const P = p.mesh.geometry.attributes.position.array, n = P.length / 3, out = new Float32Array(n), pi = parts.indexOf(p);
    if (pi >= 0) for (let i = 0; i < n; i++) {
      const [x, y, z] = world(p, i, P), gx = Math.floor(x / R), gy = Math.floor(y / R), gz = Math.floor(z / R);
      let best = R * R;
      for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) for (let c = -1; c <= 1; c++) {
        const B = grid.get(key(gx + a, gy + b, gz + c)); if (!B) continue;
        for (let j = 0; j < B.length; j += 4) if (B[j + 3] !== pi) {
          const dx = B[j] - x, dy = B[j + 1] - y, dz = B[j + 2] - z, d = dx * dx + dy * dy + dz * dz;
          if (d < best) best = d;
        }
      }
      const t = 1 - Math.sqrt(best) / R; out[i] = t * t * (3 - 2 * t) * (p.kind === 'drop' ? 0.6 : 1);   // a drip only blushes where it joins
    }
    p.mesh.geometry.setAttribute('aSeam', new THREE.BufferAttribute(out, 1));
  }
}
// the edge color each piece airbrushes with in the current finish (none on the badge, none on gummy)
function airbrush(p, name) {
  const f = finish.flavor;
  p.U.uAir.value = p.kind !== 'puff' && f && name !== 'gummy' ? 1 : 0;
  if (f) p.U.uEdge.value.set(f.edge);
}

// ---- Finishes (the experiment's presets for these two)
const C = (s) => new THREE.Color(s);
const ROSE = '#f2c9b8';
// name: the focused Grumpl's finish (vinyl, chrome, flock; gummy for a season). The letters take that Grumpl's
// colors in its finish: base on the letters and the drips alike (never the edge color on the drips, Jason + Scott
// 2026-10-16), with the edge color airbrushed into the crevices (turnable). The cloud badge stays white
// in the same finish. kind: 'puff' (the badge), 'letter' or 'drop'.
function preset(name, kind, base) {
  const letter = kind !== 'puff';
  const f = finish.flavor;
  const col = f && name !== 'gummy' ? f.base : base;
  const p = { color: C(col), metalness: 0, roughness: 0.4, clearcoat: 0, clearcoatRoughness: 0.1, transmission: 0, thickness: 0.6,
    ior: 1.5, sheen: 0, sheenRoughness: 0.5, sheenColor: C('#000000'), attenuationColor: C('#ffffff'), attenuationDistance: 1, envMapIntensity: 1 };
  if (!letter) {
    if (name === 'chrome') Object.assign(p, { color: C('#f3ebe7'), roughness: 0.42, sheen: 1, sheenColor: C('#ffffff'), sheenRoughness: 0.35, clearcoat: 0.25, clearcoatRoughness: 0.3 });
    else if (name === 'flock') Object.assign(p, { color: C('#f4f2ef'), roughness: 1, sheen: 1, sheenColor: C('#ffffff'), sheenRoughness: 0.8, envMapIntensity: 0.9 });
    else if (name === 'vinyl') Object.assign(p, { color: C('#f7f5f2'), roughness: 0.55, sheen: 0.6, sheenColor: C('#ffffff'), sheenRoughness: 0.5, clearcoat: 0.15, clearcoatRoughness: 0.3 });
    else Object.assign(p, { color: C('#fad6da'), roughness: 0.55, sheen: 1, sheenColor: C('#ffffff'), sheenRoughness: 0.6 });
  } else if (name === 'chrome') Object.assign(p, { color: C(f ? f.base : ROSE), metalness: 1, roughness: 0.05, envMapIntensity: 1.2 });
  // flock matches the Grumpl's own (Scott 2026-10-16: the logo's was lighter, brighter, less detailed): finer grain, less white sheen
  else if (name === 'flock') Object.assign(p, { roughness: 1, sheen: 0.7, sheenRoughness: 0.8, sheenColor: C(col).lerp(C('#ffffff'), 0.22), envMapIntensity: 0.6 });
  else if (name === 'vinyl') Object.assign(p, { roughness: 0.5, sheen: 0.6, sheenRoughness: 0.5, sheenColor: C(col).lerp(C('#ffffff'), 0.6), clearcoat: 0.3, clearcoatRoughness: 0.25, envMapIntensity: 0.8 });
  else Object.assign(p, { roughness: 0.12, transmission: 1, thickness: 0.9, ior: 1.45, attenuationColor: C(base), attenuationDistance: 0.6,
    clearcoat: 0.8, clearcoatRoughness: 0.1, color: C(base).lerp(C('#ffffff'), 0.55) });
  return p;
}
const NUM = ['metalness', 'roughness', 'clearcoat', 'clearcoatRoughness', 'transmission', 'thickness', 'ior', 'sheen', 'sheenRoughness', 'attenuationDistance', 'envMapIntensity'];
const COL = ['color', 'sheenColor', 'attenuationColor'];
const PART_COLORS = { 'letter-g': '#ff7756', 'letter-r': '#ffac4d', 'letter-u': '#edb300', 'letter-m': '#ff7680', 'letter-p': '#ff87e0', 'letter-l': '#ff7658',
  'drop-g-1': '#ff7657', 'drop-g-2': '#ff7657', 'drop-g-3': '#ffac4d', 'drop-r-1': '#ff8e54', 'drop-r-2': '#ffac4d', 'drop-r-3': '#ffaa4d', 'drop-r-4': '#ffac4c',
  'drop-r-5': '#fdbd3e', 'drop-r-6': '#ffab4a', 'drop-u-1': '#f0b201', 'drop-u-2': '#fb9059', 'drop-u-3': '#ff7d73', 'drop-u-4': '#f99156', 'drop-u-5': '#ff7680',
  'drop-m-1': '#ff7680', 'drop-m-2': '#ff7680', 'drop-m-3': '#ff7881', 'drop-p-1': '#ff87e7', 'drop-p-2': '#ff87e8' };

// ---- The mesh pack: front surfaces (int16) with baked normals (int8). The backs are never seen from the hero's
// camera, so only the front half of each index is kept.
function unpack(buf) {
  const dv = new DataView(buf), hl = dv.getUint32(0, true);
  const hdr = JSON.parse(new TextDecoder().decode(new Uint8Array(buf, 4, hl)));
  let off = 4 + hl; const out = [];
  const lo = hdr.min, sc = hdr.max.map((v, i) => (v - lo[i]) / 65535);
  const take = (bytes) => { const s = buf.slice(off, off + bytes); off += Math.ceil(bytes / 4) * 4; return s; };
  for (const p of hdr.parts) {
    const ni = p.nv - p.nb;
    const q = new Int16Array(take(p.nv * 6)); take(ni * 2);
    const qn = new Int8Array(take((p.nv + ni) * 3)); take(p.nv);
    const idx = new (p.wide ? Uint32Array : Uint16Array)(take(p.ni * (p.wide ? 4 : 2)));
    const pos = new Float32Array(p.nv * 3), nrm = new Float32Array(p.nv * 3);
    for (let i = 0; i < p.nv * 3; i++) pos[i] = (q[i] + 32768) * sc[i % 3] + lo[i % 3];
    for (let i = 0; i < p.nv; i++) {
      const x = qn[i * 3] / 127, y = qn[i * 3 + 1] / 127, z = qn[i * 3 + 2] / 127, l = Math.hypot(x, y, z) || 1;
      nrm[i * 3] = x / l; nrm[i * 3 + 1] = y / l; nrm[i * 3 + 2] = z / l;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.BufferAttribute(nrm, 3));
    g.setIndex(new THREE.BufferAttribute(idx, 1)); g.userData.nb = p.nb;
    out.push({ id: p.id, geo: g });
  }
  return out;
}
async function gunzipFetch(url) {
  const r = await fetch(url);
  const body = r.body.pipeThrough(new DecompressionStream('gzip'));
  return new Response(body).arrayBuffer();
}

let S = null;   // everything, once built
let mode = 'flat', shown = true, rect = null, onTap = null;

export function initLogo3D(opts) {
  onTap = opts.onTap;
  if (S) return S.ready;
  const canvas = document.createElement('canvas');
  canvas.id = 'Logo3D'; canvas.setAttribute('aria-hidden', 'true');
  opts.after.after(canvas);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = NEUTRAL_TM; renderer.toneMappingExposure = ROOM.exposure;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(28, 1, 0.5, 100);
  const tilt = new THREE.Group(); scene.add(tilt);
  // the soft light that follows the cursor or finger (finish.js): you see it travel across the letters
  const cursorLight = new THREE.PointLight(0xffffff, CURSOR_LIGHT * 1.6, 0, 0); scene.add(cursorLight);
  // a soft white sky and a key from the upper left, like the prototype's bright Cloud view: the badge and the
  // letters read bright before any cursor light reaches them
  scene.add(new THREE.HemisphereLight(0xffffff, 0xeef0f6, 0.6));
  const key = new THREE.DirectionalLight(0xffffff, 0.7); key.position.set(-3, 5, 7); scene.add(key);
  S = { canvas, renderer, scene, camera, tilt, cursorLight, pieces: [], dpr: Math.min(devicePixelRatio || 1, 2), sweep: 0, sweepTo: 0, sign: 1 };
  window.__grumplLogo = S;   // for testing
  S.ready = Promise.all([
    gunzipFetch(PACK),
    roomEnv(renderer),
  ]).then(([buf, env]) => {
    scene.environment = env;
    for (const { id: rawId, geo } of unpack(buf)) {
      const kind = rawId === 'cloud-body' ? 'puff' : rawId.startsWith('drop') ? 'drop' : 'letter';
      const base = PART_COLORS[rawId] || '#ffffff';
      geo.computeBoundingBox();
      const c = new THREE.Vector3(); geo.boundingBox.getCenter(c);
      if (kind !== 'puff') {   // pivot on the outline, so squash and stretch never lifts the seam out of its groove
        const P = geo.attributes.position.array, nb = geo.userData.nb; let z = 0;
        for (let i = 0; i < nb; i++) z += P[i * 3 + 2];
        c.z = z / nb;
      }
      geo.translate(-c.x, -c.y, -c.z);
      geo.computeBoundingBox();
      const U = { uEdge: { value: new THREE.Color() }, uTop: { value: Math.max(0.05, geo.boundingBox.max.z) }, uAir: { value: 0 } };
      const p = { id: rawId, kind, base, U, s: 0, v: 0, startAt: 0, mat: turnable(new THREE.MeshPhysicalMaterial(), U) };
      p.target = preset('gummy', kind, base); p.cur = { ...p.target }; COL.forEach((k) => p.cur[k] = p.target[k].clone());
      applyMat(p);
      // the cloud badge is white on its own (Scott 2026-10-16: it went grey wherever the cursor light wasn't)
      if (kind === 'puff') { p.mat.emissive.set('#ffffff'); p.mat.emissiveIntensity = 0.42; }   // round 4: the cloud's top is never in shadow
      p.mesh = new THREE.Mesh(geo, p.mat);
      p.mesh.userData.piece = p;
      p.pivot = new THREE.Group(); p.pivot.position.copy(c); p.pivot.add(p.mesh);
      tilt.add(p.pivot);
      S.pieces.push(p);
    }
    seams(S.pieces);
    // the groove in the cloud around the badge (app.js draws it from the badge outline), just behind the badge
    const puff = S.pieces.find((p) => p.kind === 'puff');
    if (opts.groove && puff) {
      const bb = puff.mesh.geometry.boundingBox, w = bb.max.x - bb.min.x, h = bb.max.y - bb.min.y, m = opts.groove.margin;
      const tex = new THREE.CanvasTexture(opts.groove.canvas); tex.colorSpace = THREE.SRGBColorSpace;
      const groove = new THREE.Mesh(new THREE.PlaneGeometry(w * (1 + 2 * m), h + 2 * m * w),
        new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, toneMapped: false }));
      groove.position.set(puff.pivot.position.x + (bb.min.x + bb.max.x) / 2, puff.pivot.position.y + (bb.min.y + bb.max.y) / 2, puff.pivot.position.z + bb.min.z);
      groove.renderOrder = -1;
      tilt.add(groove);
    }
    S.tappable = S.pieces.filter((p) => p.kind !== 'puff');
    S.idle = [...S.tappable].sort((a, b) => a.pivot.position.x - b.pivot.position.x);
    wire();
    layout();
    renderer.compile(scene, camera);
  });
  return S.ready;
}

function applyMat(p) { NUM.forEach((k) => p.mat[k] = p.cur[k]); COL.forEach((k) => p.mat[k].copy(p.cur[k])); }
function kick(p, amt, delay = 0) { if (reduce) return; setTimeout(() => { p.v += amt * 9; wake(); }, delay); }

// Finish changes sweep left to right, each piece puffing as its new finish arrives
export function setLogo3DMode(m, recolor = false) {
  const was = recolor ? m : mode; mode = m;
  if (!S?.pieces.length) return;
  if (m !== 'flat') {
    const instant = was === 'flat';
    for (const p of S.pieces) {
      const x = (p.pivot.position.x + UNITS_W / 2) / UNITS_W;
      p.target = preset(m, p.kind, p.base);
      airbrush(p, m);
      p.startAt = performance.now() + (instant || reduce ? 0 : x * 520 + (p.kind === 'drop' ? 80 : 0));
      if (instant) { p.cur = { ...p.target }; COL.forEach((k) => p.cur[k] = p.target[k].clone()); applyMat(p); }
    }
  }
  visible();
}
// the same finish in another flavor's colors (vinyl to vinyl): sweep the new colors across like a finish change
export function refreshLogo3D() { if (mode !== 'flat') setLogo3DMode(mode, true); }
export function puffLogo3D() {
  if (!S?.idle) return;
  S.idle.forEach((p) => kick(p, p.kind === 'letter' ? 0.6 : 0.45, ((p.pivot.position.x + UNITS_W / 2) / UNITS_W) * 520));
  if (!reduce) { S.sign = -S.sign; S.sweepTo = S.sign * 0.35; }
}

function visible() {
  const on = mode !== 'flat' && shown && !!rect && !!S?.tappable;
  S && S.canvas.classList.toggle('on', on);
  if (on) wake();
  return on;
}

// ---- Layout: the canvas covers the hero's logo rectangle plus some room, and the camera is set so the badge's
// outline lands exactly on the flat logo's (one unit = rect.w / 13.07 px)
function layout() {
  if (!S || !rect) return;
  const px = rect.w / UNITS_W;
  const w = Math.round(rect.w * (1 + PAD.x * 2)), h = Math.round(rect.h * (1 + PAD.y * 2));
  Object.assign(S.canvas.style, { width: `${w}px`, height: `${h}px` });
  if (!S.canvas.classList.contains('docked')) Object.assign(S.canvas.style, { left: `${rect.x + rect.w / 2 - w / 2}px`, top: `${rect.y + rect.h / 2 - h / 2}px` });
  // docked small at the top it is drawn at the size it shows, not the hero's
  S.renderer.setPixelRatio(S.dock && S.dock < 1 ? Math.min(S.dpr, Math.max(0.75, (devicePixelRatio || 1) * S.dock * 1.15)) : S.dpr);
  S.renderer.setSize(w, h, false);
  const cam = S.camera, hu = h / px, match = 0.5;            // the badge's mid-depth is where sizes match exactly
  cam.aspect = w / h;
  const dist = hu / 2 / Math.tan(THREE.MathUtils.degToRad(cam.fov / 2)) + match;
  cam.position.set(0, 0, dist);
  cam.lookAt(0, 0, 0);
  cam.updateProjectionMatrix();
  wake();
}

// ---- Input: the hero hands over where the cursor or the phone's tilt points (want, -1..1); hovering a letter puffs it
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
let hovered = null, lastInput = performance.now(), idleStep = 0, idleNext = 0;
function pick(e) {
  const r = S.canvas.getBoundingClientRect();
  ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  ray.setFromCamera(ndc, S.camera);
  const hit = ray.intersectObjects(S.pieces.map((p) => p.mesh), false)[0];
  return hit ? hit.object.userData.piece : null;
}
function wire() {
  const c = S.canvas;
  c.addEventListener('pointermove', (e) => {
    const p = pick(e);
    c.classList.toggle('over', !!p);
    if (p !== hovered) { if (p && p.kind !== 'puff') kick(p, 0.35); hovered = p; }
  });
  c.addEventListener('pointerleave', () => { hovered = null; });
  let down = null;
  c.addEventListener('pointerdown', (e) => { down = [e.clientX, e.clientY]; });
  c.addEventListener('pointerup', (e) => {
    if (!down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 8) return;
    if (pick(e)) onTap?.();
  });
  ['pointermove', 'pointerdown', 'keydown', 'wheel', 'scroll'].forEach((t) => addEventListener(t, () => { lastInput = performance.now(); wake(); }, { passive: true }));
  addEventListener('grumpl-logo', (e) => { rect = e.detail; layout(); visible(); });
  addEventListener('grumpl-logo-3d', (e) => { shown = !!e.detail?.show; visible(); });
  addEventListener('grumpl-logo-dock', (e) => { S.dock = e.detail.scale; layout(); });
  document.addEventListener('visibilitychange', wake);
  const mo = new MutationObserver(wake);
  mo.observe(document.body, { attributes: true, attributeFilter: ['class'] });
  if (menuEl()) mo.observe(menuEl(), { attributes: true, attributeFilter: ['hidden'] });
}

// ---- Loop: runs only while the logo is on screen; the slow sway keeps the room's reflections alive
const clock = new THREE.Clock();
const aim = roomAim;
let raf = 0, t = 0;
const menuEl = () => document.getElementById('Menu');
const covered = () => menuEl()?.hidden === false || document.body.classList.contains('ds-no-scroll');
function wake() { if (!raf && S) { clock.getDelta(); raf = requestAnimationFrame(frame); } }
function frame() {
  raf = 0;
  if (document.hidden || covered() || !(mode !== 'flat' && shown && rect && S.tappable)) return;
  const dt = Math.min(clock.getDelta(), 0.05), now = performance.now();
  t += dt;
  // idle: when nobody is touching anything, the pieces puff one after another, left to right
  if (!reduce && now - lastInput > 3500 && now >= idleNext) {
    const p = S.idle[idleStep % S.idle.length]; kick(p, p.kind === 'letter' ? 0.55 : 0.45);
    idleStep++;
    idleNext = now + (idleStep % S.idle.length === 0 ? 2600 : p.kind === 'letter' ? 260 : 110);
  }
  turnRoom(now);
  S.sweep += (S.sweepTo - S.sweep) * (1 - Math.exp(-dt * 1.6));
  if (Math.abs(S.sweepTo) > 0.01 && Math.abs(S.sweepTo - S.sweep) < 0.02) S.sweepTo = 0;
  const sway = reduce ? 0 : 1;
  S.tilt.rotation.y = aim.x * 0.32 + sway * Math.sin(t * 0.4) * 0.05;
  S.tilt.rotation.x = -aim.y * 0.22 + sway * Math.sin(t * 0.33) * 0.03;
  setTurn(envRot, aim.x * 0.9 + S.sweep + sway * Math.sin(t * 0.2) * 0.25, aim.y * 0.25);
  const k = 1 - Math.exp(-dt * 5);
  flockU.uFlockAmt.value += ((mode === 'flock' ? 1 : 0) - flockU.uFlockAmt.value) * k;
  for (const p of S.pieces) {
    if (now >= p.startAt) {
      NUM.forEach((n) => p.cur[n] += (p.target[n] - p.cur[n]) * k);
      COL.forEach((n) => p.cur[n].lerp(p.target[n], k));
      if (p.target.transmission === 0 && p.cur.transmission < 0.01) p.cur.transmission = 0;
      applyMat(p);
    }
    p.v += (-180 * p.s - 10 * p.v) * dt; p.s += p.v * dt;
    p.pivot.scale.set(1 + p.s * 0.09, 1 + p.s * 0.09, 1 + p.s * 0.5);
  }
  // the cursor light sits where the pointer is, in the badge's units, a little in front of it
  if (rect) {
    const cr = S.canvas.getBoundingClientRect(), px = rect.w * (S.canvas.classList.contains('docked') ? (S.dock || 1) : 1) / UNITS_W;
    S.cursorLight.position.set((cursor.x - (cr.left + cr.width / 2)) / px, -(cursor.y - (cr.top + cr.height / 2)) / px, 9);
  }
  pace(now);
  S.renderer.render(S.scene, S.camera);
  raf = requestAnimationFrame(frame);
}
// Resolution: full (up to 2x) unless the device really can't keep up, then one step down at a time
let lastAt = 0, avg = 16.7, slow = 0;
function pace(now) {
  const gap = now - lastAt; lastAt = now;
  if (gap > 80) return;
  avg += (gap - avg) * 0.1;
  if (avg > 24 && ++slow > 45 && S.dpr > 1) { S.dpr = Math.max(1, S.dpr - 0.5); slow = 0; avg = 16.7; layout(); }
  else if (avg <= 24) slow = 0;
}
