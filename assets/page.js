// Everything below the hero: the sticky logo, the exploding burger menu, every drop, the storybook,
// the make-your-own sections, the artists, the butt-hill footer, sound, and Lights out (Halloween).
import { DROPS } from './drops.js';
import './drops-site.js';
import { initSkins } from './skins.js';
import { sound } from './sound.js';

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const hex = (n) => '#' + n.toString(16).padStart(6, '0');
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const rnd = (seed) => { const x = Math.sin(seed * 999.13) * 43758.5453; return x - Math.floor(x); };
const img = (id) => (/\.(png|gif|webp)$/.test(id) ? `assets/img/${id}` : `assets/img/${id}.webp`);
const root = document.documentElement;

/* ======================= sticky logo ======================= */
// The 3D logo scrolls up with the hero. Just before it reaches the top, a flat copy takes its exact place,
// floats up to the top centre and shrinks to about 30% of its size, and stays there.
// In the hero the logo is the vector itself, laid over the 3D cloud (crisp at any size); the 3D finishes
// (tap the logo) swap in the inflated letters instead.
const hero = $('#Hero'), mark = $('#Mark');
const heroLogo = document.createElement('button');
heroLogo.id = 'HeroLogo'; heroLogo.type = 'button'; heroLogo.setAttribute('aria-label', 'Grumpl logo. Tap for a gummy or chrome finish.');
$('#stage').after(heroLogo);
let logoR = null, mark3D = true, logoMode = 'flat';
fetch('assets/logo.svg').then((r) => r.text()).then((t) => {
  t = t.replace(/<title>[^<]*<\/title>/, '');
  for (const [el, gid] of [[mark, 'candy'], [heroLogo, 'candy-h']]) {
    el.innerHTML = t;
    const svg = $('svg', el);
    svg.removeAttribute('width'); svg.removeAttribute('height');
    svg.setAttribute('aria-hidden', 'true');
    // candy corn for Lights out: one gradient per letter, yellow base, orange middle, white tip
    svg.insertAdjacentHTML('afterbegin', `<defs><linearGradient id="${gid}" x1="0" y1="1" x2="0" y2="0">
      <stop offset=".42" stop-color="#ffc21a"/><stop offset=".42" stop-color="#ff8a1c"/><stop offset=".74" stop-color="#ff8a1c"/><stop offset=".74" stop-color="#fff3dc"/></linearGradient></defs>`);
    // each letter and its drips puff together, like the brand book
    $$('path[id^="letter-"], path[id^="drop-"]', svg).forEach((p) => {
      const k = 'grumpl'.indexOf(p.id.split('-')[1]);
      p.style.setProperty('--i', k);
    });
  }
  stick();
});
heroLogo.addEventListener('click', () => window.__grumpl?.cycleLogo?.());
addEventListener('grumpl-logo-mode', (e) => { logoMode = e.detail.mode; heroLogo.classList.toggle('is3d', logoMode !== 'flat'); stick(); });
addEventListener('grumpl-puff', () => { heroLogo.classList.remove('puff'); void heroLogo.offsetWidth; heroLogo.classList.add('puff'); });
heroLogo.addEventListener('animationend', (e) => { if (e.animationName === 'letterpuff' && e.target.style.getPropertyValue('--i') === '5') heroLogo.classList.remove('puff'); });
addEventListener('grumpl-logo', (e) => {
  logoR = e.detail;
  Object.assign(heroLogo.style, { left: `${logoR.x}px`, top: `${logoR.y}px`, width: `${logoR.w}px` });
  heroLogo.classList.add('on');
  stick();
});
function show3D(v) { if (v !== mark3D) { mark3D = v; dispatchEvent(new CustomEvent('grumpl-logo-3d', { detail: { show: v } })); } }
function stick() {
  const top = parseFloat(getComputedStyle(root).getPropertyValue('--top-pad')) || 12;
  const scrolled = scrollY > innerHeight * 0.55;
  document.body.classList.toggle('scrolled', scrolled);
  if (!logoR || !mark.firstChild) { mark.classList.toggle('on', scrolled); return; }
  const heroTop = hero.getBoundingClientRect().top;
  const vy = logoR.y + heroTop;                              // the 3D logo's top edge on screen right now
  // Scott round 4: the logo docks later in the scroll (once the cloud hem has pinned) and 50% bigger than before
  const swapAt = top + logoR.h * 0.35;
  const finalW = clamp(logoR.w * 0.45, 138, 225);
  if (vy > swapAt) { mark.classList.remove('on', 'pinned'); heroLogo.classList.remove('gone'); undock3D(); show3D(true); return; }
  heroLogo.classList.add('gone');
  const p = clamp((swapAt - vy) / (logoR.h * 1.6), 0, 1);
  const e = p * p * (3 - 2 * p);
  const w = logoR.w + (finalW - logoR.w) * e;
  const cx = logoR.x + logoR.w / 2 + (innerWidth / 2 - logoR.x - logoR.w / 2) * e;
  const y = swapAt + (top - swapAt) * e;
  // Scott round 4: up top it is always the flat, animated brand-book logo, whatever finish the hero wears,
  // so the 3D logo stops rendering once it has scrolled away
  undock3D();
  mark.style.width = `${logoR.w}px`;
  mark.style.transform = `translate(${cx - logoR.w / 2}px, ${y}px) scale(${w / logoR.w})`;
  mark.classList.add('on');
  mark.classList.toggle('pinned', p >= 1);
  show3D(false);
}
// The 3D canvas covers the logo plus some room (logo3d.js PAD); docked, it moves out of the hero (which clips)
// to sit fixed on the page, scaled about the logo's top centre exactly like the flat #Mark.
const PAD3 = { x: 0.07, y: 0.14 };
let docked3D = null, dockPinned = false;   // a 3D logo left docked by an older build is put back
function undock3D() {
  const c = docked3D; if (!c) return;
  docked3D = null;
  const W = Math.round(logoR.w * (1 + PAD3.x * 2)), H = Math.round(logoR.h * (1 + PAD3.y * 2));
  c.classList.remove('docked', 'pinned');
  Object.assign(c.style, { left: `${logoR.x + logoR.w / 2 - W / 2}px`, top: `${logoR.y + logoR.h / 2 - H / 2}px`, transformOrigin: '', transform: '' });
  $('#stage').after(c);
  if (dockPinned) { dockPinned = false; dispatchEvent(new CustomEvent('grumpl-logo-dock', { detail: { scale: 1 } })); }
}
// the flat logo at the top keeps the hero's little letter puffs going when nobody is touching anything
let markInput = performance.now(), markHopAt = 0;
['pointermove', 'pointerdown', 'keydown', 'wheel', 'scroll', 'touchstart'].forEach((t) => addEventListener(t, () => { markInput = performance.now(); }, { passive: true }));
setInterval(() => {
  const now = performance.now();
  if (reduce || document.hidden || !mark.classList.contains('pinned') || document.body.classList.contains('menu-open')) return;
  if (now - markInput < 3500 || now < markHopAt) return;
  markHopAt = now + 4200;
  mark.classList.remove('hop'); void mark.offsetWidth; mark.classList.add('hop');
}, 500);
mark.addEventListener('animationend', (e) => { if (e.target.style.getPropertyValue('--i') === '5') mark.classList.remove('hop'); });
/* the header cloud (Scott round 4: no new element): the hero's cloud mass ends in a soft, rolling hem, and as the
   hero scrolls away that hem stays at the top to hold the burger, logo and buy button. It rides up with the hero's
   bottom edge and pins there. Drawn at the window's width; deepest in the middle, where the logo hangs. */
const topCloud = document.createElement('div'); topCloud.id = 'TopCloud'; topCloud.setAttribute('aria-hidden', 'true');
$('#Top').prepend(topCloud);
// the header's cloud is rendered in 3D (cloud3d.js), once per width, after the hero has loaded
let cloudW = 0, cloudT = 0;
function drawCloud() {
  const W = innerWidth; if (W === cloudW) return; cloudW = W;
  const top = parseFloat(getComputedStyle(root).getPropertyValue('--top-pad')) || 12;
  clearTimeout(cloudT);
  cloudT = setTimeout(() => import('./cloud3d.js').then((m) => m.drawTopCloud(topCloud, W, top)).catch(() => {}), 120);
}
addEventListener('grumpl-hero-ready', drawCloud, { once: true });
setTimeout(drawCloud, 6000);
addEventListener('resize', () => { if (cloudW) drawCloud(); });
function hem() {
  const b = hero.getBoundingClientRect().bottom;
  topCloud.style.transform = `translateY(${Math.max(0, Math.round(b) - 2)}px)`;
  topCloud.classList.toggle('pinned', b <= 2);
}
hem();
addEventListener('scroll', hem, { passive: true });
addEventListener('resize', hem);
addEventListener('scroll', stick, { passive: true });
addEventListener('resize', stick);
mark.addEventListener('click', (e) => { e.preventDefault(); scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' }); });

/* ======================= the burger ======================= */
// A real burger. Tap it and it comes apart like an exploded diagram: every layer is a way into the page,
// The burger drops straight down the left side under the button, one layer per row, with its word beside it;
// the right side stays open for a mega menu later (Scott's crit 12-13). The drop cards are out of the menu for now.
const LAYERS = [
  { k: 'bun-top', label: 'The new drop', part: 'Top bun', go: '#Hero',
    svg: '<path d="M8 56c0-26 26-44 62-44s62 18 62 44z" fill="#f2b36a" stroke="#0b0a0c" stroke-width="5" stroke-linejoin="round"/><path d="M22 46c6-16 24-26 48-26" fill="none" stroke="#fff4dc" stroke-width="5" stroke-linecap="round" opacity=".7"/><g fill="#fff4dc" stroke="#0b0a0c" stroke-width="2"><ellipse cx="50" cy="30" rx="4" ry="2.6" transform="rotate(-20 50 30)"/><ellipse cx="72" cy="24" rx="4" ry="2.6"/><ellipse cx="94" cy="31" rx="4" ry="2.6" transform="rotate(20 94 31)"/><ellipse cx="62" cy="42" rx="4" ry="2.6" transform="rotate(10 62 42)"/><ellipse cx="86" cy="44" rx="4" ry="2.6" transform="rotate(-12 86 44)"/><ellipse cx="38" cy="45" rx="4" ry="2.6" transform="rotate(-30 38 45)"/></g>' },
  { k: 'lettuce', label: 'Every drop', part: 'Lettuce', go: '#Drops',
    svg: '<path d="M6 40c8-10 14 4 22-4s14 6 22-2 14 6 22-2 14 6 22-2 14 6 22-2 12 4 18 0c-2 10-12 12-20 10-8 6-16-2-24 2s-16-4-24 2-16-4-24 2-16-4-24 0C8 44 4 46 6 40z" fill="#7bc96f" stroke="#0b0a0c" stroke-width="5" stroke-linejoin="round"/>' },
  // Scott 2026-10-16: the pickle takes the tomato's row (Lights out is gone, so the pickle needed a job)
  { k: 'pickle', label: 'The story', part: 'Pickle', go: '#Story',
    svg: '<ellipse cx="70" cy="38" rx="26" ry="16" fill="#9cc34a" stroke="#0b0a0c" stroke-width="5"/><ellipse cx="70" cy="38" rx="15" ry="8" fill="#c8e27a"/><g fill="#6f9a2c"><circle cx="64" cy="35" r="2"/><circle cx="76" cy="41" r="2"/><circle cx="72" cy="32" r="2"/></g>' },
  { k: 'cheese', label: 'Make your own', part: 'Cheese', go: '#Make',
    svg: '<path d="M10 30h120l-10 8-6 16-10-14-14 6-8-6-16 18-8-18-14 8-10-8-10 12-8-12z" fill="#ffd23f" stroke="#0b0a0c" stroke-width="5" stroke-linejoin="round"/>' },
  { k: 'patty', label: 'The artists', part: 'Patty', go: '#Artists',
    svg: '<rect x="8" y="24" width="124" height="30" rx="15" fill="#8a4b3a" stroke="#0b0a0c" stroke-width="5"/><path d="M24 34h14M48 42h18M78 32h12M100 42h16" stroke="#5e3026" stroke-width="4" stroke-linecap="round"/>' },
  { k: 'bun-bottom', label: 'Brand book', part: 'Bottom bun', go: 'brand/', ext: true,
    svg: '<path d="M10 26h120c0 16-10 26-24 26H34c-14 0-24-10-24-26z" fill="#f2b36a" stroke="#0b0a0c" stroke-width="5" stroke-linejoin="round"/>' },
];
const menu = $('#Menu'), burger = $('#Burger');
menu.innerHTML = `
  <div class="menu-bg"></div>
  <button class="menu-x" type="button" aria-label="Close the menu"><svg viewBox="0 0 20 20" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" d="M5 5l10 10M15 5 5 15"/></svg></button>
  <p class="menu-fig">Fig. 1 · One Grumpl burger, exploded</p>
  <nav class="stack" aria-label="Site">
    ${LAYERS.map((l, i) => l.deco ? `<span class="layer ${l.k} deco${l.small ? ' small' : ''}" aria-hidden="true" style="--i:${i}">
      <svg class="part" viewBox="0 0 140 70">${l.svg}</svg>
    </span>` : `<a class="layer ${l.k}${l.small ? ' small' : ''}" href="${l.go || '#'}" ${l.ext ? 'target="_blank" rel="noopener"' : ''} style="--i:${i}">
      <svg class="part" viewBox="0 0 140 70" aria-hidden="true">${l.svg}</svg>
      <span class="lead" aria-hidden="true"></span>
      <span class="label"><small>${String(i + 1).padStart(2, '0')} · ${l.part}</small><b>${l.label}</b></span>
    </a>`).join('')}
  </nav>
  <button class="menu-sound sound-btn" type="button" data-sound><span></span></button>`;
let menuOpen = false, flyOff = 0;
function flyFrom(els) {
  // every piece starts inside the little burger and flies to its place in the diagram
  // (all the measuring first, then all the writing: one layout, not one per piece)
  const b = burger.getBoundingClientRect(), rs = els.map((el) => el.getBoundingClientRect());
  els.forEach((el, i) => {
    const r = rs[i], dx = b.left + b.width / 2 - (r.left + r.width / 2), dy = b.top + b.height / 2 - (r.top + r.height / 2);
    el.style.setProperty('--fx', `${dx}px`); el.style.setProperty('--fy', `${dy}px`);
    el.style.setProperty('--fs', (b.width / Math.max(40, r.width)).toFixed(3));
  });
}
// The burger is gummy and 3D (assets/gummy-burger.js): the same seven candies are the header button
// (stacked, small) and the menu (pulled apart, one per row), on one canvas, so the thing you tap is the thing
// that opens. Loaded once the page is up; until then, and wherever WebGL isn't there, the drawings stay.
let gummy = null;
function gummyBurger() {
  if (gummy) return;
  if (!window.WebGLRenderingContext) { document.body.classList.add('burger2d'); return; }
  gummy = import('./gummy-burger.js')
    .then((m) => m.createGummyBurger({ button: burger, menu, slots: $$('.layer .part', menu), rows: $$('.layer', menu), keys: LAYERS.map((l) => l.k) }))
    .then((g) => {
      document.body.classList.add('burger3d'); menu.classList.add('g3d');
      if (menuOpen) g.open();
      return g;
    })
    .catch((e) => { console.warn('gummy burger', e); document.body.classList.add('burger2d'); return null; });
}
// Start straight away, so the 3D burger is in the header when the hero's curtain lifts. The flat drawing stays
// hidden meanwhile (no flash of the old icon) and only shows if the 3D one fails or is very late.
gummyBurger();
setTimeout(() => { if (!document.body.classList.contains('burger3d')) document.body.classList.add('burger2d'); }, 10000);
function openMenu() {
  if (menuOpen) return;
  menuOpen = true;
  menu.hidden = false;
  // the hero (words, tools, buy button, 3D logo) flies off while the menu is open and back on after it
  // (page.css "menu-open"); menu-fly carries the transitions and stays until the last one is home
  clearTimeout(flyOff);
  document.body.classList.add('menu-fly', 'menu-open');
  burger.setAttribute('aria-expanded', 'true');
  if (!menu.classList.contains('g3d')) flyFrom($$('.part', menu));
  menu.classList.remove('open'); void menu.offsetWidth;
  menu.classList.add('open');
  gummy?.then((g) => g?.open());
  navigator.vibrate?.(10); sound.boop();
  setTimeout(() => $('.layer', menu)?.focus({ preventScroll: true }), 400);
}
function closeMenu(then) {
  if (!menuOpen) return;
  menuOpen = false;
  if (!menu.classList.contains('g3d')) flyFrom($$('.part', menu));
  gummy?.then((g) => g?.close());
  menu.classList.remove('open');
  menu.classList.add('closing');
  burger.setAttribute('aria-expanded', 'false');
  document.body.classList.remove('menu-open');
  flyOff = setTimeout(() => document.body.classList.remove('menu-fly'), 1400);
  setTimeout(() => { menu.hidden = true; menu.classList.remove('closing'); then?.(); }, reduce ? 10 : 640);
  burger.focus({ preventScroll: true });
}
burger.addEventListener('click', () => (menuOpen ? closeMenu() : openMenu()));
$('.menu-x', menu).addEventListener('click', () => closeMenu());
$('.menu-bg', menu).addEventListener('click', () => closeMenu());
addEventListener('keydown', (e) => { if (e.key === 'Escape' && menuOpen) closeMenu(); });
menu.addEventListener('click', (e) => {
  const a = e.target.closest('a'); if (!a) return;
  if (a.dataset.toggle === 'night') { e.preventDefault(); closeMenu(() => setNight(!night.on, a)); return; }
  if (a.target === '_blank') return;
  const href = a.getAttribute('href');
  if (!href?.startsWith('#')) return;
  e.preventDefault();
  closeMenu(() => goTo(href));
});
function goTo(hash) {
  if (hash.startsWith('#drop-')) { dispatchEvent(new CustomEvent('grumpl-drop', { detail: { n: hash.slice(6) } })); hash = '#Drops'; }
  const el = $(hash); if (!el) return;
  if (hash === '#Hero') scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
  else el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
  history.replaceState(null, '', hash === '#Hero' ? location.pathname + location.search : hash);
}

/* ======================= the storybook ======================= */
// A first draft of the lore for Jason to rewrite. Scott (2026-10-16): pairs of cards, one strong-color card with
// the heading and one line, one picture card. Each pair flies in from both sides with the Grumpl Artists motion
// and piles on top of the last one as you scroll.
const PAGES = [
  { art: 'grumpl-stand.png', line: true, bg: '#ffd23f', h: 'This is a Grumpl.',
    p: 'He frowns at birds, weather and most people. Stay still long enough and he will sit on your foot anyway.' },
  { art: 'story-eat', bg: '#56c2dc', h: 'What they eat',
    p: 'Burgers, mostly. Somebody else’s burger, ideally, the kind that’s been in the bag a while.' },
  { art: 'art-grumpls-gen.webp', fill: true, bg: '#ff8fc8', h: 'How to catch one',
    p: 'You don’t, really. Stack three burgers under a box of sticks and the Grumpl eats the top two and leaves the bottom bun. As far as we can tell, that’s a review.' },
  { art: 'art-grumpls-one.webp', fill: true, bg: '#ff8a5c', h: 'Sometimes one stays',
    p: 'Nobody has worked out why. Our best guess is the third burger.' },
  { art: 'grumpl-skip.gif', line: true, bg: '#ffd23f', h: 'Bonding rituals',
    p: 'He sits on your shoe. He hands you something damp. He bumps his belly into your shin twice, which means you’re family now and he’ll be eating your food.' },
  { art: 'sock', bg: '#56c2dc', h: 'The sock sweater',
    p: 'One winter an artist knitted a Grumpl a sweater out of one of her own socks. He wore it for eleven days and wouldn’t take it off for baths, which he also doesn’t take.' },
  { art: 'story-butt', bg: '#ff8fc8', h: 'Where they come from',
    p: 'Somewhere down the hill, near a burger place that never closes. They come back smelling like fries and go straight to sleep.' },
];
const SOCK = `<svg viewBox="0 0 240 240" class="sock" aria-hidden="true">
  <defs><pattern id="knit" width="16" height="12" patternUnits="userSpaceOnUse"><path d="M0 0l8 8 8-8" fill="none" stroke="#0b0a0c" stroke-opacity=".18" stroke-width="2"/></pattern></defs>
  <path d="M70 40c-14 8-12 22-8 30-18 12-30 40-26 76 4 40 34 64 84 64s80-24 84-64c4-36-8-64-26-76 4-8 6-22-8-30-12-6-22 2-26 8-10-4-26-4-38 0-6-6-16-14-36-8z" fill="#fff8ec" stroke="#0b0a0c" stroke-width="5" stroke-linejoin="round"/>
  <path d="M44 120c10-10 30-14 76-14s66 4 76 14l-4 52c-12 14-36 22-72 22s-60-8-72-22z" fill="#ff8f6b" stroke="#0b0a0c" stroke-width="5" stroke-linejoin="round"/>
  <path d="M44 120c10-10 30-14 76-14s66 4 76 14l-4 52c-12 14-36 22-72 22s-60-8-72-22z" fill="url(#knit)"/>
  <path d="M46 136c22 6 48 8 74 8s52-2 74-8M48 156c22 6 46 8 72 8s50-2 72-8" fill="none" stroke="#ffd23f" stroke-width="9"/>
  <path d="M42 118c10-12 34-18 78-18s68 6 78 18" fill="none" stroke="#0b0a0c" stroke-width="5"/>
  <path d="M40 114c12-12 36-18 80-18s68 6 80 18l-2 10c-10-10-34-16-78-16s-68 6-78 16z" fill="#ff8f6b" stroke="#0b0a0c" stroke-width="4"/>
  <circle cx="98" cy="84" r="7" fill="#111"/><circle cx="142" cy="84" r="7" fill="#111"/><circle cx="100" cy="82" r="2" fill="#fff"/><circle cx="144" cy="82" r="2" fill="#fff"/>
  <path d="M108 100c8 4 16 4 24 0" fill="none" stroke="#0b0a0c" stroke-width="4" stroke-linecap="round"/>
  <path d="M182 196c18-2 30 8 28 22-2 10-14 12-24 8" fill="#ff8f6b" stroke="#0b0a0c" stroke-width="4"/>
</svg>`;
$('#Book').innerHTML = PAGES.map((pg, i) => {
  const r = (k) => (rnd(i * 2 + k + 11) * 3 - 1.5).toFixed(2);
  const words = `<div class="card words" style="--r:${r(0)}deg;--pg:${pg.bg}">
      <p class="pno">${i + 1}</p>
      <h3>${pg.h}</h3>
      <p>${pg.p}</p>
    </div>`;
  const pic = `<div class="card pic${pg.line ? ' line' : ''}${pg.fill ? ' fill' : ''}" style="--r:${r(1)}deg">${pg.art === 'sock' ? SOCK : `<img src="${img(pg.art)}" alt="" loading="lazy">`}</div>`;
  // the color card and the picture swap sides every pair
  return `
  <section class="spread${i % 2 ? ' flip' : ''}" style="--i:${i}">${i % 2 ? pic + words : words + pic}</section>`;
}).join('') + '<p class="book-end">That’s what we know so far. We’ll write more down when they let us.</p>';
// Same as the Grumpl Artists cards: a pair drops in as it comes on screen and back out as it leaves
if (!reduce && 'IntersectionObserver' in window) {
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) e.target.classList.toggle('observed', e.isIntersecting);
  }, { rootMargin: '0px 0px -12% 0px' });
  $('#Book').querySelectorAll('.spread').forEach((s) => io.observe(s));
  $('#Book').classList.add('anim');
}

/* ======================= sections from other files ======================= */
// Each one is its own module and mounts itself when it gets near the screen, so the hero loads first.
function lazyMount(sel, load) {
  const el = $(sel); if (!el) return;
  let done = false;
  const io = new IntersectionObserver(([e]) => {
    if (!e.isIntersecting || done) return;
    done = true; io.disconnect();
    load(el).catch((err) => { console.error(sel, err); el.classList.add('failed'); });
  }, { rootMargin: '600px 0px' });
  io.observe(el);
  // or straight away, when the page warms it ahead of time
  return () => { if (done) return Promise.resolve(); done = true; io.disconnect(); return load(el).catch((err) => { console.error(sel, err); el.classList.add('failed'); }); };
}
const FL = () => import('./drop.js').then((m) => m.FLAVORS);
const warmStudio = lazyMount('#Studio', async (el) => (await import('./studio.js')).mountStudio(el, { FLAVORS: await FL() }));
lazyMount('#Artists', async (el) => (await import('./artists.js')).mountArtists(el));
const warmButt = lazyMount('#Butt', async (el) => (await import('./butt.js')).mountButt(el, { FLAVORS: await FL() }));
// Once the hero is up, the 3D further down builds itself in the quiet moments, one piece at a time,
// so scrolling to it (or opening a popup) never waits on a download or a shader compile
const idle = (ms) => new Promise((r) => setTimeout(() => (window.requestIdleCallback ? requestIdleCallback(r, { timeout: 2000 }) : r()), ms));
addEventListener('grumpl-hero-ready', async () => {
  for (const warm of [() => dispatchEvent(new Event('grumpl-warm-drops')), async () => (await warmStudio?.())?.ready?.(), warmButt]) {
    await idle(1200);
    await warm?.();
  }
}, { once: true });

/* ======================= sound ======================= */
const paintSound = (on) => $$('[data-sound]').forEach((b) => {
  b.setAttribute('aria-pressed', String(on));
  b.querySelector('span').textContent = on ? 'Sound on' : 'Sound off';
  b.classList.toggle('on', on);
});
sound.subscribe(paintSound);
document.addEventListener('click', (e) => { if (e.target.closest('[data-sound]')) sound.toggle(); });

/* ======================= lights out ======================= */
// Halloween: on Oct 31 the page opens with the lights off. Every other day it's an easter egg:
// the pickle in the burger, typing "boo", or ?spooky=1.
const night = { on: false };
const eyes = makeEyes($('#Eyes'));
function setNight(on, from) {
  if (on === night.on) return;
  const apply = () => {
    night.on = on;
    document.body.classList.toggle('spooky', on);
    $('meta[name=theme-color]')?.setAttribute('content', on ? '#0c0a0f' : getComputedStyle(root).getPropertyValue('--wash').trim() || '#eef3fb');
    dispatchEvent(new CustomEvent('grumpl-night', { detail: { on } }));
    on ? eyes.start() : eyes.stop();
    $$('[data-toggle="night"] b').forEach((b) => (b.textContent = on ? 'Lights on' : 'Lights out'));
  };
  try { sessionStorage.setItem('grumpl-spooky', on ? '1' : '0'); } catch {}
  const r = (from || burger).getBoundingClientRect();
  root.style.setProperty('--vx', `${r.left + r.width / 2}px`); root.style.setProperty('--vy', `${r.top + r.height / 2}px`);
  if (document.startViewTransition && !reduce) {
    root.classList.add('vt');
    document.startViewTransition(apply).finished.finally(() => root.classList.remove('vt'));
  } else apply();
}
{
  const q = new URLSearchParams(location.search).get('spooky');
  let saved = null; try { saved = sessionStorage.getItem('grumpl-spooky'); } catch {}
  const d = new Date();
  const halloween = d.getMonth() === 9 && d.getDate() === 31;
  const on = q != null ? q !== '0' : saved != null ? saved === '1' : halloween;
  if (on) { night.on = true; document.body.classList.add('spooky'); eyes.start(); addEventListener('load', () => dispatchEvent(new CustomEvent('grumpl-night', { detail: { on: true } }))); }
  if (halloween) document.body.classList.add('halloween');
}
let typed = '';
addEventListener('keydown', (e) => {
  if (e.target.closest?.('input, textarea, [contenteditable]') || e.key.length !== 1) return;
  typed = (typed + e.key.toLowerCase()).slice(-3);
  if (typed === 'boo') { typed = ''; setNight(!night.on); }
});

// Eyes in the dark behind the clouds. They stay where they open (Scott asked for that), blink, look at the
// lamp, and squeeze shut when it lands on them.
function makeEyes(cv) {
  const ctx = cv.getContext('2d');
  const HUES = ['#ffb347', '#c6ff5a', '#ff7a3d', '#b98cff', '#ffe066'];
  const MAX = matchMedia('(max-width: 560px)').matches ? 16 : 30;
  let list = [], on = false, raf = 0, w = 0, h = 0, dpr = 1, last = 0, nextSpawn = 0, heroOn = true;
  const sprites = {};
  function sprite(c) {
    if (sprites[c]) return sprites[c];
    const s = document.createElement('canvas'); s.width = s.height = 64;
    const g = s.getContext('2d');
    const glow = g.createRadialGradient(32, 32, 2, 32, 32, 30);
    glow.addColorStop(0, c); glow.addColorStop(0.35, c + 'cc'); glow.addColorStop(1, c + '00');
    g.fillStyle = glow; g.beginPath(); g.ellipse(32, 32, 30, 22, 0, 0, 7); g.fill();
    g.fillStyle = '#fff8e0'; g.beginPath(); g.ellipse(32, 32, 12, 9, 0, 0, 7); g.fill();
    return (sprites[c] = s);
  }
  function size() { const r = cv.getBoundingClientRect(); dpr = Math.min(devicePixelRatio, 2); w = r.width; h = r.height; cv.width = w * dpr; cv.height = h * dpr; }
  function spawn() {
    if (list.length >= MAX) return;
    // in the sky above the cloud line, not on top of each other
    for (let tries = 0; tries < 12; tries++) {
      const x = 20 + Math.random() * (w - 40), y = 40 + Math.random() * h * 0.55;
      if (list.every((e) => Math.hypot(e.x - x, e.y - y) > 60)) {
        list.push({ x, y, s: 4 + Math.random() * 6, c: HUES[(Math.random() * HUES.length) | 0], open: 0, shut: 0,
          blinkAt: performance.now() + 800 + Math.random() * 4000, blink: 0, gap: 1.9 + Math.random() * 0.8, tilt: (Math.random() - 0.5) * 0.4 });
        return;
      }
    }
  }
  new IntersectionObserver(([e]) => { heroOn = e.isIntersecting; }).observe(cv.parentElement);
  function frame(now) {
    raf = requestAnimationFrame(frame);
    if (!heroOn) return;
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (now > nextSpawn) { spawn(); nextSpawn = now + 1200 + Math.random() * 2200; }
    const r = cv.getBoundingClientRect();
    const L = window.__grumplLamp;
    const light = L && L.r ? { x: L.x - r.left, y: L.y - r.top, r: L.r } : null;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    for (const e of list) {
      let lit = false, px = 0, py = 0;
      if (light) {
        const dx = light.x - e.x, dy = light.y - e.y, d = Math.hypot(dx, dy) || 1;
        lit = d < light.r;
        px = dx / d * e.s * 0.35; py = dy / d * e.s * 0.25;
      }
      e.shut += ((lit ? 1 : 0) - e.shut) * Math.min(1, dt * 10);
      e.open = Math.min(1, e.open + dt * 0.7);
      if (now > e.blinkAt) { e.blink = 1; e.blinkAt = now + (Math.random() < 0.25 ? 260 : 1600 + Math.random() * 5200); }
      e.blink = Math.max(0, e.blink - dt * 7);
      const lid = Math.max(0, e.open * (1 - e.shut) * (1 - Math.sin(Math.min(1, e.blink) * Math.PI)));
      if (lid < 0.03) continue;
      const sp = sprite(e.c), ew = e.s * 2.6, eh = e.s * 1.9 * lid;
      ctx.save(); ctx.translate(e.x, e.y); ctx.rotate(e.tilt);
      ctx.globalAlpha = Math.min(1, e.open * 1.4) * 0.92;
      for (const side of [-1, 1]) {
        const cx = side * e.s * e.gap;
        ctx.drawImage(sp, cx - ew, -eh, ew * 2, eh * 2);
        ctx.fillStyle = '#120a06';
        ctx.beginPath(); ctx.ellipse(cx + px, py, e.s * 0.22, e.s * 0.72 * lid, 0, 0, 7); ctx.fill();
      }
      ctx.restore();
    }
  }
  addEventListener('resize', () => on && size());
  return {
    start() { if (on) return; on = true; size(); last = performance.now(); nextSpawn = 0; if (!list.length) for (let i = 0; i < 5; i++) spawn(); raf = requestAnimationFrame(frame); },
    stop() { on = false; cancelAnimationFrame(raf); ctx.clearRect(0, 0, cv.width, cv.height); },
  };
}

// deep links (#Drops, #drop-01...) land after the layout settles
if (location.hash && location.hash.length > 1) setTimeout(() => { try { $(location.hash)?.scrollIntoView(); } catch {} }, 300);

// every clickable thing wears the selected Grumpl's finish in 3D (skins.js)
if (!new URLSearchParams(location.search).has('noskin')) initSkins();

// ---------- the entrance ----------
// The Grumpls land on their clouds (app.js, 'grumpl-arrive'), then the logo, name and buttons flow up in turn:
// on the first touch, key or scroll, or after a few seconds of nobody doing anything.
(function runIntro() {
  if (!root.classList.contains('intro')) return;
  const start = () => {
    dispatchEvent(new Event('grumpl-arrive'));
    let done = false;
    const reveal = () => {
      if (done) return; done = true;
      ['pointerdown', 'keydown', 'wheel', 'scroll', 'touchstart'].forEach((t) => removeEventListener(t, reveal, true));
      root.classList.add('show');
      setTimeout(() => window.__grumpl?.puffRow?.(), 250);
      try { localStorage.setItem('grumpl-intro', String(Date.now())); } catch {}
      setTimeout(() => root.classList.remove('intro', 'show'), 2600);
    };
    ['pointerdown', 'keydown', 'wheel', 'scroll', 'touchstart'].forEach((t) => addEventListener(t, reveal, { capture: true, passive: true }));
    setTimeout(reveal, 3200);
  };
  if (document.body.classList.contains('ready')) start();
  else new MutationObserver((_, mo) => { if (document.body.classList.contains('ready')) { mo.disconnect(); start(); } })
    .observe(document.body, { attributes: true, attributeFilter: ['class'] });
})();
