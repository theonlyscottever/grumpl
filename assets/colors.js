// "Request a color": a picker, a name generator and the shared list. It lives in the studio's Color tab
// (studio.js calls mountPicker); the 3D Grumpl there is the preview.
// Styles live in colors.css (scoped under .cl-root inside #Studio or #Colors).

// Set to a form endpoint, e.g. Formspree (https://formspree.io/f/xxxx) or a Google Apps Script web app URL.
// Requests are POSTed as JSON: {name, hex, at}. Empty means local-only (saved in this browser + "Post it on X").
export const REQUEST_ENDPOINT = '';

// X handle for the prefilled post. Needs confirming: is the brand account really @grumpl_ ?
export const X_HANDLE = 'grumpl_';

const LS_MINE = 'grumpl-colors';        // [{name, hex, at}] the visitor's own requests
const LS_VOTES = 'grumpl-color-votes';  // [id] the requests this visitor has +1'd
const SEED_URL = new URL('./color-requests.json', import.meta.url);

export const STARTERS = [
  ['Blue Raspberry', '#56c2dc'], ['Strawberry Gummy', '#ff5a50'], ['Clover', '#4ca63e'],
  ['Lunchbutter', '#e3c45c'], ['Fleshberry', '#f0a99a'], ['Mosssnootfruit', '#8f9d38'],
  ['Cement Juice', '#9b9a93'], ['Grape Bruise', '#7350a8'], ['Gravy', '#8a5634'],
  ['Pool Water', '#47d6c4'], ['Bubblegum', '#ff8fc8'], ['Tar', '#2a2530'],
];

/* ---------------- color math ---------------- */
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const hex2 = (n) => Math.round(clamp(n, 0, 255)).toString(16).padStart(2, '0');
const rgbToHex = ([r, g, b]) => '#' + hex2(r) + hex2(g) + hex2(b);

export function parseHex(str) {
  const m = String(str || '').trim().replace(/^#/, '').toLowerCase();
  if (/^[0-9a-f]{3}$/.test(m)) return '#' + m.split('').map((c) => c + c).join('');
  if (/^[0-9a-f]{6}$/.test(m)) return '#' + m;
  return null;
}
const hexToRgb = (h) => [0, 2, 4].map((i) => parseInt(h.slice(1 + i, 3 + i), 16));

function rgbToHsv([r, g, b]) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  let h = 0;
  if (d) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h = (h * 60 + 360) % 360;
  }
  return { h, s: max ? d / max : 0, v: max };
}
function hsvToRgb({ h, s, v }) {
  const f = (n) => { const k = (n + h / 60) % 6; return v - v * s * Math.max(0, Math.min(k, 4 - k, 1)); };
  return [f(5) * 255, f(3) * 255, f(1) * 255];
}
function rgbToHsl([r, g, b]) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2, d = max - min;
  const s = d ? d / (1 - Math.abs(2 * l - 1)) : 0;
  return { h: rgbToHsv([r * 255, g * 255, b * 255]).h, s, l };
}
function hslToRgb({ h, s, l }) {
  const a = s * Math.min(l, 1 - l);
  const f = (n) => { const k = (n + h / 30) % 12; return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)); };
  return [f(0) * 255, f(8) * 255, f(4) * 255];
}
const luminance = (hex) => {
  const c = hexToRgb(hex).map((x) => { x /= 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
const mix = (a, b, t) => rgbToHex(hexToRgb(a).map((x, i) => x + (hexToRgb(b)[i] - x) * t));

// The airbrush set, same idea as the flavors in drop.js: edge is the luminous neighbouring hue, belly is lighter.
export function deriveTones(hex) {
  const hsl = rgbToHsl(hexToRgb(hex));
  const grey = hsl.s < 0.08;
  const edge = rgbToHex(hslToRgb({
    h: (hsl.h + 25) % 360,
    s: grey ? hsl.s : clamp(hsl.s * 1.15 + 0.06),
    l: clamp(hsl.l + (hsl.l < 0.25 ? 0.06 : -0.03), 0.06, 0.88),
  }));
  const belly = rgbToHex(hslToRgb({ h: hsl.h, s: clamp(hsl.s * 0.85), l: clamp(hsl.l + (1 - hsl.l) * 0.38) }));
  return { base: hex, edge, belly };
}

/* ---------------- names ---------------- */
// Real flavors for the vibe: Fleshberry, Mosssnootfruit, Color That Tastes Like Obo's Foot, Lunchbutter,
// Cement Juice, Bagfasehed Speshul, Blue Raspberry, Strawberry Gummy, Clover.
const W = {
  red: ['ketchup', 'scab', 'cherry', 'radish', 'jam', 'tomato', 'beet', 'hot sauce', 'rash', 'gum', 'salami', 'licorice', 'pimento', 'cough drop', 'sunburn'],
  pink: ['flesh', 'ham', 'tongue', 'gum', 'shrimp', 'bubblegum', 'piggy', 'earlobe', 'nose', 'taffy', 'bologna', 'cheek', 'toe bean', 'eraser', 'lunchmeat'],
  orange: ['cheese', 'yolk', 'nacho', 'carrot', 'yam', 'peach', 'cheddar', 'creamsicle', 'traffic cone', 'pumpkin', 'cheese dust', 'apricot', 'rust', 'sunburn'],
  yellow: ['butter', 'mustard', 'custard', 'earwax', 'yolk', 'banana', 'lemon', 'corn', 'pudding', 'margarine', 'pollen', 'cheese', 'mayo', 'popcorn'],
  lime: ['pickle', 'relish', 'slime', 'booger', 'pea', 'bile', 'celery', 'lime', 'sprout', 'kiwi', 'tennis ball', 'gecko', 'pond'],
  green: ['moss', 'snot', 'pickle', 'lettuce', 'frog', 'swamp', 'pea', 'clover', 'algae', 'spinach', 'cabbage', 'broccoli', 'lawn', 'toad', 'mold'],
  teal: ['pool', 'mouthwash', 'toothpaste', 'lagoon', 'mint', 'aquarium', 'slushie', 'gum', 'sea glass', 'jelly', 'frog spit'],
  blue: ['puddle', 'slushie', 'vein', 'raspberry', 'denim', 'ice pop', 'freezer', 'blueberry', 'pool', 'tongue', 'mouthwash', 'jello', 'sky'],
  purple: ['grape', 'bruise', 'plum', 'eggplant', 'jam', 'cough syrup', 'beet', 'yam', 'jelly', 'blackberry', 'gum', 'lip'],
  brown: ['gravy', 'toe', 'cardboard', 'mud', 'crust', 'bark', 'peanut', 'meatloaf', 'cocoa', 'toast', 'beef', 'scab', 'pretzel', 'raisin', 'bean', 'coffee'],
  grey: ['cement', 'lint', 'sock', 'pigeon', 'gravel', 'dishwater', 'dust', 'fog', 'eraser', 'sidewalk', 'pebble', 'oatmeal', 'mouse'],
  white: ['milk', 'glue', 'tooth', 'paste', 'mayo', 'marshmallow', 'rice', 'sock', 'yogurt', 'cloud', 'tofu', 'frosting'],
  black: ['tar', 'licorice', 'burnt toast', 'tire', 'ink', 'crow', 'olive', 'squid ink', 'coal', 'gutter', 'night'],
};
const PASTEL = ['milk', 'frosting', 'mallow', 'foam', 'cream', 'paste', 'fluff', 'yogurt'];
const BODY = ['snoot', 'toe', 'knee', 'belly', 'ear', 'elbow', 'tongue', 'chin', 'nose', 'gum', 'cheek', 'foot', 'heel', 'pit', 'thumb', 'neck', 'lip', 'tooth', 'scalp', 'nostril', 'knuckle', 'shin'];
const FOOD = ['fruit', 'berry', 'butter', 'juice', 'pudding', 'soup', 'cake', 'loaf', 'jam', 'pie', 'crisp', 'nugget', 'fizz', 'puff', 'crumble', 'munch', 'gum', 'drops', 'sauce', 'milk', 'chowder', 'jelly', 'paste', 'bites', 'water', 'slaw', 'mash', 'sludge', 'cobbler', 'dip'];
const WHO = ['Obo', 'Pim', 'Nana', 'Gus', 'Grandpa', 'the Dog', 'Dwayne', 'Mr. Biscuit', 'Toad', 'Uncle Lenny', 'Beanie', 'the Mailman', 'Lorna', 'my Cousin', 'Big Doug', 'Wendell', 'Mopsy', 'the Lunch Lady'];
const THINGS = ['a Wet Penny', 'the Bus Seat', 'a Lost Mitten', 'the Back of the Fridge', 'a Warm Coin', 'the Car Ride Home', 'a Bath Toy', 'the Bottom of a Bag', 'a Pocket', 'the Pool Drain', 'Grass Stains', 'a Library Book', 'a Licked Battery', 'the Dentist'];
const SPESHUL = ['Speshul', 'Deluxe', 'Supreme', 'Xtra', 'Classic', 'Lite', 'Original', 'Nite Edition', 'Jr.'];

function bucket(hex) {
  const { h, s, v } = rgbToHsv(hexToRgb(hex));
  if (v < 0.2) return 'black';
  if (s < 0.12) return v > 0.88 ? 'white' : 'grey';
  if (h >= 12 && h < 50 && (v < 0.62 || s < 0.38)) return 'brown';
  if (h < 12 || h >= 345) return s < 0.5 && v > 0.7 ? 'pink' : 'red';
  if (h < 40) return s < 0.45 && v > 0.75 ? 'pink' : 'orange';
  if (h < 66) return 'yellow';
  if (h < 95) return 'lime';
  if (h < 160) return 'green';
  if (h < 195) return 'teal';
  if (h < 255) return 'blue';
  if (h < 300) return 'purple';
  return 'pink';
}

const pick = (a) => a[Math.floor(Math.random() * a.length)];
const cap = (w) => w.replace(/(^|[\s-])(\S)/g, (m, sp, c) => sp + c.toUpperCase());
const smush = (...parts) => { const s = parts.join('').replace(/\s+/g, '').toLowerCase(); return s[0].toUpperCase() + s.slice(1); };
const oneWord = (list) => { const w = list.filter((x) => !x.includes(' ')); return pick(w.length ? w : list); };

export function makeName(hex) {
  const b = bucket(hex);
  const { s, v } = rgbToHsv(hexToRgb(hex));
  let hue = W[b];
  if (v > 0.85 && s < 0.4 && b !== 'white') hue = hue.concat(PASTEL);
  const r = Math.random();
  if (r < 0.34) {                       // Mosssnootfruit
    const three = smush(oneWord(hue), pick(BODY), pick(FOOD));
    return Math.random() < 0.6 && three.length <= 15 ? three : smush(oneWord(hue), pick(FOOD));
  }
  if (r < 0.58) return cap(`${pick(hue)} ${pick(FOOD)}`);           // Cement Juice
  if (r < 0.7) return cap(`${pick(hue)} ${pick(BODY)}`);           // Pickle Knee
  if (r < 0.79) return smush(Math.random() < 0.5 ? oneWord(hue) : pick(BODY), pick(['berry', 'fruit', 'butter', 'melon', 'cherry', 'plum'])); // Fleshberry
  if (r < 0.92) {                       // Color That Tastes Like Obo's Foot
    return Math.random() < 0.65
      ? `Color That Tastes Like ${pick(WHO)}'s ${cap(pick(BODY))}`
      : `Color That Tastes Like ${pick(THINGS)}`;
  }
  return cap(`${smush(oneWord(hue), pick(['hed', 'bag', 'face', 'bonk', 'snout', 'gut']))} ${pick(SPESHUL)}`); // Bagfasehed Speshul
}

/* ---------------- storage (all wrapped: private windows throw) ---------------- */
const load = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k)); return v ?? d; } catch { return d; } };
const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* storage off: fine */ } };
const idOf = (r) => `${r.name.trim().toLowerCase()}|${r.hex}`;

/* ---------------- markup ---------------- */
const ICON = {
  dice: '<svg viewBox="0 0 20 20" aria-hidden="true"><rect x="3" y="3" width="14" height="14" rx="3.5" fill="none" stroke="currentColor" stroke-width="2.2"/><g fill="currentColor"><circle cx="7" cy="7" r="1.5"/><circle cx="13" cy="13" r="1.5"/><circle cx="10" cy="10" r="1.5"/></g></svg>',
  drop: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M13.2 3.3a2.3 2.3 0 0 1 3.3 3.3l-1.6 1.6.9.9-1.4 1.4-.9-.9-6.2 6.2H4.6v-2.7l6.2-6.2-.9-.9 1.4-1.4.9.9z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>',
  x: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 3h3.4l9 14h-3.4zM16 3l-5.2 5.8M4 17l5.3-5.9" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  arrow: '<svg viewBox="0 0 20 20" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" d="M10 4v12M5 11l5 5 5-5"/></svg>',
  plus: '<svg viewBox="0 0 20 20" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" d="M10 4v12M4 10h12"/></svg>',
};

function pickerMarkup(u, { starters, tryButton }) {
  return `
<div class="cl-card cl-picker">
  <div class="cl-sv" role="slider" tabindex="0" aria-label="Saturation and brightness. Left and right for saturation, up and down for brightness"
    aria-valuemin="0" aria-valuemax="100">
    <span class="cl-sv-thumb"></span>
  </div>
  <div class="cl-hue" role="slider" tabindex="0" aria-label="Hue" aria-valuemin="0" aria-valuemax="360">
    <span class="cl-hue-thumb"></span>
  </div>
  <div class="cl-hexrow">
    <span class="cl-chip" aria-hidden="true"></span>
    <label class="cl-hexfield"><span>#</span>
      <input type="text" inputmode="text" autocomplete="off" autocapitalize="off" spellcheck="false" maxlength="7" aria-label="Hex color, 3 or 6 digits">
    </label>
    <button class="cl-btn cl-eye" type="button" hidden aria-label="Pick a color from the screen">${ICON.drop}<span>Eyedropper</span></button>
  </div>
  ${starters.length ? '<div class="cl-starters" role="group" aria-label="Start from a color"></div>' : ''}
</div>
<div class="cl-slot" data-slot="after-picker"></div>
<form class="cl-card cl-namecard" novalidate>
  <label class="cl-lbl" for="${u}-name">What's it called</label>
  <div class="cl-namerow">
    <input id="${u}-name" class="cl-name" type="text" maxlength="48" autocomplete="off" placeholder="Lunchbutter">
    <button class="cl-btn cl-gen" type="button">${ICON.dice}<span>Name it for me</span></button>
  </div>
  <div class="cl-actions">
    <button class="cl-go" type="submit">Put it on the list</button>
    ${tryButton ? '<button class="cl-btn cl-try" type="button">Try it on a Grumpl</button>' : ''}
    <a class="cl-btn cl-x" target="_blank" rel="noopener">${ICON.x}<span>Post it on X</span></a>
  </div>
  <p class="cl-status" role="status"></p>
</form>
<div class="cl-listwrap">
  <div class="cl-listhead">
    <h3>The list</h3>
    <p>Tap one to put it on him. +1 the ones you'd put on a shelf.</p>
  </div>
  <ul class="cl-list"></ul>
  <button class="cl-more cl-btn" type="button" hidden></button>
</div>`;
}

/* ---------------- mount ---------------- */
// The picker, the name card and the list, without any preview: the caller shows the color (the studio's 3D Grumpl).
// opts.onChange({ hex, name, edge, belly, why }) fires on every color or name change ('color' | 'name' | 'load').
// opts.starters: [[name, hex]] swatches under the picker ([] for none). opts.tryButton: show "Try it on a Grumpl".
// Returns { setHex(hex, {silent}), setName(name, {silent}), hex, name, el }.
export function mountPicker(el, { onChange = () => {}, starters = STARTERS, tryButton = false, hex: hex0 = '#56c2dc' } = {}) {
  if (!el) return null;
  const u = 'cl' + Math.random().toString(36).slice(2, 7);
  el.classList.add('cl-root');
  el.innerHTML = pickerMarkup(u, { starters, tryButton });
  const $ = (s) => el.querySelector(s);
  const sv = $('.cl-sv'), svThumb = $('.cl-sv-thumb'), hue = $('.cl-hue'), hueThumb = $('.cl-hue-thumb');
  const hexIn = $('.cl-hexfield input'), nameIn = $('.cl-name');
  const status = $('.cl-status'), xLink = $('.cl-x'), list = $('.cl-list'), more = $('.cl-more');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const state = { h: 200, s: 0.6, v: 0.86, hex: parseHex(hex0) || '#56c2dc' };
  const name = () => nameIn.value.trim().replace(/\s+/g, ' ');
  let silent = false;
  const tell = (why) => { if (silent) return; const t = deriveTones(state.hex); onChange({ hex: state.hex, name: name(), edge: t.edge, belly: t.belly, why }); };

  function paint({ fromInput = false, why = 'color' } = {}) {
    const hex = state.hex;
    const t = deriveTones(hex);
    const darkText = luminance(hex) > 0.36;
    el.style.setProperty('--cl-c', hex);
    el.style.setProperty('--cl-edge', t.edge);
    el.style.setProperty('--cl-belly', t.belly);
    el.style.setProperty('--cl-c-ink', darkText ? 'var(--ink)' : 'var(--paper)');
    el.style.setProperty('--cl-hue', `hsl(${state.h} 100% 50%)`);
    el.style.setProperty('--cl-wash', mix(hex, '#ffffff', 0.82));
    svThumb.style.left = state.s * 100 + '%';
    svThumb.style.top = (1 - state.v) * 100 + '%';
    hueThumb.style.left = (state.h / 360) * 100 + '%';
    sv.setAttribute('aria-valuenow', Math.round(state.s * 100));
    sv.setAttribute('aria-valuetext', `Saturation ${Math.round(state.s * 100)}%, brightness ${Math.round(state.v * 100)}%, ${hex}`);
    hue.setAttribute('aria-valuenow', Math.round(state.h));
    hue.setAttribute('aria-valuetext', `Hue ${Math.round(state.h)} degrees, ${hex}`);
    if (!fromInput) { hexIn.value = hex.slice(1); hexIn.removeAttribute('aria-invalid'); }
    el.querySelectorAll('.cl-starters button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.hex === hex)));
    xLink.href = xUrl(name(), state.hex);
    tell(why);
  }
  function paintName() {
    xLink.href = xUrl(name(), state.hex);
    tell('name');
  }
  const fromHsv = () => { state.hex = rgbToHex(hsvToRgb(state)); paint(); };
  function setHex(hex, opts = {}) {
    hex = parseHex(hex);
    if (!hex) return false;
    const hsv = rgbToHsv(hexToRgb(hex));
    // keep the hue when the color has none (greys, black), so the strip doesn't jump to red
    state.h = hsv.s && hsv.v ? hsv.h : state.h;
    state.s = hsv.v ? hsv.s : state.s;
    state.v = hsv.v;
    state.hex = hex;
    const was = silent; silent = was || !!opts.silent;
    paint(opts);
    silent = was;
    return true;
  }

  // dragging: pointer events with capture, so a thumb can wander off the square and keep going
  function drag(area, onMove) {
    area.addEventListener('pointerdown', (e) => {
      if (e.button > 0) return;
      e.preventDefault();
      area.focus({ preventScroll: true });
      area.setPointerCapture(e.pointerId);
      area.classList.add('grab');
      const r = area.getBoundingClientRect();
      const move = (ev) => onMove(clamp((ev.clientX - r.left) / r.width), clamp((ev.clientY - r.top) / r.height));
      move(e);
      const up = () => { area.classList.remove('grab'); area.removeEventListener('pointermove', move); area.removeEventListener('pointerup', up); area.removeEventListener('pointercancel', up); };
      area.addEventListener('pointermove', move);
      area.addEventListener('pointerup', up);
      area.addEventListener('pointercancel', up);
    });
  }
  drag(sv, (x, y) => { state.s = x; state.v = 1 - y; fromHsv(); });
  drag(hue, (x) => { state.h = Math.min(359.9, x * 360); fromHsv(); });

  sv.addEventListener('keydown', (e) => {
    const st = e.shiftKey ? 0.1 : 0.01;
    const k = { ArrowLeft: [-st, 0], ArrowRight: [st, 0], ArrowUp: [0, st], ArrowDown: [0, -st], PageUp: [0, 0.1], PageDown: [0, -0.1] }[e.key];
    if (!k) return;
    e.preventDefault();
    state.s = clamp(state.s + k[0]); state.v = clamp(state.v + k[1]); fromHsv();
  });
  hue.addEventListener('keydown', (e) => {
    const st = e.shiftKey ? 10 : 1;
    const d = { ArrowLeft: -st, ArrowDown: -st, ArrowRight: st, ArrowUp: st, PageUp: 30, PageDown: -30 }[e.key];
    if (e.key === 'Home') state.h = 0; else if (e.key === 'End') state.h = 359; else if (d == null) return;
    else state.h = (state.h + d + 360) % 360;
    e.preventDefault(); fromHsv();
  });

  hexIn.addEventListener('input', () => {
    const v = hexIn.value.replace(/[^0-9a-f#]/gi, '');
    if (v !== hexIn.value) hexIn.value = v;
    const ok = setHex(v, { fromInput: true });
    hexIn.toggleAttribute('aria-invalid', !ok && v.replace('#', '').length >= 3);
  });
  const settle = () => { hexIn.value = state.hex.slice(1); hexIn.removeAttribute('aria-invalid'); };
  hexIn.addEventListener('blur', settle);
  hexIn.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); settle(); hexIn.blur(); } });
  hexIn.addEventListener('paste', (e) => {
    const t = (e.clipboardData || window.clipboardData)?.getData('text');
    if (t && parseHex(t)) { e.preventDefault(); setHex(t); }
  });

  const startersEl = $('.cl-starters');
  if (startersEl) {
    startersEl.innerHTML = starters.map(([n, h]) => `<button type="button" data-hex="${h}" style="--sw:${h}" aria-label="${n} ${h}" title="${n}"></button>`).join('');
    startersEl.addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) { setHex(b.dataset.hex); bounce(b); } });
  }

  const eye = $('.cl-eye');
  if ('EyeDropper' in window) {
    eye.hidden = false;
    eye.addEventListener('click', async () => {
      try { const r = await new window.EyeDropper().open(); setHex(r.sRGBHex); } catch { /* cancelled */ }
    });
  }

  // names: no repeats on consecutive presses (remembers the last dozen)
  const recent = [];
  $('.cl-gen').addEventListener('click', (e) => {
    let n, tries = 0;
    do { n = makeName(state.hex); } while ((recent.includes(n) || n === name()) && ++tries < 40);
    recent.push(n); if (recent.length > 12) recent.shift();
    nameIn.value = n;
    paintName();
    if (status.dataset.kind === 'warn') say('');
    bounce(e.currentTarget);
  });
  nameIn.addEventListener('input', () => { paintName(); if (status.dataset.kind === 'warn') say(''); });

  function bounce(node) { if (reduced || !node) return; node.classList.remove('bump'); void node.offsetWidth; node.classList.add('bump'); }
  function say(msg, kind = '') { status.textContent = msg; status.dataset.kind = kind; bounce(status); }

  $('.cl-try')?.addEventListener('click', () => {
    const t = deriveTones(state.hex);
    window.dispatchEvent(new CustomEvent('grumpl-color', { detail: { name: name() || 'Unnamed', hex: state.hex, edge: t.edge, belly: t.belly } }));
    const studio = document.getElementById('Studio');
    if (studio) studio.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
    else say('No Grumpl to try it on yet. Soon.');
  });

  $('.cl-namecard').addEventListener('submit', async (e) => {
    e.preventDefault();
    const n = name();
    if (!n) { say('It needs a name. Or hit "Name it for me".', 'warn'); nameIn.focus(); bounce(nameIn); return; }
    const req = { name: n.slice(0, 48), hex: state.hex, at: new Date().toISOString() };
    let mine = load(LS_MINE, []);
    if (!Array.isArray(mine)) mine = [];
    if (!mine.some((r) => idOf(r) === idOf(req))) { mine.unshift(req); save(LS_MINE, mine.slice(0, 50)); }
    render();
    const go = $('.cl-go'); bounce(go);
    if (!REQUEST_ENDPOINT) { say(`Saved "${req.name}". It's on your list below. Post it on X so we see it.`, 'ok'); return; }
    go.disabled = true; say('Sending…');
    try {
      // Apps Script can't answer a CORS preflight, so send it as text/plain there. Formspree wants JSON.
      const plain = /script\.google(usercontent)?\.com/.test(REQUEST_ENDPOINT);
      const res = await fetch(REQUEST_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': plain ? 'text/plain;charset=utf-8' : 'application/json', Accept: 'application/json' },
        body: JSON.stringify(req),
      });
      if (!res.ok) throw new Error(res.status);
      say(`Sent. "${req.name}" is on the list.`, 'ok');
    } catch {
      say("Couldn't send it. Saved here anyway, and X still works.", 'warn');
    } finally { go.disabled = false; }
  });

  /* ---------- the list ---------- */
  // Votes are local until an endpoint exists: a +1 is saved in this browser only and added to the seed count.
  let seed = [], expanded = false;
  const LIMIT = 12;
  function render() {
    const stored = load(LS_MINE, []);
    const mine = (Array.isArray(stored) ? stored : []).filter((r) => r && parseHex(r.hex) && r.name).map((r) => ({ ...r, hex: parseHex(r.hex), count: 0, mine: true }));
    const mineIds = new Set(mine.map(idOf));
    const v0 = load(LS_VOTES, []);
    const votes = new Set(Array.isArray(v0) ? v0 : []);
    const rest = seed.filter((r) => !mineIds.has(idOf(r))).sort((a, b) => (b.count + votes.has(idOf(b))) - (a.count + votes.has(idOf(a))));
    const all = mine.concat(rest);
    const shown = expanded ? all : all.slice(0, LIMIT);
    list.innerHTML = shown.map((r, i) => {
      const id = idOf(r), on = votes.has(id), n = (r.count || 0) + (on ? 1 : 0);
      const tilt = ((i * 37) % 7 - 3) * 0.45;
      return `<li style="--sw:${r.hex};--tilt:${tilt}deg" class="${r.mine ? 'mine' : ''}">
        <button type="button" class="cl-load" data-hex="${r.hex}" data-name="${esc(r.name)}" aria-label="Load ${esc(r.name)}, ${r.hex}">
          <i aria-hidden="true"></i><b>${esc(r.name)}</b><small>${r.hex}${r.mine ? '<em>yours</em>' : ''}</small>
        </button>
        <button type="button" class="cl-vote" data-id="${esc(id)}" aria-pressed="${on}" aria-label="Plus one ${esc(r.name)}, ${n} so far">+1<span>${n}</span></button>
      </li>`;
    }).join('') || '<li class="cl-empty">Nothing yet. Be first.</li>';
    more.hidden = all.length <= LIMIT;
    more.textContent = expanded ? 'Show fewer' : `Show all ${all.length}`;
  }
  list.addEventListener('click', (e) => {
    const ld = e.target.closest('.cl-load');
    if (ld) {
      nameIn.value = ld.dataset.name;
      setHex(ld.dataset.hex, { why: 'load' });
      say('');
      bounce(ld);
      return;
    }
    const vt = e.target.closest('.cl-vote');
    if (vt) {
      const v0 = load(LS_VOTES, []);
      const votes = new Set(Array.isArray(v0) ? v0 : []);
      const id = vt.dataset.id;
      votes.has(id) ? votes.delete(id) : votes.add(id);
      save(LS_VOTES, [...votes]);
      const on = votes.has(id);
      vt.setAttribute('aria-pressed', String(on));
      const span = vt.querySelector('span');
      span.textContent = String(+span.textContent + (on ? 1 : -1));
      bounce(vt);
    }
  });
  more.addEventListener('click', () => { expanded = !expanded; render(); });

  fetch(SEED_URL).then((r) => (r.ok ? r.json() : [])).catch(() => []).then((data) => {
    const arr = Array.isArray(data) ? data : data.requests || [];
    seed = arr.filter((r) => r && r.name && parseHex(r.hex)).map((r) => ({ name: String(r.name), hex: parseHex(r.hex), count: +r.count || 0 }));
    render();
  });

  render();
  setHex(state.hex, { silent: true });
  return {
    el,
    setHex,
    setName(n, { silent: quiet = false } = {}) { nameIn.value = String(n || '').slice(0, 48); const was = silent; silent = was || quiet; paintName(); silent = was; },
    get hex() { return state.hex; },
    get name() { return name(); },
  };
}

// The old standalone "Request a color" section, kept so a page that still mounts it works.
// The live preview is the studio's 3D Grumpl now; this version shows the picker and "Try it on a Grumpl".
export function mountColors(el) {
  if (!el) return null;
  el.innerHTML = `<div class="cl-wrap"><header class="cl-head"><h2>Request a color</h2>
    <p>Pick a color, name it, put it on the list. We look at the list.</p></header><div class="cl-body"></div></div>`;
  el.classList.add('cl-on');
  return mountPicker(el.querySelector('.cl-body'), { tryButton: true });
}
function esc(s) { return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

export function xUrl(name, hex) {
  const text = name ? `I want a Grumpl in "${name}" ${hex} @${X_HANDLE} #grumplcolor` : `I want a Grumpl in ${hex} @${X_HANDLE} #grumplcolor`;
  return 'https://x.com/intent/post?text=' + encodeURIComponent(text);
}
