// The artists section: the 2022 Grumpl artists page, folded into the site.
// mountArtists(el) fills the given <section id="Artists">. The bio overlays mount on body so they can cover the page.
import { GEN, ONE } from '../artists/data.js';

const DIR = new URL('../artists/', import.meta.url).href;
const $ = (s, el = document) => el.querySelector(s);

const ICON = {
  site: '<svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true"><path fill="#FFFFFF" d="M15,15H2V6h2.595c0,0,0.689-0.896,2.17-2H1C0.447,4,0,4.449,0,5v11c0,0.553,0.447,1,1,1h15  c0.553,0,1-0.447,1-1v-3.746l-2,1.645V15z M13.361,8.05v3.551L20,6.4l-6.639-4.999v3.131C5.3,4.532,5.3,12.5,5.3,12.5  C7.582,8.752,8.986,8.05,13.361,8.05z"/></svg>',
  x: '<svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path fill="#FFFFFF" d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>',
  more: '<svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true"><path fill="#000000" d="M10.001,7.8C8.786,7.8,7.8,8.785,7.8,10s0.986,2.2,2.201,2.2S12.2,11.215,12.2,10S11.216,7.8,10.001,7.8z   M3.001,7.8C1.786,7.8,0.8,8.785,0.8,10s0.986,2.2,2.201,2.2S5.2,11.214,5.2,10S4.216,7.8,3.001,7.8z M17.001,7.8  C15.786,7.8,14.8,8.785,14.8,10s0.986,2.2,2.201,2.2S19.2,11.215,19.2,10S18.216,7.8,17.001,7.8z"/></svg>',
};

const ext = (href, label, icon) => `<a href="${href}" target="_blank" rel="noopener" class="icon" aria-label="${label}">${icon}</a>`;
const links = (a) => (a.site ? ext(a.site, `${a.name}'s website`, ICON.site) : '') + ext(a.x, `${a.name} on X`, ICON.x);

const card = (a) => `
  <div class="artist card">
    <h3 class="artist--name">${a.name}</h3>
    <a class="artist--handle" href="${a.x}" target="_blank" rel="noopener">${a.handle}</a>
    <div class="artist--actions">
      ${links(a)}
      ${a.bio ? `<button class="trigger" type="button" data-open="${a.id}" aria-label="About ${a.name}">${ICON.more}</button>` : ''}
    </div>
    <img loading="lazy" src="${DIR}${a.art}" alt="Grumpl by ${a.name}">
    <img loading="lazy" class="artist--rep" src="${DIR}${a.rep}" alt="">
  </div>`;

const overlay = (a) => `
  <div class="overlay" data-id="${a.id}" role="dialog" aria-label="${a.title || a.name}">
    <div class="contain">
      <div class="art card"><img loading="lazy" src="${DIR}${a.photo || a.rep}" alt="Work by ${a.name}"></div>
      <div class="info card">
        <h3 class="artist--name">${a.title || a.name}</h3>
        ${a.bio}
        <div class="artist--actions">${links(a)}</div>
      </div>
    </div>
  </div>`;

const grid = (id, title, list, tail = '') => `
  <section id="${id}">
    <div class="grid">
      <div class="intro card"><h2>${title}</h2></div>
      ${list.map(card).join('')}
      ${tail}
    </div>
  </section>`;

// Draft copy. Jason edits this.
const INTRO = {
  title: 'In 2022 we invited artists to make Grumpls with us. This page is for them.',
  body: [
    'Some had been making art for decades. For a few, a Grumpl was the first thing they ever released.',
    'Seven of them drew full sets of parts that we mixed into Grumpls. The rest each made one Grumpl of their own, including Val Kilmer, who made his with Process Grey through Kamp Kilmer. <strong>Thank you, all of you.</strong>',
  ],
  footer: 'Go follow them. Every name above links to their own work.',
};

export function mountArtists(el) {
  el.classList.add('hidden');
  el.innerHTML = `
    <header id="A-Masthead"><div id="A-Logo"><img src="${DIR}grumpl-logo-black.webp" alt="Grumpl"></div></header>
    <div id="A-Site">
      <section id="A-Hero">
        <header><h1>${INTRO.title}</h1></header>
        <main>
          <div class="copy">
            <button id="A-Sound" type="button" aria-label="Play the Grumpl beat" aria-pressed="false"><img src="${DIR}grumpl-stand.png" alt=""></button>
            ${INTRO.body.map((p) => `<p>${p}</p>`).join('')}
          </div>
        </main>
      </section>
      <div id="A-Grid">
        ${grid('Artists--Gen', 'Generative<br>Artists', GEN)}
        ${grid('Artists--One', 'One-of-One<br>Artists', ONE, `
          <div id="A-Footer" class="outro card">
            <div class="logo"><img loading="lazy" src="${DIR}grumpl-logo-black.webp" alt=""></div>
            <p>${INTRO.footer}</p>
            <p id="A-Colo">&copy;2022 Truth Labs, LLC.</p>
          </div>`)}
      </div>
    </div>`;

  const layer = document.createElement('div');
  layer.id = 'Artists-Layer';
  layer.innerHTML = `
    <div id="Artists-Overlays">
      <div class="overlay-bg"></div>
      ${[...GEN, ...ONE].filter((a) => a.bio).map(overlay).join('')}
    </div>
    <button id="A-Close" class="trigger" type="button" aria-label="Close"></button>`;
  document.body.append(layer);

  const mast = $('#A-Masthead', el), overlays = $('#Artists-Overlays', layer), closeX = $('#A-Close', layer);
  let open = null;

  // the section slides in the first time it scrolls into view
  new IntersectionObserver((entries, io) => {
    if (!entries[0].isIntersecting) return;
    el.classList.remove('hidden');
    mast.classList.add('active');
    io.disconnect();
  }, { threshold: 0.05 }).observe(el);

  // cards drop into place as they enter, and back out as they leave
  const cards = new IntersectionObserver((entries) => {
    for (const e of entries) e.target.classList.toggle('observed', e.isIntersecting);
  }, { rootMargin: '16px' });
  el.querySelectorAll('.card').forEach((c) => cards.observe(c));

  function show(id) {
    open = $(`.overlay[data-id="${id}"]`, layer);
    if (!open) return;
    mast.classList.remove('active');
    el.classList.add('hidden');
    overlays.classList.add('active');
    open.classList.add('active');
    closeX.classList.add('active');
    document.documentElement.style.overflow = 'hidden';
    closeX.focus({ preventScroll: true });
  }
  function hide() {
    if (!open) return;
    const id = open.dataset.id;
    open.classList.remove('active');
    overlays.classList.remove('active');
    closeX.classList.remove('active');
    el.classList.remove('hidden');
    mast.classList.add('active');
    document.documentElement.style.overflow = '';
    open = null;
    $(`[data-open="${id}"]`, el)?.focus({ preventScroll: true });
  }
  el.addEventListener('click', (e) => {
    const b = e.target.closest('[data-open]');
    if (b) show(b.dataset.open);
  });
  closeX.addEventListener('click', hide);
  // a click on the backdrop (anywhere but the two cards) closes too
  overlays.addEventListener('click', (e) => { if (!e.target.closest('.card')) hide(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') hide(); });

  const beat = new Audio(`${DIR}grumplbeat.mp3`);
  beat.volume = 0.4;
  beat.loop = true;
  beat.preload = 'none';
  const sound = $('#A-Sound', el);
  sound.addEventListener('click', () => {
    if (beat.paused) beat.play(); else beat.pause();
  });
  beat.addEventListener('play', () => { $('img', sound).src = `${DIR}grumpl-skip-big.gif`; sound.setAttribute('aria-pressed', 'true'); });
  beat.addEventListener('pause', () => { $('img', sound).src = `${DIR}grumpl-stand.png`; sound.setAttribute('aria-pressed', 'false'); });
}
