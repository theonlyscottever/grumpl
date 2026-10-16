// "Make your own": the public half of the Post Studio. Pose a 3D Grumpl, pick a flavor,
// stick things on him (decals that wrap onto his body), pick a background, save a PNG.
// Rendering reuses the site's look (grumpl-look.js). The WebGL renderer is created only when the
// section comes near the screen, renders only when something changes, and is thrown away again
// when the section is far off screen.
import * as THREE from 'three';
import { DecalGeometry } from 'three/addons/geometries/DecalGeometry.js';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';
import { buildStudioEnv, makeLightU, buildFigure, paintSet, loadGLB } from './grumpl-look.js';
import { roomEnv } from './room.js';
import { mountPicker, deriveTones, parseHex, STARTERS } from './colors.js';

const MODEL_URL = new URL('./models/grumpl.glb', import.meta.url).href;
const LOGO_URL = new URL('./logo.svg', import.meta.url).href;
const LINE_URL = new URL('./studio/line-drawing.png', import.meta.url).href;
const COLORS_CSS = new URL('./colors.css', import.meta.url).href;

const INK = '#1b1620', LEMON = '#ffee96', PAPER = '#ffffff', WASH = '#eef3fb';
const coarse = matchMedia('(pointer: coarse)').matches;
const DPR = () => Math.min(devicePixelRatio || 1, coarse ? 1.5 : 2);

// ---------- flavors ----------
const CLASSICS = [
  { id: 'fleshberry', name: 'Fleshberry', base: '#eeaa9c', edge: '#ff6f8e', belly: '#f6cbbd' },
  { id: 'moss', name: 'Mosssnootfruit', base: '#9fd6a0', edge: '#4fb8e0', belly: '#cdeec2' },
  { id: 'obo', name: 'Obo’s Foot', base: '#a9a6e6', edge: '#7f8cff', belly: '#cac8f2' },
  { id: 'lunchbutter', name: 'Lunchbutter', base: '#d8b862', edge: '#ff9fb0', belly: '#efd9a0' },
  { id: 'cement', name: 'Cement Juice', base: '#c9c7c4', edge: '#ff9fb8', belly: '#e6e4e1' },
];
const toInt = (v) => typeof v === 'number' ? v : parseInt(String(v).replace('#', ''), 16);
const hex = (n) => '#' + (n & 0xffffff).toString(16).padStart(6, '0');
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
// one picked color -> an airbrushed flavor (same tones as the color picker): edge is the neighbouring hue, belly is lighter
export function deriveFlavor(name, hexStr) {
  const h = parseHex(hexStr) || '#9fd6a0', t = deriveTones(h);
  const slug = String(name || 'custom').toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40);
  return { id: 'c-' + slug, name: name || 'Your color', kind: 'vinyl', base: toInt(h), edge: toInt(t.edge), belly: toInt(t.belly), custom: true };
}
const mixHex = (a, b, t) => {
  const A = [a >> 16 & 255, a >> 8 & 255, a & 255], B = [b >> 16 & 255, b >> 8 & 255, b & 255];
  return `rgb(${A.map((v, i) => Math.round(v + (B[i] - v) * t)).join(',')})`;
};
const P = 0xffffff;

// ---------- light presets (the hero's product setup is "Studio") ----------
const D = THREE.MathUtils.degToRad;
const LIGHTS = {
  studio: { label: 'Studio', az: -36, el: 50, key: 24, keyC: 0xfff1e2, rims: [20, 15], rimC: 0xf2f6ff, env: 1, exp: 0.95 },
  rim:    { label: 'Rim', az: -24, el: 38, key: 9, keyC: 0xfff1e2, rims: [58, 48], rimC: 0xf4f7ff, env: 0.62, exp: 1.0 },
  sunset: { label: 'Sunset', az: 68, el: 16, key: 34, keyC: 0xffa868, rims: [18, 12], rimC: 0xb7a4ff, env: 0.7, exp: 0.98 },
  moody:  { label: 'Moody', az: -80, el: 58, key: 20, keyC: 0xfff4ea, rims: [7, 5], rimC: 0xdfe6ff, env: 0.36, exp: 0.86 },
};

// ---------- export sizes; frame = where the preview square lands in the picture ----------
const FORMATS = {
  square: { label: 'Square', w: 2048, h: 2048, frame: (W, H) => ({ cx: W / 2, cy: H / 2, s: W }) },
  // the top quarter stays clear for the clock; the bottom 12% for the flashlight and camera buttons
  phone: { label: 'iPhone wallpaper', w: 1179, h: 2556, frame: (W, H) => ({ cx: W / 2, cy: H * 0.6, s: Math.min(W * 1.1, H * 0.54) }) },
  desktop: { label: 'Desktop wallpaper', w: 2560, h: 1440, frame: (W, H) => ({ cx: W / 2, cy: H * 0.5, s: H * 0.8 }) },
};

// ---------- stickers (ported from the Post Studio) ----------
function rr(c, x, y, w, h, r) { c.beginPath(); if (c.roundRect) c.roundRect(x, y, w, h, r); else c.rect(x, y, w, h); }
function stickerCanvas(draw, w = 320, h = 320) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); return c; }
function dieCut(src, pad = 14) {
  // white die-cut edge around any transparent image, like a real vinyl sticker
  const w = src.width + pad * 2, h = src.height + pad * 2;
  const sil = document.createElement('canvas'); sil.width = w; sil.height = h; const s = sil.getContext('2d');
  for (let a = 0; a < 24; a++) s.drawImage(src, pad + Math.cos(a / 24 * 6.283) * pad, pad + Math.sin(a / 24 * 6.283) * pad);
  s.globalCompositeOperation = 'source-in'; s.fillStyle = '#fff'; s.fillRect(0, 0, w, h);
  const out = document.createElement('canvas'); out.width = w; out.height = h; const o = out.getContext('2d');
  o.drawImage(sil, 0, 0); o.drawImage(src, pad, pad); return out;
}
const CUTE = '400 VARpx caraque-melted, "Chewy", "Fredoka", sans-serif';
const cute = (px) => CUTE.replace('VAR', px);
const STK = {
  heart: () => stickerCanvas((c, w) => { c.translate(w / 2, w / 2 + 10); c.beginPath(); c.moveTo(0, 95); c.bezierCurveTo(-150, 0, -95, -125, 0, -55); c.bezierCurveTo(95, -125, 150, 0, 0, 95); c.fillStyle = '#ff87e0'; c.fill(); c.lineWidth = 12; c.strokeStyle = INK; c.lineJoin = 'round'; c.stroke(); c.fillStyle = 'rgba(255,255,255,.55)'; c.beginPath(); c.ellipse(-48, -40, 20, 12, -0.6, 0, 7); c.fill(); }),
  star: () => stickerCanvas((c, w) => { c.translate(w / 2, w / 2 + 8); c.beginPath(); for (let i = 0; i < 10; i++) { const r = i % 2 ? 58 : 135, a = -Math.PI / 2 + i * Math.PI / 5; c.lineTo(Math.cos(a) * r, Math.sin(a) * r); } c.closePath(); c.fillStyle = LEMON; c.fill(); c.lineWidth = 12; c.lineJoin = 'round'; c.strokeStyle = INK; c.stroke(); }),
  odds: () => stickerCanvas((c, w) => { c.beginPath(); c.arc(w / 2, w / 2, 140, 0, 7); c.fillStyle = LEMON; c.fill(); c.lineWidth = 12; c.strokeStyle = INK; c.stroke(); c.fillStyle = INK; c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = cute(130); c.fillText('1%', w / 2, w / 2 - 12); c.font = '600 34px "Fredoka", sans-serif'; c.fillText('speshul', w / 2, w / 2 + 78); }),
  tag: () => stickerCanvas((c, w, h) => { c.translate(w / 2, h / 2); c.rotate(-0.05); c.fillStyle = INK; rr(c, -230, -62, 460, 124, [14, 11, 8, 16]); c.fill(); c.fillStyle = PAPER; c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = cute(92); c.fillText('hand made', 0, 6); }, 520, 180),
  bandaid: () => stickerCanvas((c, w, h) => { c.translate(w / 2, h / 2); c.fillStyle = '#f2c79b'; rr(c, -230, -70, 460, 140, 70); c.fill(); c.lineWidth = 10; c.strokeStyle = INK; c.stroke(); c.fillStyle = '#e7ae7b'; rr(c, -80, -58, 160, 116, 18); c.fill(); c.fillStyle = 'rgba(27,22,32,.35)'; for (const x of [-170, -130, 130, 170]) for (const y of [-25, 25]) { c.beginPath(); c.arc(x, y, 8, 0, 7); c.fill(); } }, 500, 180),
  googly: () => stickerCanvas((c, w) => { c.beginPath(); c.arc(w / 2, w / 2, 140, 0, 7); c.fillStyle = PAPER; c.fill(); c.lineWidth = 10; c.strokeStyle = INK; c.stroke(); c.beginPath(); c.arc(w / 2 + 30, w / 2 + 40, 72, 0, 7); c.fillStyle = INK; c.fill(); c.fillStyle = 'rgba(255,255,255,.9)'; c.beginPath(); c.arc(w / 2 + 6, w / 2 + 14, 16, 0, 7); c.fill(); }),
  stamp: () => stickerCanvas((c, w) => { c.translate(w / 2, w / 2); c.rotate(-0.12); c.strokeStyle = '#d8363f'; c.lineWidth = 12; c.beginPath(); c.arc(0, 0, 140, 0, 7); c.stroke(); c.lineWidth = 5; c.beginPath(); c.arc(0, 0, 118, 0, 7); c.stroke(); c.fillStyle = '#d8363f'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = cute(58); c.fillText('process', 0, -34); c.fillText('grey', 0, 16); c.font = '600 30px "Fredoka", sans-serif'; c.fillText('approved.', 0, 62); }),
  sweat: () => stickerCanvas((c, w) => { c.translate(w / 2, w / 2); c.beginPath(); c.moveTo(0, -130); c.bezierCurveTo(30, -60, 105, 0, 105, 50); c.arc(0, 50, 105, 0, Math.PI); c.bezierCurveTo(-105, 0, -30, -60, 0, -130); c.fillStyle = '#89d7f2'; c.fill(); c.lineWidth = 11; c.strokeStyle = INK; c.lineJoin = 'round'; c.stroke(); c.fillStyle = 'rgba(255,255,255,.7)'; c.beginPath(); c.ellipse(-40, 40, 16, 30, 0.3, 0, 7); c.fill(); }),
};
const STK_LABEL = { heart: 'Heart', star: 'Star', odds: '1% odds', tag: 'Hand made tag', bandaid: 'Band-aid', googly: 'Googly eye', stamp: 'Approved stamp', sweat: 'Sweat drop' };
const loadImg = (src) => new Promise((res, rej) => { const im = new Image(); im.decoding = 'async'; im.onload = () => res(im); im.onerror = () => rej(new Error('image failed: ' + String(src).slice(0, 60))); im.src = src; });
function imageCanvas(im, max) {
  const w0 = im.naturalWidth || im.width || max, h0 = im.naturalHeight || im.height || max;
  const k = Math.min(1, max / Math.max(w0, h0));
  return stickerCanvas((x, w, h) => x.drawImage(im, 0, 0, w, h), Math.max(1, Math.round(w0 * k)), Math.max(1, Math.round(h0 * k)));
}

// ---------- backgrounds ----------
const BG_SOLIDS = [['White', PAPER], ['Sky', WASH], ['Lemon', LEMON], ['Bubblegum', '#ffc8dd'], ['Ink', INK]];
const BG_KINDS = [['wash', 'Flavor wash'], ['dots', 'Dots'], ['gingham', 'Picnic'], ['stripes', 'Candy stripes'], ['burst', 'Sunburst'], ['clouds', 'Clouds']];
function rng(seed) { return () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646; }
// fr: the subject square in canvas pixels, so patterns keep their size relative to him
function paintBg(ctx, W, H, fr, bg, f, photo) {
  ctx.clearRect(0, 0, W, H);
  const u = fr.s / 12;
  const base = f.base, edge = f.edge, belly = f.belly;
  if (bg.type === 'none') return;
  if (bg.type === 'solid') { ctx.fillStyle = bg.color; ctx.fillRect(0, 0, W, H); return; }
  if (bg.type === 'photo') {
    ctx.fillStyle = WASH; ctx.fillRect(0, 0, W, H);
    if (photo) { const ir = photo.width / photo.height, r = W / H; let dw = W, dh = H; if (ir > r) dw = H * ir; else dh = W / ir; ctx.drawImage(photo, (W - dw) / 2, (H - dh) / 2, dw, dh); }
    return;
  }
  if (bg.type === 'wash' || bg.type === 'clouds') {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    if (bg.type === 'wash') { g.addColorStop(0, mixHex(P, base, 0.1)); g.addColorStop(0.72, mixHex(P, base, 0.32)); g.addColorStop(1, mixHex(P, edge, 0.36)); }
    else { g.addColorStop(0, '#9fd3ff'); g.addColorStop(0.7, '#d9eeff'); g.addColorStop(1, '#f4f9ff'); }
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    if (bg.type === 'wash') {
      const rg = ctx.createRadialGradient(W * 0.85, -H * 0.1, 0, W * 0.85, -H * 0.1, Math.max(W, H) * 0.8);
      rg.addColorStop(0, mixHex(P, edge, 0.3)); rg.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = rg; ctx.fillRect(0, 0, W, H);
      return;
    }
    // puffy outlined clouds, scattered with a fixed seed so every export matches the preview
    const R = rng(7), lw = Math.max(2, u * 0.12);
    const n = Math.ceil((W * H) / (u * u * 26));
    for (let i = 0; i < n; i++) {
      const cx = R() * W, cy = R() * H, k = u * (0.7 + R() * 0.9);
      const puffs = [[0, 0, 1], [-1.1, 0.25, 0.72], [1.1, 0.25, 0.76], [-0.45, -0.45, 0.78], [0.55, -0.35, 0.7]];
      for (const pass of [0, 1]) {
        ctx.beginPath();
        for (const [x, y, r] of puffs) { ctx.moveTo(cx + x * k + r * k + (pass ? 0 : lw), cy + y * k); ctx.arc(cx + x * k, cy + y * k, r * k + (pass ? 0 : lw), 0, 7); }
        ctx.fillStyle = pass ? '#ffffff' : INK; ctx.fill();
      }
    }
    return;
  }
  if (bg.type === 'dots') {
    ctx.fillStyle = mixHex(P, belly, 0.55); ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = mixHex(P, edge, 0.55);
    const sp = u * 1.6, r = u * 0.34;
    let row = 0;
    for (let y = fr.cy % sp - sp; y < H + sp; y += sp * 0.866, row++) {
      for (let x = (fr.cx % sp) - sp + (row % 2 ? sp / 2 : 0); x < W + sp; x += sp) { ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); }
    }
    return;
  }
  if (bg.type === 'gingham') {
    ctx.fillStyle = PAPER; ctx.fillRect(0, 0, W, H);
    const sp = u * 1.3, c = mixHex(P, edge, 0.75);
    ctx.globalAlpha = 0.42; ctx.fillStyle = c;
    for (let x = (fr.cx % (sp * 2)) - sp * 2; x < W; x += sp * 2) ctx.fillRect(x, 0, sp, H);
    for (let y = (fr.cy % (sp * 2)) - sp * 2; y < H; y += sp * 2) ctx.fillRect(0, y, W, sp);
    ctx.globalAlpha = 1;
    return;
  }
  if (bg.type === 'stripes') {
    ctx.fillStyle = mixHex(P, belly, 0.5); ctx.fillRect(0, 0, W, H);
    ctx.save(); ctx.translate(fr.cx, fr.cy); ctx.rotate(-0.5);
    const sp = u * 1.1, L = Math.hypot(W, H);
    ctx.fillStyle = mixHex(P, base, 0.7);
    for (let x = -L; x < L; x += sp * 2) ctx.fillRect(x, -L, sp, L * 2);
    ctx.restore();
    return;
  }
  if (bg.type === 'burst') {
    ctx.fillStyle = mixHex(P, belly, 0.4); ctx.fillRect(0, 0, W, H);
    ctx.save(); ctx.translate(fr.cx, fr.cy + fr.s * 0.08);
    const L = Math.hypot(W, H), n = 18;
    ctx.fillStyle = mixHex(P, base, 0.55);
    for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2, b = a + Math.PI / n; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * L, Math.sin(a) * L); ctx.lineTo(Math.cos(b) * L, Math.sin(b) * L); ctx.fill(); }
    const rg = ctx.createRadialGradient(0, 0, 0, 0, 0, fr.s * 0.6);
    rg.addColorStop(0, 'rgba(255,255,255,.75)'); rg.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = rg; ctx.fillRect(-L, -L, L * 2, L * 2);
    ctx.restore();
  }
}

// ---------- markup ----------
const ICON = {
  up: '<svg viewBox="0 0 20 20" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" d="M10 15V4M5.5 8.5 10 4l4.5 4.5M4 16.5h12"/></svg>',
  down: '<svg viewBox="0 0 20 20" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" d="M10 3.5v11M5.5 10 10 14.5l4.5-4.5M4 17h12"/></svg>',
};
const TEMPLATE = `
<div class="st-in">
  <header class="st-head">
    <h2 id="make-h">Make your own</h2>
    <p>Spin him, recolor him, put stickers on his cake. Save it as a wallpaper.</p>
  </header>
  <div class="st-app">
    <div class="st-stagecol">
      <div class="st-stage" data-bg="wash">
        <canvas class="st-bgc" aria-hidden="true"></canvas>
        <div class="st-gl" role="img" aria-label="A 3D Grumpl you can turn, zoom and decorate"></div>
        <div class="st-ring" hidden></div>
        <span class="st-tag"></span>
        <span class="st-hexs" hidden></span>
        <p class="st-wait">Waking the Grumpl…</p>
        <p class="st-hint"></p>
      </div>
    </div>
    <div class="st-panel">
      <div class="st-tabs" role="tablist" aria-label="Studio tools">
        <button type="button" role="tab" data-tab="color" aria-selected="true">Color</button>
        <button type="button" role="tab" data-tab="pose" aria-selected="false">Pose</button>
        <button type="button" role="tab" data-tab="stick" aria-selected="false">Stickers</button>
        <button type="button" role="tab" data-tab="bg" aria-selected="false">Scene</button>
        <button type="button" role="tab" data-tab="save" aria-selected="false">Save</button>
      </div>

      <div class="st-pane st-color" data-pane="color" role="tabpanel">
        <div class="st-picker"></div>
        <div class="st-flav">
          <div class="st-sub">Quick picks</div>
          <div class="st-dots" role="group" aria-label="Flavors and colors"></div>
        </div>
      </div>

      <div class="st-pane" data-pane="pose" role="tabpanel" hidden>
        <div class="st-chips st-angles" aria-label="Angles"></div>
        <label class="st-fld"><span>Turn</span><input type="range" data-k="ry" min="-3.1416" max="3.1416" step="0.01"></label>
        <label class="st-fld"><span>Tilt</span><input type="range" data-k="rx" min="-0.35" max="0.45" step="0.005"></label>
        <label class="st-fld"><span>Lean</span><input type="range" data-k="rz" min="-0.4" max="0.4" step="0.005"></label>
        <label class="st-fld"><span>Zoom</span><input type="range" data-k="zoomS" min="0" max="1" step="0.005"></label>
        <label class="st-fld"><span>Frame on</span><input type="range" data-k="look" min="0.25" max="1.85" step="0.01" aria-label="Frame on: feet to head"></label>
        <div class="st-sub">Light</div>
        <div class="st-chips st-lights"></div>
        <label class="st-fld"><span>Light from</span><input type="range" data-k="lightAz" min="-1.1" max="1.1" step="0.01"></label>
        <button type="button" class="st-btn st-reset">Stand him back up</button>
      </div>

      <div class="st-pane" data-pane="stick" role="tabpanel" hidden>
        <p class="st-small st-stickhint">Tap one to slap it on him. Drag it around on his body.</p>
        <div class="st-stickers"></div>
        <input type="file" class="st-stickin" accept="image/png,image/webp,image/gif,image/svg+xml,image/jpeg" hidden>
        <div class="st-seltools" hidden>
          <label class="st-fld"><span>Size</span><input type="range" class="st-ssize" min="0.08" max="0.9" step="0.01"></label>
          <label class="st-fld"><span>Turn</span><input type="range" class="st-srot" min="-3.1416" max="3.1416" step="0.01"></label>
          <div class="st-row"><button type="button" class="st-btn st-sdel">Peel it off</button><button type="button" class="st-btn st-sdone">Done</button></div>
        </div>
        <div class="st-row"><button type="button" class="st-btn st-sclear" hidden>Peel them all off</button></div>
      </div>

      <div class="st-pane" data-pane="bg" role="tabpanel" hidden>
        <div class="st-sub">Flat</div>
        <div class="st-bgs st-bgsolid"></div>
        <div class="st-sub">Patterns and places</div>
        <div class="st-bgs st-bgpat"></div>
        <div class="st-row">
          <button type="button" class="st-btn st-bgup">Use your photo</button>
          <input type="file" class="st-bgin" accept="image/*" hidden>
        </div>
      </div>

      <div class="st-pane" data-pane="save" role="tabpanel" hidden>
        <div class="st-saves">
          <button type="button" class="st-save" data-fmt="square"><i class="st-shape sq"></i><b>Square</b><small>2048 × 2048</small></button>
          <button type="button" class="st-save" data-fmt="phone"><i class="st-shape ph"></i><b>Phone wallpaper</b><small>1179 × 2556</small></button>
          <button type="button" class="st-save" data-fmt="desktop"><i class="st-shape dt"></i><b>Desktop wallpaper</b><small>2560 × 1440</small></button>
        </div>
        <div class="st-out" hidden>
          <img class="st-outimg" alt="Your picture">
          <div class="st-outside">
            <p class="st-small st-outmsg"></p>
            <div class="st-row"><a class="st-btn st-dl" download>${ICON.down}Download</a><button type="button" class="st-btn st-share" hidden>${ICON.up}Share</button></div>
          </div>
        </div>
      </div>
    </div>
  </div>
  <p class="st-note">This is the same tool we use to make our own posts.</p>
</div>`;

const ANGLES = [['Front', 0], ['Three-quarter', 0.55], ['Side', 1.5], ['The cake', 2.55], ['Full cake', Math.PI]];
const POSE0 = { ry: 0.55, rx: 0.06, rz: 0, zoom: 6.6, look: 0.98, lightAz: 0 };
const ZMIN = 2.2, ZMAX = 14;
const sliderToZoom = (v) => ZMAX * Math.pow(ZMIN / ZMAX, v);
const zoomToSlider = (d) => Math.log(d / ZMAX) / Math.log(ZMIN / ZMAX);

export function mountStudio(el, { FLAVORS = [] } = {}) {
  if (!el) throw new Error('mountStudio: no element');
  el.classList.add('st-root');
  el.innerHTML = TEMPLATE;
  const $ = (s) => el.querySelector(s);
  const $$ = (s) => [...el.querySelectorAll(s)];
  const stage = $('.st-stage'), glBox = $('.st-gl'), bgc = $('.st-bgc'), ring = $('.st-ring');

  // ---------- state ----------
  const norm = (f) => ({ ...f, kind: f.kind || 'vinyl', base: toInt(f.base), edge: toInt(f.edge), belly: toInt(f.belly) });
  const flavors = [...FLAVORS.map(norm), ...CLASSICS.map((f) => norm({ ...f, kind: 'vinyl' }))];
  const S = { flavor: flavors[0]?.id, ...POSE0, light: 'studio', bg: { type: 'wash' }, decals: [], sel: -1 };
  const flavor = () => flavors.find((f) => f.id === S.flavor) || flavors[0];
  let photo = null;          // background photo (canvas)
  let destroyed = false;

  // ---------- 3D (created lazily) ----------
  let G = null, gPending = null, model = null, tris = null;
  let near = false, raf = 0;
  const invalidate = () => { if (!G || !near || raf || destroyed) return; raf = requestAnimationFrame(() => { raf = 0; draw(); }); };
  addEventListener('grumpl-room-ready', () => invalidate());   // the chrome finish's warm room arrived

  async function ensure3D() {
    if (G) return G;
    if (gPending) return gPending;
    gPending = (async () => {
      stage.dataset.state = 'loading';
      if (!model) model = await loadGLB(MODEL_URL);
      if (destroyed) return null;
      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'default' });
      renderer.setClearColor(0xffffff, 0);
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 0.95;
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.setPixelRatio(DPR());
      const cv = renderer.domElement;
      cv.addEventListener('webglcontextlost', (e) => { e.preventDefault(); if (G?.renderer.domElement === cv) stage.dataset.state = 'lost'; });
      cv.addEventListener('webglcontextrestored', () => { if (G?.renderer.domElement !== cv) return; teardown3D(); if (near) ensure3D().then(invalidate); });
      glBox.append(cv);
      const gl = renderer.getContext();
      const maxDim = Math.min(gl.getParameter(gl.MAX_RENDERBUFFER_SIZE), ...gl.getParameter(gl.MAX_VIEWPORT_DIMS), 8192);

      const scene = new THREE.Scene();
      const env = buildStudioEnv(renderer);
      scene.environment = env;
      const eyeEnv = buildStudioEnv(renderer, true);
      const camera = new THREE.PerspectiveCamera(24, 1, 0.1, 60);
      const key = new THREE.SpotLight(0xfff1e2, 24, 0, Math.PI / 4, 1, 2);
      key.target.position.set(0, 0.8, 0);
      scene.add(key, key.target);
      RectAreaLightUniformsLib.init();
      const rims = [-3.2, 3.2].map((x) => { const r = new THREE.RectAreaLight(0xf2f6ff, 18, 0.5, 3); r.position.set(x, 2.0, -2.6); r.lookAt(0, 1.1, 0); scene.add(r); return r; });
      const lightU = makeLightU();
      const rig = new THREE.Group(), spin = new THREE.Group(), decals = new THREE.Group();
      rig.add(spin); spin.add(decals); scene.add(rig);
      // one soft contact shadow under his feet, nothing layered
      const sc = stickerCanvas((c, w, h) => { const g = c.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2); g.addColorStop(0, 'rgba(255,255,255,0.75)'); g.addColorStop(0.45, 'rgba(255,255,255,0.32)'); g.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = g; c.fillRect(0, 0, w, h); }, 128, 128);
      const shadowTex = new THREE.CanvasTexture(sc);
      const shadow = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 1.25), new THREE.MeshBasicMaterial({ map: shadowTex, color: 0x2a2030, transparent: true, opacity: 0.5, depthWrite: false, toneMapped: false }));
      shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.004; shadow.renderOrder = -1;
      scene.add(shadow);
      G = { renderer, scene, camera, key, rims, lightU, rig, spin, decals, env, eyeEnv, shadow, shadowTex, figs: {}, cur: null, tex: new Map(), maxDim, ray: new THREE.Raycaster() };
      showFigure();
      if (!tris) tris = buildTris(G.cur.body);
      // every finish built and compiled now (the chrome with its warm room), so picking one never stalls
      const keep = S.flavor;
      for (const f of flavors) if (!G.figs[f.kind]) { S.flavor = f.id; showFigure(); }
      S.flavor = keep;
      if (Object.values(G.figs).some((fg) => fg.set.chrome)) {
        const t = await roomEnv(renderer);
        for (const fg of Object.values(G.figs)) if (fg.set.chrome) for (const m of [fg.set.body, fg.set.teeth]) { m.envMap = t; m.needsUpdate = true; }
      }
      for (const fg of Object.values(G.figs)) fg.group.visible = true;
      try { renderer.compile(scene, camera); } catch { /* compiles on first draw instead */ }
      showFigure();
      await syncDecals();
      sizeGL();
      stage.dataset.state = 'ready';
      return G;
    })().catch((err) => {
      console.error('studio', err);
      stage.dataset.state = 'error';
      $('.st-wait').textContent = 'The 3D Grumpl would not load here. Try another browser?';
      return null;
    }).finally(() => { gPending = null; });
    return gPending;
  }

  function teardown3D() {
    if (!G) return;
    cancelAnimationFrame(raf); raf = 0;
    const g = G; G = null;
    for (const fig of Object.values(g.figs)) {
      for (const k of ['body', 'eyes', 'teeth']) fig.set[k].dispose();
      fig.group.traverse((o) => { if (o.isInstancedMesh) { o.geometry.dispose(); o.material.dispose(); } });
    }
    clearDecalMeshes(g);
    g.tex.forEach((t) => t.tex.dispose());
    g.env.dispose(); g.eyeEnv.dispose(); g.shadowTex.dispose(); g.shadow.geometry.dispose(); g.shadow.material.dispose();
    g.renderer.dispose();
    g.renderer.forceContextLoss();
    g.renderer.domElement.remove();
    stage.dataset.state = 'sleep';
    ring.hidden = true;
  }

  // a figure per finish (vinyl / gummy / flock), built once and recolored after
  function showFigure() {
    const f = flavor(), kind = f.kind || 'vinyl';
    let fig = G.figs[kind];
    if (!fig) {
      const built = buildFigure(model, f, G.lightU, G.eyeEnv, coarse ? 7000 : 14000);
      fig = { ...built, body: built.meshes.find((m) => m.name === 'body'), envBase: { body: built.set.body.envMapIntensity, teeth: built.set.teeth.envMapIntensity } };
      fig.group.updateMatrixWorld(true);
      G.figs[kind] = fig;
      G.spin.add(fig.group);
    }
    for (const k in G.figs) G.figs[k].group.visible = G.figs[k] === fig;
    paintSet(fig.set, f);
    G.cur = fig;
    applyLight();
  }

  function applyLight() {
    if (!G) return;
    const L = LIGHTS[S.light] || LIGHTS.studio;
    const az = D(L.az) + S.lightAz, el2 = D(L.el), r = 4.8, flat = Math.cos(el2) * r;
    G.key.position.set(Math.sin(az) * flat, Math.sin(el2) * r + 0.3, Math.cos(az) * flat);
    G.key.intensity = L.key; G.key.color.set(L.keyC);
    G.rims.forEach((rm, i) => { rm.intensity = L.rims[i]; rm.color.set(L.rimC); });
    G.lightU.uKeyStrength.value = L.key / 24;
    G.renderer.toneMappingExposure = L.exp;
    for (const fig of Object.values(G.figs)) { fig.set.body.envMapIntensity = fig.envBase.body * L.env; fig.set.teeth.envMapIntensity = fig.envBase.teeth * L.env; }
  }

  // ---------- camera and drawing ----------
  const _v = new THREE.Vector3(), CENTER = new THREE.Vector3(0, 0.9, 0), BACK = new THREE.Vector3(0, 0.25, -1).normalize();
  function poseCamera(aspect = 1, view = null) {
    const { camera } = G, d = S.zoom, ly = S.look;
    camera.position.set(0, ly + 0.37 * d / 6.6, d);
    camera.lookAt(0, ly, 0);
    if (view) {
      // keep the preview square's framing, placed at view.fr inside a W x H picture
      const t = Math.tan(D(12)) * view.H / view.fr.s;
      camera.fov = THREE.MathUtils.radToDeg(2 * Math.atan(t));
      camera.aspect = view.W / view.H;
      camera.setViewOffset(view.W, view.H, view.W / 2 - view.fr.cx, view.H / 2 - view.fr.cy, view.W, view.H);
    } else {
      camera.fov = 24; camera.aspect = aspect; camera.clearViewOffset();
    }
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();
  }
  function applyPose() {
    G.spin.rotation.y = S.ry;
    G.rig.rotation.set(S.rx, 0, S.rz);
    G.scene.updateMatrixWorld(true);
  }
  function render3D() {
    applyPose();
    const vm = G.camera.matrixWorldInverse;
    G.lightU.uKeyPosV.value.copy(G.key.position).applyMatrix4(vm);
    G.rims.forEach((r, i) => G.lightU.uRimDirV.value[i].copy(_v.copy(r.position).sub(CENTER).normalize().transformDirection(vm)));
    G.lightU.uBackDirV.value.copy(BACK).transformDirection(vm);
    G.renderer.render(G.scene, G.camera);
  }
  function draw() {
    if (!G) return;
    poseCamera(1);
    render3D();
    placeRing();
  }
  function sizeGL() {
    if (!G) return;
    const px = Math.max(50, Math.round(stage.clientWidth));
    G.renderer.setPixelRatio(DPR());
    G.renderer.setSize(px, px, false);
    invalidate();
  }

  // ---------- preview background ----------
  function paintPreviewBg() {
    const px = Math.max(50, Math.round(stage.clientWidth)), k = Math.min(devicePixelRatio || 1, 2), W = Math.round(px * k);
    if (bgc.width !== W) { bgc.width = W; bgc.height = W; }
    paintBg(bgc.getContext('2d'), W, W, { cx: W / 2, cy: W / 2, s: W }, S.bg, flavor(), photo);
    stage.dataset.bg = S.bg.type;
  }

  // ---------- decals ----------
  // triangles of his body in figure space, so a decal only clips the few dozen near it
  function buildTris(body) {
    body.updateMatrix();
    const g = body.geometry, pos = g.attributes.position, nor = g.attributes.normal, idx = g.index, M = body.matrix;
    const NM = new THREE.Matrix3().getNormalMatrix(M);
    const n = idx ? idx.count / 3 : pos.count / 3;
    const P = new Float32Array(n * 9), N = new Float32Array(n * 9), C = new Float32Array(n * 3), F = new Float32Array(n * 3);
    const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), t = new THREE.Vector3();
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < 3; j++) {
        const vi = idx ? idx.getX(i * 3 + j) : i * 3 + j;
        t.fromBufferAttribute(pos, vi).applyMatrix4(M);
        P.set([t.x, t.y, t.z], i * 9 + j * 3);
        t.fromBufferAttribute(nor, vi).applyMatrix3(NM).normalize();
        N.set([t.x, t.y, t.z], i * 9 + j * 3);
      }
      a.fromArray(P, i * 9); b.fromArray(P, i * 9 + 3); c.fromArray(P, i * 9 + 6);
      C.set([(a.x + b.x + c.x) / 3, (a.y + b.y + c.y) / 3, (a.z + b.z + c.z) / 3], i * 3);
      t.subVectors(b, a).cross(c.clone().sub(a)).normalize();
      F.set([t.x, t.y, t.z], i * 3);
    }
    return { P, N, C, F, n };
  }
  function nearMesh(p, nrm, rad) {
    const { P, N, C, F, n } = tris, r2 = rad * rad, pick = [];
    for (let i = 0; i < n; i++) {
      const dx = C[i * 3] - p.x, dy = C[i * 3 + 1] - p.y, dz = C[i * 3 + 2] - p.z;
      if (dx * dx + dy * dy + dz * dz > r2) continue;
      if (F[i * 3] * nrm.x + F[i * 3 + 1] * nrm.y + F[i * 3 + 2] * nrm.z < 0.05) continue;
      pick.push(i);
    }
    const pa = new Float32Array(pick.length * 9), na = new Float32Array(pick.length * 9);
    pick.forEach((i, k) => { pa.set(P.subarray(i * 9, i * 9 + 9), k * 9); na.set(N.subarray(i * 9, i * 9 + 9), k * 9); });
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pa, 3));
    geo.setAttribute('normal', new THREE.BufferAttribute(na, 3));
    return new THREE.Mesh(geo);
  }

  const srcCache = new Map(); // sticker id -> die-cut canvas
  const userStickers = [];
  let fontsReady = null;
  const waitFonts = () => fontsReady || (fontsReady = Promise.race([
    Promise.all(['400 80px Chewy', '400 80px caraque-melted', '600 30px Fredoka'].map((f) => document.fonts?.load(f).catch(() => {}))),
    new Promise((r) => setTimeout(r, 1500)),
  ]));
  async function stickerSource(id) {
    if (srcCache.has(id)) return srcCache.get(id);
    let c;
    if (id.startsWith('b:')) { await waitFonts(); c = STK[id.slice(2)](); }
    else if (id === 'i:logo') c = imageCanvas(await loadImg(LOGO_URL), 560);
    else if (id === 'i:line') c = imageCanvas(await loadImg(LINE_URL), 512);
    else { const u = userStickers.find((s) => s.id === id); c = u.canvas; }
    c = dieCut(c, Math.round(Math.max(c.width, c.height) * 0.04));
    srcCache.set(id, c);
    return c;
  }
  async function texFor(id) {
    if (G?.tex.has(id)) return G.tex.get(id);
    const c = await stickerSource(id);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
    const v = { tex, aspect: c.width / c.height };
    G?.tex.set(id, v);
    return v;
  }
  function clearDecalMeshes(g = G) {
    for (const m of [...g.decals.children]) { g.decals.remove(m); m.geometry.dispose(); m.material.dispose(); }
  }
  async function decalMesh(d) {
    const { tex, aspect } = await texFor(d.src);
    if (!G) return null;
    const pos = new THREE.Vector3(...d.p), nrm = new THREE.Vector3(...d.n).normalize();
    const helper = new THREE.Object3D();
    helper.position.copy(pos); helper.lookAt(_v.copy(pos).add(nrm)); helper.rotateZ(d.rot || 0);
    const sz = d.size, size = aspect >= 1 ? new THREE.Vector3(sz, sz / aspect, sz * 0.6) : new THREE.Vector3(sz * aspect, sz, sz * 0.6);
    const src = nearMesh(pos, nrm, Math.hypot(size.x, size.y) * 0.55 + 0.04);
    const geo = new DecalGeometry(src, pos, helper.rotation, size);
    src.geometry.dispose();
    const mat = new THREE.MeshPhysicalMaterial({ map: tex, transparent: true, alphaTest: 0.04, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4,
      roughness: 0.42, clearcoat: 0.35, clearcoatRoughness: 0.4, envMapIntensity: 0.7 });
    const m = new THREE.Mesh(geo, mat);
    m.renderOrder = 2; m.userData.d = d;
    return m;
  }
  let syncing = Promise.resolve();
  function syncDecals() {
    syncing = syncing.then(async () => {
      if (!G) return;
      const meshes = [];
      for (const d of S.decals) { const m = await decalMesh(d); if (m) meshes.push(m); }
      if (!G) { meshes.forEach((m) => { m.geometry.dispose(); m.material.dispose(); }); return; }
      clearDecalMeshes();
      meshes.forEach((m) => G.decals.add(m));
      invalidate();
    }).catch((e) => console.error('decals', e));
    return syncing;
  }
  // rebuild one decal (moving, sizing, turning) without touching the rest
  let pendingOne = null, oneBusy = false;
  function updateDecal(d) {
    pendingOne = d;
    if (oneBusy || !G) return;
    oneBusy = true;
    requestAnimationFrame(async () => {
      const dd = pendingOne; pendingOne = null;
      try {
        const m = G && await decalMesh(dd);
        if (m && G) {
          const old = G.decals.children.find((o) => o.userData.d === dd);
          if (old) { G.decals.remove(old); old.geometry.dispose(); old.material.dispose(); }
          G.decals.add(m);
          draw();
        }
      } catch (e) { console.error(e); }
      oneBusy = false;
      if (pendingOne) updateDecal(pendingOne);
    });
  }

  // ---------- picking ----------
  const ndcOf = (e) => { const r = stage.getBoundingClientRect(); return new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); };
  function hitBody(ndc) {
    poseCamera(1); applyPose();
    G.ray.setFromCamera(ndc, G.camera);
    return G.ray.intersectObject(G.cur.body, false)[0] || null;
  }
  function toFigure(hit) {
    const inv = new THREE.Matrix4().copy(G.spin.matrixWorld).invert();
    const p = hit.point.clone().applyMatrix4(inv);
    const n = hit.face.normal.clone().transformDirection(hit.object.matrixWorld).transformDirection(inv);
    return { p: [p.x, p.y, p.z], n: [n.x, n.y, n.z] };
  }
  function pickDecal(ndc) {
    if (!G || !G.decals.children.length) return -1;
    const bh = hitBody(ndc);
    const h = G.ray.intersectObjects(G.decals.children, false)[0];
    if (!h) return -1;
    if (bh && h.distance > bh.distance + 0.03) return -1;
    return S.decals.indexOf(h.object.userData.d);
  }

  // ---------- UI: color picker (colors.js) + quick picks ----------
  // The picker recolors him live: every change only repaints uniforms (paintSet), at most once a frame.
  const EXTRA = STARTERS.filter(([n]) => !flavors.some((f) => f.name === n));
  const dotsEl = $('.st-dots');
  const picker = mountPicker($('.st-picker'), { starters: [], hex: hex(flavor()?.base ?? 0x56c2dc), onChange: onPick });
  picker.el.querySelector('.cl-slot')?.append($('.st-flav'));
  function buildDots() {
    dotsEl.innerHTML = flavors.map((f) => `<button type="button" class="st-dot" data-id="${f.id}" aria-label="${f.name}" title="${f.name}" aria-pressed="${f.id === S.flavor}"
      style="--b:${hex(f.base)};--e:${hex(f.edge)};--l:${hex(f.belly)}"></button>`).join('')
      + EXTRA.map(([n, h]) => { const t = deriveTones(h); return `<button type="button" class="st-dot" data-hex="${h}" data-name="${n}" aria-label="${n}" title="${n}" style="--b:${h};--e:${t.edge};--l:${t.belly}"></button>`; }).join('');
  }
  dotsEl.addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.id) setFlavor(b.dataset.id);
    else if (b.dataset.hex) { picker.setName(b.dataset.name, { silent: true }); picker.setHex(b.dataset.hex); }
  });
  let pickPending = null, pickRaf = 0, bgT = 0;
  function onPick(d) {
    pickPending = d;
    if (!pickRaf) pickRaf = requestAnimationFrame(applyPick);
  }
  function applyPick() {
    pickRaf = 0;
    const d = pickPending; pickPending = null;
    if (!d || destroyed) return;
    const vals = { id: 'pick', name: d.name || 'Your color', kind: 'vinyl', base: toInt(d.hex), edge: toInt(d.edge), belly: toInt(d.belly), custom: true };
    const f = flavors.find((x) => x.id === 'pick');
    S.flavor = 'pick';
    if (f) Object.assign(f, vals); else { flavors.push(vals); buildDots(); }
    liveFlavor();
  }
  // the cheap path, run on every picker move: uniforms, a few styles, the flat background
  function liveFlavor() {
    const f = flavor();
    $$('.st-dot[data-id]').forEach((b) => {
      b.setAttribute('aria-pressed', String(b.dataset.id === f.id));
      if (b.dataset.id === f.id) { b.style.setProperty('--b', hex(f.base)); b.style.setProperty('--e', hex(f.edge)); b.style.setProperty('--l', hex(f.belly)); b.title = f.name; b.setAttribute('aria-label', f.name); }
    });
    $('.st-tag').textContent = f.name;
    const hs = $('.st-hexs'); hs.hidden = f.id !== 'pick'; hs.textContent = hex(f.base);
    el.style.setProperty('--st-base', hex(f.base)); el.style.setProperty('--st-edge', hex(f.edge)); el.style.setProperty('--st-belly', hex(f.belly));
    if (G) showFigure();
    if (!['solid', 'none', 'photo', 'clouds'].includes(S.bg.type)) paintPreviewBg();
    clearTimeout(bgT); bgT = setTimeout(buildBgUI, 250);
    if (G && near) { cancelAnimationFrame(raf); raf = 0; draw(); }
  }
  function refreshFlavor() {
    liveFlavor();
    paintPreviewBg();
  }
  function setFlavor(id) {
    const f = flavors.find((x) => x.id === id); if (!f) return;
    S.flavor = id;
    if (id !== 'pick') picker.setHex(hex(f.base), { silent: true });
    refreshFlavor();
  }
  function addCustom(name, hexStr) {
    if (!parseHex(hexStr)) return;
    picker.setName(name || '', { silent: true });
    picker.setHex(hexStr);
  }
  const onColor = (e) => { const d = e.detail || {}; addCustom(d.name || 'Your color', d.hex); };
  window.addEventListener('grumpl-color', onColor);

  // ---------- UI: tabs ----------
  const tabs = $('.st-tabs');
  tabs.addEventListener('click', (e) => {
    const b = e.target.closest('[data-tab]'); if (!b) return;
    $$('.st-tabs [data-tab]').forEach((t) => t.setAttribute('aria-selected', String(t === b)));
    $$('.st-pane').forEach((p) => { p.hidden = p.dataset.pane !== b.dataset.tab; });
    if (b.dataset.tab === 'stick') buildStickerTray();
    else if (S.sel >= 0) select(-1);
  });

  // ---------- UI: pose ----------
  $('.st-angles').innerHTML = ANGLES.map(([t, ry]) => `<button type="button" class="st-chip${t.includes('cake') ? ' cute' : ''}" data-ry="${ry}">${t}</button>`).join('');
  $('.st-angles').addEventListener('click', (e) => { const b = e.target.closest('[data-ry]'); if (b) { S.ry = +b.dataset.ry; syncSliders(); invalidate(); } });
  $('.st-lights').innerHTML = Object.entries(LIGHTS).map(([k, L]) => `<button type="button" class="st-chip" data-light="${k}" aria-pressed="${k === S.light}">${L.label}</button>`).join('');
  $('.st-lights').addEventListener('click', (e) => {
    const b = e.target.closest('[data-light]'); if (!b) return;
    S.light = b.dataset.light; $$('.st-lights [data-light]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    applyLight(); invalidate();
  });
  function syncSliders() {
    $$('.st-pane[data-pane="pose"] input[data-k]').forEach((i) => {
      const k = i.dataset.k;
      let v = k === 'zoomS' ? zoomToSlider(S.zoom) : S[k];
      if (k === 'ry') v = Math.atan2(Math.sin(S.ry), Math.cos(S.ry));
      i.value = v;
    });
  }
  $('.st-pane[data-pane="pose"]').addEventListener('input', (e) => {
    const k = e.target.dataset?.k; if (!k) return;
    const v = +e.target.value;
    if (k === 'zoomS') S.zoom = sliderToZoom(v); else S[k] = v;
    if (k === 'lightAz') applyLight();
    invalidate();
  });
  $('.st-reset').addEventListener('click', () => { Object.assign(S, POSE0); syncSliders(); applyLight(); invalidate(); });

  // ---------- UI: stickers ----------
  const tray = $('.st-stickers');
  let trayBuilt = null;
  function buildStickerTray() {
    if (trayBuilt) return trayBuilt;
    trayBuilt = (async () => {
      const ids = [...Object.keys(STK).map((k) => ['b:' + k, STK_LABEL[k]]), ['i:logo', 'Logo'], ['i:line', 'Line drawing']];
      tray.innerHTML = ids.map(([id, label]) => `<button type="button" class="st-stk" data-src="${id}" title="${label}" aria-label="Sticker: ${label}"></button>`).join('')
        + `<button type="button" class="st-stk st-stkup" title="Upload your own sticker" aria-label="Upload your own sticker">${ICON.up}<span>Yours</span></button>`;
      for (const [id] of ids) {
        try { const c = await stickerSource(id); const b = tray.querySelector(`[data-src="${id}"]`); if (b) b.style.backgroundImage = `url("${thumb(c)}")`; }
        catch (e) { console.warn('sticker', id, e); }
      }
    })();
    return trayBuilt;
  }
  function thumb(c) { const k = 120 / Math.max(c.width, c.height); return stickerCanvas((x, w, h) => x.drawImage(c, 0, 0, w, h), Math.round(c.width * k), Math.round(c.height * k)).toDataURL(); }
  tray.addEventListener('click', (e) => {
    const b = e.target.closest('.st-stk'); if (!b) return;
    if (b.classList.contains('st-stkup')) { $('.st-stickin').click(); return; }
    addSticker(b.dataset.src);
  });
  $('.st-stickin').addEventListener('change', async (e) => {
    const file = e.target.files[0]; e.target.value = '';
    if (!file || !file.type.startsWith('image/')) return;
    const url = URL.createObjectURL(file);
    try {
      const im = await loadImg(url);
      const id = 'u:' + (userStickers.length + 1);
      userStickers.push({ id, canvas: imageCanvas(im, 640) });
      const c = await stickerSource(id);
      const up = tray.querySelector('.st-stkup');
      up.insertAdjacentHTML('beforebegin', `<button type="button" class="st-stk" data-src="${id}" title="Your sticker" aria-label="Your sticker" style="background-image:url('${thumb(c)}')"></button>`);
      addSticker(id);
    } catch (err) { console.warn(err); hint('That picture would not open. Try a PNG?'); }
    finally { URL.revokeObjectURL(url); }
  });
  async function addSticker(src) {
    const g = await ensure3D(); if (!g) return;
    // land it where the middle of the view hits him; failing that, his belly
    // and next to the stickers already there rather than on top of them
    let spot = null, first = null;
    const free = (q) => S.decals.every((d) => Math.hypot(d.p[0] - q.p[0], d.p[1] - q.p[1], d.p[2] - q.p[2]) > Math.max(0.2, d.size * 0.7));
    for (const [x, y] of [[0, 0], [0, -0.18], [-0.2, 0.05], [0.2, 0.05], [-0.16, -0.3], [0.16, -0.3], [0, 0.22], [-0.3, -0.12], [0.3, -0.12], [0, -0.45]]) {
      const h = hitBody(new THREE.Vector2(x, y)); if (!h) continue;
      const q = toFigure(h); first ||= q;
      if (free(q)) { spot = q; break; }
    }
    spot ||= first || { p: [0, 0.8, 0.6], n: [0, 0, 1] };
    const d = { src, ...spot, size: 0.34, rot: 0 };
    S.decals.push(d);
    select(S.decals.length - 1);
    updateDecal(d);
    hint('Drag the sticker around on him.');
  }
  function select(i) {
    S.sel = i;
    const d = S.decals[i];
    $('.st-seltools').hidden = !d;
    $('.st-sclear').hidden = S.decals.length < 2;
    stage.classList.toggle('st-has-sel', !!d);
    if (d) { $('.st-ssize').value = d.size; $('.st-srot').value = d.rot; }
    placeRing();
  }
  $('.st-ssize').addEventListener('input', (e) => { const d = S.decals[S.sel]; if (d) { d.size = +e.target.value; updateDecal(d); } });
  $('.st-srot').addEventListener('input', (e) => { const d = S.decals[S.sel]; if (d) { d.rot = +e.target.value; updateDecal(d); } });
  $('.st-sdel').addEventListener('click', () => { if (S.sel < 0) return; S.decals.splice(S.sel, 1); select(-1); syncDecals(); });
  $('.st-sdone').addEventListener('click', () => select(-1));
  $('.st-sclear').addEventListener('click', () => { S.decals = []; select(-1); syncDecals(); });
  function placeRing() {
    const d = S.decals[S.sel];
    if (!G || !d) { ring.hidden = true; return; }
    const p = new THREE.Vector3(...d.p).applyMatrix4(G.spin.matrixWorld);
    const q = p.clone().project(G.camera);
    const right = new THREE.Vector3().setFromMatrixColumn(G.camera.matrixWorld, 0);
    const e2 = p.clone().addScaledVector(right, d.size * 0.55).project(G.camera);
    const W = stage.clientWidth;
    const r = Math.max(14, Math.hypot(e2.x - q.x, e2.y - q.y) * W / 2);
    ring.style.cssText = `left:${(q.x + 1) / 2 * W}px;top:${(1 - q.y) / 2 * W}px;width:${r * 2}px;height:${r * 2}px`;
    ring.hidden = false;
  }

  // ---------- UI: backgrounds ----------
  function buildBgUI() {
    const f = flavor(), cur = S.bg;
    $('.st-bgsolid').innerHTML = `<button type="button" class="st-sw st-none" data-bg="none" aria-label="Transparent" title="Transparent" aria-pressed="${cur.type === 'none'}"><span>none</span></button>`
      + BG_SOLIDS.map(([n, c]) => `<button type="button" class="st-sw" data-bg="solid" data-c="${c}" aria-label="${n}" title="${n}" style="--c:${c}" aria-pressed="${cur.type === 'solid' && cur.color === c}"></button>`).join('');
    $('.st-bgpat').innerHTML = BG_KINDS.map(([k, n]) => `<button type="button" class="st-sw st-pat" data-bg="${k}" aria-label="${n}" title="${n}" aria-pressed="${cur.type === k}"><canvas width="88" height="88"></canvas><span>${n}</span></button>`).join('')
      + (photo ? `<button type="button" class="st-sw st-pat" data-bg="photo" aria-label="Your photo" title="Your photo" aria-pressed="${cur.type === 'photo'}"><canvas width="88" height="88"></canvas><span>Your photo</span></button>` : '');
    $$('.st-bgpat canvas').forEach((c) => paintBg(c.getContext('2d'), 88, 88, { cx: 44, cy: 44, s: 88 * 2.2 }, { type: c.parentElement.dataset.bg }, f, photo));
  }
  $('.st-pane[data-pane="bg"]').addEventListener('click', (e) => {
    const b = e.target.closest('[data-bg]');
    if (b) { S.bg = b.dataset.bg === 'solid' ? { type: 'solid', color: b.dataset.c } : { type: b.dataset.bg }; buildBgUI(); paintPreviewBg(); return; }
    if (e.target.closest('.st-bgup')) $('.st-bgin').click();
  });
  $('.st-bgin').addEventListener('change', async (e) => {
    const file = e.target.files[0]; e.target.value = '';
    if (!file) return;
    const url = URL.createObjectURL(file);
    try { photo = imageCanvas(await loadImg(url), 2600); S.bg = { type: 'photo' }; buildBgUI(); paintPreviewBg(); }
    catch (err) { console.warn(err); hint('That photo would not open.'); }
    finally { URL.revokeObjectURL(url); }
  });

  // ---------- export ----------
  async function exportBlob(fmt = 'square') {
    const F = FORMATS[fmt]; if (!F) throw new Error('unknown format ' + fmt);
    const g = await ensure3D(); if (!g) throw new Error('3D not available');
    await syncing;
    const W = F.w, H = F.h, fr = F.frame(W, H);
    const k = Math.min(1, g.maxDim / Math.max(W, H));
    const R = g.renderer, keepPR = R.getPixelRatio(), keepSize = R.getSize(new THREE.Vector2());
    const out = document.createElement('canvas'); out.width = W; out.height = H;
    const ctx = out.getContext('2d');
    try {
      R.setPixelRatio(1); R.setSize(Math.round(W * k), Math.round(H * k), false);
      poseCamera(W / H, { W, H, fr });
      render3D();
      paintBg(ctx, W, H, fr, S.bg, flavor(), photo);
      ctx.drawImage(R.domElement, 0, 0, W, H); // same task as the render, so the drawing buffer is still there
    } finally {
      R.setPixelRatio(keepPR); R.setSize(keepSize.x, keepSize.y, false);
      draw();
    }
    return await new Promise((res, rej) => out.toBlob((b) => b ? res(b) : rej(new Error('toBlob failed')), 'image/png'));
  }
  let lastUrl = null;
  $('.st-saves').addEventListener('click', async (e) => {
    const b = e.target.closest('[data-fmt]'); if (!b || b.disabled) return;
    const fmt = b.dataset.fmt, F = FORMATS[fmt];
    $$('.st-save').forEach((x) => { x.disabled = true; });
    b.classList.add('busy');
    const out = $('.st-out'), msg = $('.st-outmsg');
    try {
      const blob = await exportBlob(fmt);
      const name = `grumpl-${(flavor().name || 'grumpl').toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${fmt}.png`;
      if (lastUrl) URL.revokeObjectURL(lastUrl);
      lastUrl = URL.createObjectURL(blob);
      const img = $('.st-outimg'); img.src = lastUrl; img.dataset.fmt = fmt;
      const dl = $('.st-dl'); dl.href = lastUrl; dl.download = name;
      out.hidden = false;
      const file = typeof File === 'function' ? new File([blob], name, { type: 'image/png' }) : null;
      const canShare = coarse && file && navigator.canShare?.({ files: [file] });
      const share = $('.st-share');
      share.hidden = !canShare;
      share.onclick = () => navigator.share({ files: [file], title: 'Grumpl' }).catch(() => {});
      msg.textContent = `${F.label}, ${F.w} × ${F.h}. ` + (coarse ? 'Press and hold the picture to save it to your photos.' : 'It should be in your downloads.');
      if (canShare) {
        try { await navigator.share({ files: [file], title: 'Grumpl' }); }
        catch (err) { if (err?.name !== 'AbortError') console.info('share skipped', err?.name); }
      } else dl.click();
      el.dispatchEvent(new CustomEvent('studio-export', { bubbles: true, detail: { fmt, width: F.w, height: F.h, size: blob.size } }));
    } catch (err) {
      console.error(err);
      msg.textContent = 'That did not work. Try a smaller size?'; out.hidden = false;
    } finally {
      $$('.st-save').forEach((x) => { x.disabled = false; });
      b.classList.remove('busy');
    }
  });

  // ---------- pointer: turn, pinch zoom, wheel zoom, drag stickers ----------
  const ptr = new Map();
  let drag = null, pinch = null, wheelOk = false;
  stage.addEventListener('pointerdown', (e) => {
    if (!G) return;
    ptr.set(e.pointerId, { x: e.clientX, y: e.clientY });
    try { stage.setPointerCapture(e.pointerId); } catch {}
    wheelOk = true;
    if (ptr.size === 2) {
      const [a, b] = [...ptr.values()];
      pinch = { d0: Math.hypot(b.x - a.x, b.y - a.y), z0: S.zoom, my: (a.y + b.y) / 2, l0: S.look };
      drag = null; return;
    }
    const di = pickDecal(ndcOf(e));
    if (di >= 0) { select(di); drag = { mode: 'stick', x: e.clientX, y: e.clientY }; return; }
    drag = { mode: 'turn', x: e.clientX, y: e.clientY, ry: S.ry, rx: S.rx, moved: false };
  });
  stage.addEventListener('pointermove', (e) => {
    if (!ptr.has(e.pointerId) || !G) return;
    ptr.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pinch && ptr.size >= 2) {
      const [a, b] = [...ptr.values()], dd = Math.hypot(b.x - a.x, b.y - a.y);
      S.look = clamp(pinch.l0 + ((a.y + b.y) / 2 - pinch.my) * 0.004 * (S.zoom / 6.6), 0.25, 1.85);
      S.zoom = clamp(pinch.z0 * pinch.d0 / Math.max(10, dd), ZMIN, ZMAX);
      syncSliders(); invalidate(); return;
    }
    if (!drag) return;
    if (Math.hypot(e.clientX - drag.x, e.clientY - drag.y) > 6) drag.moved = true;
    if (drag.mode === 'stick') {
      const d = S.decals[S.sel], h = d && hitBody(ndcOf(e));
      if (h) { Object.assign(d, toFigure(h)); updateDecal(d); }
      return;
    }
    S.ry = drag.ry + (e.clientX - drag.x) * 0.012;
    S.rx = clamp(drag.rx + (e.clientY - drag.y) * 0.004, -0.35, 0.45);
    syncSliders(); invalidate();
  });
  const up = (e) => {
    if (drag?.mode === 'turn' && !drag.moved && S.sel >= 0 && e.type === 'pointerup') select(-1);
    ptr.delete(e.pointerId);
    if (ptr.size < 2) pinch = null;
    if (!ptr.size) drag = null;
  };
  stage.addEventListener('pointerup', up);
  stage.addEventListener('pointercancel', up);
  stage.addEventListener('pointerleave', () => { if (!ptr.size) wheelOk = false; });
  // a scroll wheel only zooms once you have grabbed him (or pinched a trackpad), so the page still scrolls past
  stage.addEventListener('wheel', (e) => {
    if (!G || !(wheelOk || e.ctrlKey)) return;
    e.preventDefault();
    S.zoom = clamp(S.zoom * Math.exp(e.deltaY * (e.ctrlKey ? 0.01 : 0.0015)), ZMIN, ZMAX);
    syncSliders(); invalidate();
  }, { passive: false });

  let hintT;
  function hint(t) { const h = $('.st-hint'); h.textContent = t; h.classList.add('on'); clearTimeout(hintT); hintT = setTimeout(() => h.classList.remove('on'), 2600); }

  // ---------- lifecycle: build near the screen, pause off it, throw away far from it ----------
  const ioNear = new IntersectionObserver((es) => {
    for (const en of es) {
      near = en.isIntersecting;
      if (near) ensure3D().then((g) => { if (g) { sizeGL(); invalidate(); } });
      else { cancelAnimationFrame(raf); raf = 0; }
    }
  }, { rootMargin: '300px 0px' });
  const ioFar = new IntersectionObserver((es) => { for (const en of es) if (!en.isIntersecting) teardown3D(); }, { rootMargin: '300% 0px' });
  ioNear.observe(el); ioFar.observe(el);
  const ro = new ResizeObserver(() => { paintPreviewBg(); sizeGL(); });
  ro.observe(stage);

  // ---------- first paint ----------
  // the picker's styles live in colors.css; load them if the page didn't
  if (![...document.styleSheets].some((ss) => ss.href && ss.href.split('?')[0].endsWith('/colors.css')) && !document.querySelector('link[data-studio-colors]')) {
    const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = COLORS_CSS; l.dataset.studioColors = ''; document.head.append(l);
  }
  buildDots();
  syncSliders();
  stage.dataset.state = 'sleep';
  refreshFlavor();
  hint('Drag to turn him. Pinch to zoom.');

  return {
    get state() { return S; },
    flavors,
    setFlavor,
    addColor: (name, hexStr) => addCustom(name, hexStr),
    picker,
    get _three() { return G; },
    exportBlob,
    ready: () => ensure3D(),
    destroy() {
      destroyed = true;
      cancelAnimationFrame(pickRaf); clearTimeout(bgT);
      ioNear.disconnect(); ioFar.disconnect(); ro.disconnect();
      window.removeEventListener('grumpl-color', onColor);
      teardown3D();
      if (lastUrl) URL.revokeObjectURL(lastUrl);
      el.innerHTML = '';
    },
  };
}
