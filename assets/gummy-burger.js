// The menu's burger, made of gummy. One canvas behind the menu's layer rows; every layer is its own
// candy, built from a single puffy slab shape, and sits level with its label. Lit by the warm room and a
// light that follows the cursor (or finger), the way the puff-logo experiment does it.
// Created the first time the menu opens; it only renders while the menu is open and something moves.
import * as THREE from 'three';
import { warmRoom, gummyRenderer, envRig, gummyMaterial, sugarCoat } from './gummy-look.js';

const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const coarse = matchMedia('(pointer: coarse)').matches;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const SPAN = 2.1;   // the bun's diameter, in scene units

// ---------- One shape for every layer ----------
// A superellipsoid slab: around the y axis the outline is R(θ); the cross-section is a rounded box whose top
// and bottom halves can bulge differently (a dome bun, a flat cut face). deform(v, θ) nudges each vertex.
function slab({ R = () => 1, top = 0.1, bot = 0.1, nTop = 3, nBot = 3, seg = 64, rows = 24, deform }) {
  const pos = [], idx = [];
  const at = (th, ph) => {
    const c = Math.cos(ph), s = Math.sin(ph), up = s >= 0;
    const n = up ? nTop : nBot, H = up ? top : bot;
    const r = R(th) * Math.pow(Math.abs(c), 2 / n);
    const v = new THREE.Vector3(r * Math.cos(th), H * Math.sign(s) * Math.pow(Math.abs(s), 2 / n), -r * Math.sin(th));
    deform?.(v, th);
    return v;
  };
  pos.push(at(0, Math.PI / 2));                      // top pole
  for (let j = 1; j < rows; j++) {
    const ph = Math.PI / 2 - (j / rows) * Math.PI;
    for (let i = 0; i < seg; i++) pos.push(at((i / seg) * Math.PI * 2, ph));
  }
  pos.push(at(0, -Math.PI / 2));                     // bottom pole
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
// small value noise for lumps
const hash = (x, y, z) => { const s = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453; return s - Math.floor(s); };
function noise3(x, y, z) {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z), xf = x - xi, yf = y - yi, zf = z - zi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf), w = zf * zf * (3 - 2 * zf);
  const L = (a, b, t) => a + (b - a) * t;
  const h = (i, j, k) => hash(xi + i, yi + j, zi + k);
  return L(L(L(h(0, 0, 0), h(1, 0, 0), u), L(h(0, 1, 0), h(1, 1, 0), u), v), L(L(h(0, 0, 1), h(1, 0, 1), u), L(h(0, 1, 1), h(1, 1, 1), u), v), w);
}
// the faint lumpy skin of a foam gummy
const foam = (v) => { const k = noise3(v.x * 9, v.y * 9, v.z * 9) - 0.5; v.multiplyScalar(1 + k * 0.012); };
// little ellipsoids (seeds) scattered with a placement function: place(i) -> {p, n, s: Vector3 scale}
function bits(count, place, mat) {
  const inst = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 10, 7), mat, count);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), q2 = new THREE.Quaternion();
  for (let i = 0; i < count; i++) {
    const { p, n, s, spin = 0 } = place(i);
    q.setFromUnitVectors(up, n).multiply(q2.setFromAxisAngle(up, spin));
    inst.setMatrixAt(i, m4.compose(p, q, s));
  }
  inst.instanceMatrix.needsUpdate = true;
  return inst;
}

// ---------- The layers, top to bottom (same order as the menu) ----------
// Finishes: buns are milky foam gummy shaded two-tone (toasty top, pale cut face); lettuce and tomato are
// clear jelly; cheese and pickle are sour, sugar crystals and all; the patty is dark glossy cola gummy.
function buildLayers(sugarScale) {
  const out = {};
  // top bun: a puffed dome, milky, toasted on top, with gummy sesame seeds
  {
    const geo = slab({ R: (t) => 1.02 * (1 + 0.012 * Math.sin(3 * t)), top: 0.5, bot: 0.08, nTop: 2.3, nBot: 5, seg: 72, rows: 28, deform: foam });
    const mat = gummyMaterial('milky', '#fde8c4', { tone: { color: '#e99a3f', from: 0.04, to: 0.42 } });
    const m = new THREE.Mesh(geo, mat);
    const seedMat = gummyMaterial('milky', '#fff7e6', { roughness: 0.35, clearcoat: 0.7, clearcoatRoughness: 0.15 });
    const gold = 2.39996;
    const seeds = bits(17, (i) => {
      const r = 0.82 * Math.sqrt((i + 0.6) / 17), th = i * gold + 0.3;
      const c = Math.pow(clamp(r / 1.02, 0, 1), 2.3 / 2);     // where the dome is at that radius
      const y = 0.5 * Math.pow(Math.sqrt(1 - c * c), 2 / 2.3);
      const p = new THREE.Vector3(r * Math.cos(th), y, -r * Math.sin(th));
      const n = new THREE.Vector3(p.x / 1.02, (y / 0.5) * 1.4, p.z / 1.02).normalize();
      p.addScaledVector(n, 0.012);
      return { p, n, s: new THREE.Vector3(0.075, 0.026, 0.042), spin: th * 1.7 + i };
    }, seedMat);
    m.add(seeds);
    out['bun-top'] = { mesh: m, h: 0.58, y: -0.18 };
  }
  // lettuce: a thin clear-jelly ruffle
  {
    const R = (t) => 1.1 * (1 + 0.035 * Math.sin(7 * t) + 0.02 * Math.sin(13 * t + 1));
    const geo = slab({ R, top: 0.04, bot: 0.04, nTop: 2.4, nBot: 2.4, seg: 160, rows: 12, deform: (v, t) => {
      const r = Math.hypot(v.x, v.z);
      v.y += 0.08 * smooth(0.6, 1.12, r) * Math.sin(9 * t + 0.9 * Math.sin(3 * t)) + 0.022 * smooth(0.7, 1.15, r) * Math.sin(21 * t);
    } });
    const mat = gummyMaterial('clear', '#2f9e22', { thickness: 0.3, attenuationDistance: 0.25, tone: { color: '#c9f08a', from: 0.7, to: 0.1 } });
    out.lettuce = { mesh: new THREE.Mesh(geo, mat), h: 0.3 };
  }
  // tomato: a clear red slice with pale gummy seeds suspended inside
  {
    const geo = slab({ R: (t) => 0.93 * (1 + 0.015 * Math.sin(5 * t)), top: 0.09, bot: 0.09, nTop: 3, nBot: 3, seg: 72, rows: 22 });
    const mat = gummyMaterial('clear', '#e0141c', { thickness: 0.4, attenuationDistance: 0.3 });
    const m = new THREE.Mesh(geo, mat);
    const seedMat = gummyMaterial('milky', '#ffe9a6', { roughness: 0.3 });
    m.add(bits(24, (i) => {
      const loc = Math.floor(i / 4), k = i % 4;
      const th = (loc / 6) * Math.PI * 2 + 0.3 + (k - 1.5) * 0.13;
      const r = 0.42 + (k % 2) * 0.14 + 0.03 * Math.sin(i * 7.1);
      return { p: new THREE.Vector3(r * Math.cos(th), 0.01 * Math.sin(i * 3), -r * Math.sin(th)), n: new THREE.Vector3(0, 1, 0),
               s: new THREE.Vector3(0.055, 0.03, 0.032), spin: th };
    }, seedMat));
    out.tomato = { mesh: m, h: 0.18 };
  }
  // cheese: a sour square whose corners droop over the edge
  {
    const p = 7, rot = 0.22;
    const R = (t) => 1.0 / Math.pow(Math.pow(Math.abs(Math.cos(t - rot)), p) + Math.pow(Math.abs(Math.sin(t - rot)), p), 1 / p);
    const geo = slab({ R, top: 0.05, bot: 0.05, nTop: 3, nBot: 3, seg: 96, rows: 16, deform: (v) => {
      const r = Math.hypot(v.x, v.z);
      v.y -= 0.42 * Math.pow(smooth(0.78, 1.42, r), 1.3);
    } });
    const mat = gummyMaterial('sour', '#ffd21f', { color: '#ffd23a', transmission: 0.6, thickness: 0.3, attenuationColor: '#fff09a', attenuationDistance: 0.3, sheen: 0.35 });
    const m = new THREE.Mesh(geo, mat);
    sugarCoat(m, { count: Math.round(1100 * sugarScale), size: 0.026, seed: 3 });
    out.cheese = { mesh: m, h: 0.3, y: 0.08 };
  }
  // patty: a thick, lumpy, glossy cola gummy
  {
    const R = (t) => 1.0 * (1 + 0.025 * Math.sin(5 * t + 1) + 0.018 * Math.sin(9 * t + 2) + 0.01 * Math.sin(17 * t));
    const geo = slab({ R, top: 0.2, bot: 0.19, nTop: 3.4, nBot: 3.4, seg: 96, rows: 26, deform: (v) => {
      const k = noise3(v.x * 4.2, v.y * 4.2, v.z * 4.2) - 0.5, k2 = noise3(v.x * 11 + 5, v.y * 11, v.z * 11) - 0.5;
      const len = Math.hypot(v.x, v.y * 2.5, v.z) || 1;
      const s = 0.05 * k + 0.014 * k2;
      v.x += (v.x / len) * s; v.y += (v.y * 2.5 / len) * s * 0.8; v.z += (v.z / len) * s;
    } });
    const mat = gummyMaterial('cola', '#a2481c', { thickness: 0.6, attenuationDistance: 0.4 });
    out.patty = { mesh: new THREE.Mesh(geo, mat), h: 0.4 };
  }
  // pickle: two ridged sour chips, two-tone with a pale milky centre
  {
    const g = new THREE.Group();
    const chipGeo = slab({ R: (t) => 0.5 * (1 + 0.03 * Math.sin(16 * t)), top: 0.07, bot: 0.07, nTop: 2.6, nBot: 2.6, seg: 96, rows: 18 });
    const coreGeo = slab({ R: (t) => 0.33 * (1 + 0.05 * Math.sin(7 * t + 1)), top: 0.074, bot: 0.074, nTop: 2.4, nBot: 2.4, seg: 56, rows: 14 });
    const mat = gummyMaterial('sour', '#5fc22a', { color: '#6ccc2e', transmission: 0.7, thickness: 0.3, attenuationColor: '#a8e866', attenuationDistance: 0.25, sheen: 0.35 });
    const coreMat = gummyMaterial('milky', '#e6f5ae', { roughness: 0.45 });
    [[-0.5, 0.05, 0.3, 0.12], [0.5, -0.04, -0.2, -0.1]].forEach(([x, y, rz, rx], j) => {
      const m = new THREE.Mesh(chipGeo, mat);
      m.add(new THREE.Mesh(coreGeo, coreMat));
      m.position.set(x, y, j ? 0.05 : -0.05); m.rotation.set(rx, j * 2, rz);
      g.add(m); g.updateMatrixWorld(true);
      sugarCoat(m, { count: Math.round(260 * sugarScale), size: 0.026, seed: 7 + j });
    });
    out.pickle = { mesh: g, h: 0.2 };
  }
  // bottom bun: a flat pale cut face on a rounded golden base
  {
    const geo = slab({ R: (t) => 1.0 * (1 + 0.01 * Math.sin(4 * t)), top: 0.12, bot: 0.27, nTop: 3.2, nBot: 2.6, seg: 72, rows: 24, deform: foam });
    const mat = gummyMaterial('milky', '#e99a3f', { tone: { color: '#fde8c4', from: 0.02, to: 0.11 } });
    out['bun-bottom'] = { mesh: new THREE.Mesh(geo, mat), h: 0.36, y: 0.04 };
  }
  return out;
}

// The page behind the canvas, as the jelly sees it: transparent in the real render (the menu's own paper
// shows), but in the transmission pass a soft paper-coloured lightbox with a warm glow under the cursor,
// so the clear pieces glow from behind instead of refracting nothing.
function backdrop() {
  const mat = new THREE.ShaderMaterial({
    toneMapped: false, depthWrite: false,
    uniforms: { uPaper: { value: new THREE.Color('#ffffff') }, uGlow: { value: new THREE.Color('#ffd9a8') }, uLight: { value: new THREE.Vector2(0.3, 0.7) },
      uAspect: { value: 1 }, uMain: { value: 1 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `uniform vec3 uPaper, uGlow; uniform vec2 uLight; uniform float uAspect, uMain; varying vec2 vUv;
      void main(){
        if (uMain > 0.5) { gl_FragColor = vec4(0.0); return; }
        vec2 d = (vUv - uLight) * vec2(uAspect, 1.0);
        vec3 c = uPaper * (0.55 + 0.25 * vUv.y) + uGlow * 1.1 * exp(-dot(d, d) * 7.0);
        gl_FragColor = vec4(c, 1.0);
      }`,
  });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat);
  m.renderOrder = -10;
  m.frustumCulled = false;
  m.onBeforeRender = (r) => { mat.uniforms.uMain.value = r.getRenderTarget() === null ? 1 : 0; mat.uniformsNeedUpdate = true; };
  return m;
}

export async function createGummyBurger({ stack, slots, rows, keys, from }) {
  const canvas = document.createElement('canvas');
  canvas.className = 'gummy-burger';
  canvas.setAttribute('aria-hidden', 'true');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setClearColor(0x000000, 0);
  const room = await warmRoom(renderer);
  gummyRenderer(renderer, room);
  stack.prepend(canvas);

  const scene = new THREE.Scene();
  scene.environment = room.texture;
  const rig = new THREE.Group(); scene.add(rig);
  const camera = new THREE.PerspectiveCamera(14, 1, 0.1, 200);
  rig.add(camera);
  const back = backdrop(); camera.add(back);
  const lamp = new THREE.PointLight('#fff0dc', 0, 0, 2); rig.add(lamp);

  const parts = buildLayers(coarse ? 0.55 : 1);
  const L = keys.map((k, i) => {
    const p = parts[k];
    const tiltG = new THREE.Group(), bounce = new THREE.Group();
    p.mesh.position.y = p.y || 0;
    bounce.add(p.mesh); tiltG.add(bounce); rig.add(tiltG);
    return { k, i, ...p, tiltG, bounce, drop: 0, vy: 0, s: 0, sv: 0, w: 0, wv: 0, lift: 0, liftV: 0, hover: false, startAt: 0, falling: false, x: 0, y: 0, scale: 1 };
  });

  // ---------- layout: each candy sits on its row's slot ----------
  let ppu = 60, W = 1, H = 1, top = 0, dpr = Math.min(devicePixelRatio || 1, coarse ? 1.5 : 2);
  const dprCap = dpr;
  function layout() {
    const sr = stack.getBoundingClientRect();
    const rects = slots.map((s) => s.getBoundingClientRect());
    const full = Math.max(...rects.map((r) => r.width));
    if (!full) return;
    ppu = (full * 0.86) / SPAN;
    const right = Math.max(...rects.map((r) => r.right)) - sr.left;
    top = Math.round(Math.min(...rects.map((r) => r.top)) - sr.top - full * 0.35);
    W = Math.round(right + full * 0.12);
    H = Math.round(Math.max(...rects.map((r) => r.bottom)) - sr.top - top + full * 0.12);
    canvas.style.top = `${top}px`; canvas.style.width = `${W}px`; canvas.style.height = `${H}px`;
    renderer.setPixelRatio(dpr); renderer.setSize(W, H, false);
    camera.aspect = W / H;
    const dist = (H / ppu / 2) / Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    camera.position.set(0, 0, dist); camera.near = dist * 0.5; camera.far = dist * 3; camera.updateProjectionMatrix();
    const bd = dist * 1.6, bh = 2 * bd * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * 1.05;
    back.position.set(0, 0, -bd); back.scale.set(bh * camera.aspect, bh, 1);
    back.material.uniforms.uAspect.value = camera.aspect;
    L.forEach((l, i) => {
      const r = rects[i];
      l.x = (r.left + r.width / 2 - sr.left - W / 2) / ppu;
      l.y = (H / 2 - (r.top + r.height / 2 - sr.top - top)) / ppu;
      l.scale = 1;
    });
    wake();
  }
  const ro = new ResizeObserver(() => layout());
  ro.observe(stack);

  // ---------- light: the room turns with the cursor, and a lamp sits where it points ----------
  const aim = new THREE.Vector2(-0.35, 0.45), aimTo = aim.clone();
  const lampAt = new THREE.Vector2(0.25, 0.75), lampTo = lampAt.clone();   // canvas uv
  function point(e) {
    aimTo.set(clamp((e.clientX / innerWidth) * 2 - 1, -1, 1), clamp(-((e.clientY / innerHeight) * 2 - 1), -1, 1));
    const r = canvas.getBoundingClientRect();
    lampTo.set(clamp((e.clientX - r.left) / r.width, -0.6, 1.6), clamp(1 - (e.clientY - r.top) / r.height, -0.3, 1.3));
    wake();
  }
  const menu = stack.closest('#Menu') || document;
  menu.addEventListener('pointermove', point, { passive: true });
  menu.addEventListener('pointerdown', point, { passive: true });

  // ---------- jelly ----------
  const kick = (l, squash, wob) => { if (reduce) return; l.sv += squash; l.wv += wob; wake(); };
  rows.forEach((row, i) => {
    const on = () => { if (!L[i].hover) { L[i].hover = true; kick(L[i], 3.2, 5); } };
    const off = () => { L[i].hover = false; wake(); };
    row.addEventListener('pointerenter', (e) => { if (e.pointerType !== 'touch') on(); });
    row.addEventListener('focus', () => { if (row.matches(':focus-visible')) on(); });
    row.addEventListener('pointerleave', off); row.addEventListener('blur', off);
    row.addEventListener('pointerdown', () => kick(L[i], 4, -6));
  });

  let running = false, stopT = 0, raf = 0, last = 0, slow = 0, fast = 0, ema = 16;
  const wake = () => { if (running && !raf) raf = requestAnimationFrame(frame); };
  function frame(now) {
    raf = 0;
    const dt = Math.min((now - (last || now)) / 1000, 0.05); last = now;
    let busy = false;
    const k = 1 - Math.exp(-dt * 5);
    aim.lerp(aimTo, k); lampAt.lerp(lampTo, 1 - Math.exp(-dt * 8));
    if (aim.distanceTo(aimTo) > 1e-3 || lampAt.distanceTo(lampTo) > 1e-3) busy = true;
    envRig(rig, room.rotation + aim.x * 0.9, aim.y * 0.25);
    const vh = H / ppu, vw = W / ppu;
    lamp.position.set((lampAt.x - 0.5) * vw, (lampAt.y - 0.5) * vh, 2.4);
    back.material.uniforms.uLight.value.copy(lampAt);
    for (const l of L) {
      if (l.falling && now >= l.startAt) {
        l.vy -= 34 * dt; l.drop += l.vy * dt;
        if (l.drop <= 0) {
          l.drop = 0;
          const hit = -l.vy;
          l.sv += hit * 0.5; l.wv += (l.i % 2 ? 1 : -1) * hit * 0.6;
          l.vy = hit > 2.5 ? hit * 0.16 : 0;
          if (!l.vy) l.falling = false;
        }
        busy = true;
      }
      l.sv += (-230 * l.s - 9 * l.sv) * dt; l.s += l.sv * dt;
      l.wv += (-150 * l.w - 7 * l.wv) * dt; l.w += l.wv * dt;
      const liftTo = l.hover ? 0.16 : 0;
      l.liftV += (-(l.lift - liftTo) * 160 - 14 * l.liftV) * dt; l.lift += l.liftV * dt;
      if (Math.abs(l.s) + Math.abs(l.sv) + Math.abs(l.w) + Math.abs(l.wv) + Math.abs(l.liftV) + Math.abs(l.lift - liftTo) > 2e-3) busy = true;
      const s = clamp(l.s, -0.6, 0.8);
      l.tiltG.position.set(l.x, l.y + l.drop + l.lift, 0);
      l.tiltG.scale.setScalar(l.scale);
      l.tiltG.rotation.set(0.58 - aim.y * 0.1 + l.w * 0.05, aim.x * 0.16, l.w * 0.09);
      l.bounce.scale.set(1 + s * 0.2, 1 - s * 0.36, 1 + s * 0.2);
      l.bounce.position.y = -s * 0.36 * l.h * 0.5;
    }
    renderer.render(scene, camera);
    // adaptive resolution: drop the pixel ratio when frames run long, creep back when there's headroom
    if (dt > 0 && dt < 0.1) {
      ema += (dt * 1000 - ema) * 0.1;
      if (ema > 24) { if (++slow > 20 && dpr > 1) { dpr = Math.max(1, dpr - 0.25); slow = 0; layout(); } } else slow = 0;
      if (ema < 12) { if (++fast > 150 && dpr < dprCap) { dpr = Math.min(dprCap, dpr + 0.25); fast = 0; layout(); } } else fast = 0;
    }
    if (busy) wake(); else last = 0;
  }

  function paper() {
    const cs = getComputedStyle(document.body);
    const night = document.body.classList.contains('spooky');
    back.material.uniforms.uPaper.value.set(cs.getPropertyValue('--paper').trim() || '#ffffff');
    if (night) back.material.uniforms.uPaper.value.multiplyScalar(0.6);
    renderer.toneMappingExposure = room.exposure * (night ? 0.72 : 1);
    lamp.intensity = night ? 26 : 14;
  }

  return {
    open() {
      clearTimeout(stopT); running = true; last = 0;
      canvas.style.transition = 'none'; canvas.style.transform = ''; canvas.style.opacity = '';
      paper(); layout();
      renderer.compile(scene, camera);
      const now = performance.now();
      L.forEach((l) => {
        l.hover = false; l.s = l.sv = l.w = l.wv = l.lift = l.liftV = 0;
        if (reduce) { l.drop = 0; l.falling = false; return; }
        l.drop = (H / ppu) * 0.55 + (6 - l.i) * 0.15; l.vy = 0; l.falling = true;
        l.startAt = now + 90 + (L.length - 1 - l.i) * 75;   // bottom bun first, the top bun lands last
      });
      wake();
    },
    close() {
      // the whole stack shrinks back into the little burger button, like the old drawings did
      const b = from.getBoundingClientRect(), r = canvas.getBoundingClientRect();
      canvas.style.transition = reduce ? 'none' : 'transform .42s cubic-bezier(.5,0,.75,0), opacity .42s';
      canvas.style.transform = `translate(${b.left + b.width / 2 - (r.left + r.width / 2)}px, ${b.top + b.height / 2 - (r.top + r.height / 2)}px) scale(${(b.width / r.width).toFixed(3)})`;
      canvas.style.opacity = '0';
      stopT = setTimeout(() => { running = false; if (raf) cancelAnimationFrame(raf); raf = 0; }, 450);
    },
    debug: { L, renderer, scene, camera, rig, lamp, aimTo, lampTo, wake },
  };
}
