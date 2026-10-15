// The page around the stage: page tint, the buy button, the floating name, the dot shelf, the details sheet.
import { SECONDARY_URL } from './drop.js';

const $ = (s, el = document) => el.querySelector(s);
const hex = (n) => '#' + n.toString(16).padStart(6, '0');
function hsl(n) {
  const r = (n >> 16 & 255) / 255, g = (n >> 8 & 255) / 255, b = (n & 255) / 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn;
  let h = 0, s = 0;
  if (d) {
    s = d / (1 - Math.abs(2 * l - 1));
    h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
    h *= 60; if (h < 0) h += 360;
  }
  return [h, s, l];
}
const lum = (n) => { const c = [n >> 16 & 255, n >> 8 & 255, n & 255].map((v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };

const ICON = {
  bell: '<svg viewBox="0 0 20 20" aria-hidden="true"><path fill="currentColor" d="M10 2a5 5 0 0 0-5 5v3.6L3.3 13.8c-.3.6.1 1.2.7 1.2h12c.6 0 1-.6.7-1.2L15 10.6V7a5 5 0 0 0-5-5zm-2 14a2 2 0 0 0 4 0z"/></svg>',
  bag: '<svg viewBox="0 0 20 20" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round" d="M4 7h12l-1 10H5zM7 7V6a3 3 0 0 1 6 0v1"/></svg>',
  out: '<svg viewBox="0 0 20 20" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" d="M7 4h9v9M16 4 5 15"/></svg>',
  x: '<svg viewBox="0 0 20 20" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" d="M5 5l10 10M15 5 5 15"/></svg>',
};

export function initUI({ DROP, FLAVORS, focus, step, jump }) {
  const root = document.documentElement;
  const cta = $('#Cta'), info = $('#Info'), dock = $('#Dock'), sheet = $('#Sheet');
  let cur = null, played = false;

  // dot shelf: a second way to move along the drop
  $('.ds', dock).innerHTML = FLAVORS.map((f, i) => `<button type="button" data-i="${i}" aria-label="${f.name}"
    style="--base:${hex(f.base)};--edge:${hex(f.edge)};--belly:${hex(f.belly)}"></button>`).join('');
  dock.addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.i != null) focus(+b.dataset.i);
    if (b.id === 'Jump') { jump(); b.classList.remove('hop'); void b.offsetWidth; b.classList.add('hop'); }
  });
  $('#Prev').addEventListener('click', () => step(-1));
  $('#Next').addEventListener('click', () => step(1));

  // the one call to action, always about the Grumpl in front
  function paintCta(f) {
    const st = f.status || DROP.status;
    const dark = lum(f.base) > 0.33;
    cta.style.setProperty('--c', hex(f.base));
    cta.style.setProperty('--c-ink', dark ? '#1b1620' : '#ffffff');
    cta.dataset.status = st;
    cta.classList.remove('open');
    const btn = $('.go', cta);
    if (st === 'live') { btn.innerHTML = `${ICON.bag}<span>Buy now</span>`; btn.dataset.href = f.url || ''; }
    else if (st === 'soldout') { btn.innerHTML = `<span>Buy on secondary</span>${ICON.out}`; btn.dataset.href = f.url || SECONDARY_URL; }
    else { btn.innerHTML = `${ICON.bell}<span>Remind me</span>`; btn.dataset.href = ''; }
    $('.done', cta).hidden = true; $('form', cta).hidden = false;
    btn.classList.remove('bump'); void btn.offsetWidth; btn.classList.add('bump');
  }
  $('.go', cta).addEventListener('click', (e) => {
    const href = e.currentTarget.dataset.href;
    if (href) { open(href, '_blank', 'noopener'); return; }
    cta.classList.add('open');
    setTimeout(() => $('input', cta).focus(), 250);
  });
  $('.close', cta).addEventListener('click', () => cta.classList.remove('open'));
  $('form', cta).addEventListener('submit', (e) => {
    e.preventDefault();
    const email = $('input', cta).value.trim();
    if (!/^\S+@\S+\.\S+$/.test(email)) { $('input', cta).focus(); return; }
    // no backend yet: kept on this device until the drop list exists
    try { const k = 'grumpl-remind'; const l = JSON.parse(localStorage.getItem(k) || '[]'); l.push({ email, flavor: cur.id, at: Date.now() }); localStorage.setItem(k, JSON.stringify(l)); } catch {}
    $('form', cta).hidden = true; $('.done', cta).hidden = false;
    $('.done', cta).textContent = `Got it. We'll tell you when ${cur.name} drops.`;
    setTimeout(() => cta.classList.remove('open'), 2600);
  });

  function focusUI(f, i) {
    cur = f;
    // page wash from the secondary color: same hue, most of the saturation gone, nearly white
    const [h, s] = hsl(f.edge);
    root.style.setProperty('--wash', `hsl(${h.toFixed(0)} ${Math.min(70, s * 100 * 0.55).toFixed(0)}% 93%)`);
    root.style.setProperty('--wash-deep', `hsl(${h.toFixed(0)} ${Math.min(60, s * 100 * 0.45).toFixed(0)}% 86%)`);
    root.style.setProperty('--base', hex(f.base));
    $('meta[name=theme-color]')?.setAttribute('content', `hsl(${h.toFixed(0)} ${Math.min(70, s * 55).toFixed(0)}% 93%)`);
    dock.querySelectorAll('[data-i]').forEach((b) => b.setAttribute('aria-pressed', String(+b.dataset.i === i)));
    $('.lbl b', dock).textContent = f.name;
    info.classList.remove('in'); void info.offsetWidth;
    $('h1', info).textContent = f.name;
    $('.drop', info).textContent = `Drop ${DROP.n} · ${DROP.name}`;
    $('.ed', info).textContent = `${f.size} · edition of ${f.edition}`;
    info.classList.add('in');
    paintCta(f);
    if (!sheet.hidden) fillSheet();
  }

  // more information: everything the drop page knows about this flavor, plus its photos
  function fillSheet() {
    const f = cur;
    const st = f.status || DROP.status;
    $('.body', sheet).innerHTML = `
      <p class="eyebrow">Drop ${DROP.n} · ${DROP.name}</p>
      <h2>${f.name}</h2>
      <p class="desc">${f.desc}</p>
      <dl>
        <div><dt>Finish</dt><dd>${f.finish}</dd></div>
        <div><dt>Size</dt><dd>${f.size}</dd></div>
        <div><dt>Edition</dt><dd>${f.edition}</dd></div>
        <div><dt>Weight</dt><dd>${f.weight}</dd></div>
        <div><dt>Status</dt><dd>${st === 'upcoming' ? 'Not dropped yet' : st === 'live' ? 'On sale now' : 'Sold out, on secondary'}</dd></div>
      </dl>
      ${f.photos.length ? `<div class="photos">${f.photos.map((p) => `<img src="assets/img/${p}.webp" alt="${f.name}, photo" loading="lazy">`).join('')}</div>`
        : '<p class="nophoto">No photos of this one yet. The render is all there is.</p>'}
      <p class="fine">${DROP.blurb}</p>`;
  }
  $('.more', info).addEventListener('click', () => { fillSheet(); sheet.hidden = false; requestAnimationFrame(() => sheet.classList.add('on')); });
  const closeSheet = () => { sheet.classList.remove('on'); setTimeout(() => (sheet.hidden = true), 320); };
  $('.x', sheet).addEventListener('click', closeSheet);
  sheet.addEventListener('click', (e) => { if (e.target === sheet) closeSheet(); });
  addEventListener('keydown', (e) => { if (e.key === 'Escape') { closeSheet(); cta.classList.remove('open'); } });

  return {
    focus: focusUI,
    played() { if (!played) { played = true; document.body.classList.add('played'); } },
    layout() {},
  };
}
