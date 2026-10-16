// The drops section and the flavor popup, carried over from Scott's Grumpl drop site (grumpl/site/index.html)
// as is: the rail of drop cards, the flavor grid, the two-card popup with the 3D box and the details card,
// and the background tint that follows whichever Grumpl you point at. Drop 03 is the hero's drop (drop.js).
import { DROP as HERO_DROP, FLAVORS as HERO_FLAVORS, SECONDARY_URL } from './drop.js';
const hx = (n) => '#' + n.toString(16).padStart(6, '0');
/* ======================= data =======================
   Drops 01 and 02 are real, from DYLI (dyli.io/profile/goblintown, crawled Oct 14 2026).
   Drops 00 and 03 are stand-ins built from studio photos until real data exists. */
const SIZE = { h: ['4.75 in', '12.1 cm'], w: ['3.4 in', '8.6 cm'], d: ['2.9 in', '7.4 cm'] }; // stand-in dimensions
const DYLI = (slug) => `https://www.dyli.io/drop/${slug}`;
const BOX = 'Blind box, Process Grey \u00d7 BigShotToyWorks';
const FLAVORS = {
	canvas:      { name: 'Blank Canvas',     finish: 'Unpainted matte vinyl', kind: 'vinyl',  base: '#ece9e3', edge: '#c3cdf0', belly: '#fbfaf7', photos: ['g7719', 'g7721', 'g7688'], weight: '205 g', edition: 300, stand: true,
		desc: 'The raw pull, straight off the mold with no paint. Stand-in card until the studio pull has real details.' },
	// Rose Chrome is drop 03's now (drop.js)

	fleshberry:  { name: 'Fleshberry', finish: BOX, kind: 'vinyl', base: '#eeaa9c', edge: '#ff6f8e', belly: '#f6cbbd', photos: ['d2253', 'g5729', 'g5730', 'g5733'],
		url: DYLI('2253-grumpl-fleshberry'), size: '4"', edition: 313, minted: 313, odds: '29%', price: '$42.69', floor: '$40', last: '$10',
		desc: 'The most common pull in the box at 29%. Sealed collector box designed by Process Grey; 4" vinyl art figure.' },
	moss:        { name: 'Mosssnootfruit', finish: BOX, kind: 'vinyl', base: '#9fd6a0', edge: '#4fb8e0', belly: '#cdeec2', photos: ['d2254', 'g5709', 'g5711', 'g5712', 'g5713', 'g5710'],
		url: DYLI('2254-grumpl-mosssnootfruit'), size: '4"', edition: 273, minted: 273, odds: '25%', price: '$42.69', last: '$33',
		desc: 'Moss green with blue pooled in the creases. One in four boxes. Sealed collector box designed by Process Grey; 4" vinyl art figure.' },
	obo:         { name: 'Color That Tastes Like Obo\u2019s Foot', short: 'Obo\u2019s Foot', finish: BOX, kind: 'vinyl', base: '#a9a6e6', edge: '#7f8cff', belly: '#cac8f2', photos: ['d2255', 'g5717', 'g5718', 'g5719', 'g5720', 'g5721', 'g5722', 'g5723'],
		url: DYLI('2255-grumpl-color-that-tastes-like-obo-s-foot'), size: '4"', edition: 213, minted: 213, odds: '20%', price: '$42.69', last: '$20',
		desc: 'Periwinkle that leans violet at the ears and toes. Sealed collector box designed by Process Grey; 4" vinyl art figure.' },
	lunchbutter: { name: 'Lunchbutter', finish: BOX, kind: 'vinyl', base: '#d8b862', edge: '#ff9fb0', belly: '#efd9a0', photos: ['d2256', 'g5716'],
		url: DYLI('2256-grumpl-lunchbutter'), size: '4"', edition: 163, minted: 163, odds: '15%', price: '$42.69', last: '$37.90',
		desc: 'Mustard butter with pink ears. Sealed collector box designed by Process Grey; 4" vinyl art figure.' },
	cement:      { name: 'Cement Juice', finish: BOX, kind: 'vinyl', base: '#c9c7c4', edge: '#ff9fb8', belly: '#e6e4e1', photos: ['d2257', 'g5726', 'g5725', 'g5727'],
		url: DYLI('2257-grumpl-cement-juice'), size: '4"', edition: 107, minted: 107, odds: '10%', price: '$42.69', last: '$6',
		desc: 'Sidewalk gray with pink in the crevices. One in ten boxes. Sealed collector box designed by Process Grey; 4" vinyl art figure.' },
	speshul:     { name: 'Bagfasehed Speshul', finish: 'Hand-painted by Process Grey', kind: 'vinyl', base: '#d9d4cc', edge: '#b48cff', belly: '#efebe5', photos: ['d2258'],
		url: DYLI('2258-grumpl-bagfasehed-speshul'), size: '4"', edition: 1000, minted: 17, odds: '1%', price: '$42.69', last: '$250', chase: true,
		desc: 'The chase. Hand-painted by Process Grey, pulled from 1% of boxes, and only 17 exist. DYLI shows him as a mystery outline.' },

	gift:        { name: '8" Collector\u2019s Gift', finish: 'Airdrop to holders of 5+ colors', kind: 'vinyl', base: '#e0d6c6', edge: '#ffb36b', belly: '#f2ece2', photos: ['d2312'],
		url: DYLI('2312-8-grumpl-collector-s-gift'), size: '8"', edition: 50, odds: 'Holders of 5+ colors', price: '$0', floor: '$100', last: '$6.90', chase: true,
		desc: 'An 8" Grumpl airdropped to anyone holding five or more colors from the blind drop. The colorway is still being finalized.' },

	...Object.fromEntries(HERO_FLAVORS.map((f) => [f.id, { ...f, base: hx(f.base), edge: hx(f.edge), belly: hx(f.belly), still: `r-${f.id}`, stand: true }])),
};
const DROPS = [
	{ n: '00', name: 'Studio Pull',  when: 'Stand-in', status: 'released', flavors: ['canvas'], stand: true,
		blurb: 'Stand-in drop. Raw white vinyl from the studio photos, until there is a real drop 00 to show.' },
	{ n: '01', name: 'Blind Box',    when: 'Feb 2025', status: 'released', flavors: ['fleshberry', 'moss', 'obo', 'lunchbutter', 'cement', 'speshul'],
		blurb: 'Six 4" flavors in sealed collector boxes by Process Grey with BigShotToyWorks, $42.69 a box, Feb 12\u201314 2025. Sold out; every flavor trades on DYLI now.' },
	{ n: '02', name: 'Collector\u2019s Gift', when: 'Feb 2025', status: 'released', flavors: ['gift'],
		blurb: 'Fifty 8" Grumpls airdropped Feb 20\u201321 2025 to holders of five or more blind box colors.' },
	{ n: HERO_DROP.n, name: HERO_DROP.name, when: 'Stand-in', status: HERO_DROP.status, flavors: HERO_FLAVORS.map((f) => f.id), stand: true,
		blurb: 'Stand-in for the next drop. Leave your email on a flavor to see how the remind-me flow works.' },
];
const RESERVED = ['04', '05', '06'];


/* ======================= helpers ======================= */
const $ = (s, el = document) => el.querySelector(s);
const img = (id) => `assets/img/${id}.webp`;
const cut = (id) => id?.[0] === 'd'; // DYLI renders have transparent backgrounds
const rnd = (seed) => { const x = Math.sin(seed * 999.13) * 43758.5453; return x - Math.floor(x); };
const hexMix = (a, b, t) => {
	const p = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
	const A = p(a), B = p(b);
	return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join('');
};
for (const [id, f] of Object.entries(FLAVORS)) { f.id = id; f.soft = hexMix(f.belly, '#ffffff', 0.62); }
for (const d of DROPS) d.flavors.forEach((id) => (FLAVORS[id].drop = d));
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const wait = (ms) => new Promise((r) => setTimeout(r, reduce ? 0 : ms));
const two = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
const ICON = {
	eye: '<svg viewBox="0 0 20 20" aria-hidden="true"><path fill="currentColor" d="M10 4C4.5 4 1.6 8.6 1 10c.6 1.4 3.5 6 9 6s8.4-4.6 9-6c-.6-1.4-3.5-6-9-6zm0 9.6a3.6 3.6 0 1 1 0-7.2 3.6 3.6 0 0 1 0 7.2zm0-5.4a1.8 1.8 0 1 0 0 3.6 1.8 1.8 0 0 0 0-3.6z"/></svg>',
	out: '<svg viewBox="0 0 20 20" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" d="M7 4h9v9M16 4 5 15"/></svg>',
	share: '<svg viewBox="0 0 20 20" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" d="M10 12.5V2.5M6 6l4-4 4 4M4 10v6.5h12V10"/></svg>',
	bell: '<svg viewBox="0 0 20 20" aria-hidden="true"><path fill="currentColor" d="M10 2a5 5 0 0 0-5 5v3.6L3.3 13.8c-.3.6.1 1.2.7 1.2h12c.6 0 1-.6.7-1.2L15 10.6V7a5 5 0 0 0-5-5zm-2 14a2 2 0 0 0 4 0z"/></svg>',
	prev: '<svg viewBox="0 0 20 20" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round" d="M12.5 4 6.5 10l6 6"/></svg>',
	next: '<svg viewBox="0 0 20 20" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round" d="M7.5 4l6 6-6 6"/></svg>',
	sleepy: '<svg viewBox="0 0 48 48" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="3" stroke-linejoin="round" d="M12 18 10 8l9 6c3-1 7-1 10 0l9-6-2 10c2 3 3 6 3 10 0 9-7 14-15 14S9 37 9 28c0-4 1-7 3-10z"/><path fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" d="M17 26q2.5 2 5 0M26 26q2.5 2 5 0M19 33q5 3 10 0"/></svg>',
};

/* ======================= tint ======================= */
const section = $('#Drops');
function tint(f) { section.style.setProperty('--tint', f.base); section.style.setProperty('--tint-edge', f.edge); }
let current = DROPS.length - 1;
const dropTint = () => tint(FLAVORS[DROPS[current].flavors[0]]);

/* ======================= rail ======================= */
const rail = $('#Rail');
rail.innerHTML = '<h2>Drops</h2>' + DROPS.map((d, i) => {
	const lead = FLAVORS[d.flavors[0]];
	return `<button class="drop card" data-i="${i}" style="--r:${(rnd(i + 3) * 3 - 1.5).toFixed(2)}deg;--hue:${lead.base}" aria-pressed="false">
		<span class="drop-num">${d.n}</span>
		<span class="drop-name">${d.name}</span>
		<span class="drop-meta">${d.status === 'upcoming' ? '<span class="chip soon">Soon</span>' : '<span class="chip">Out</span>'}${d.when}</span>
		<span class="dots">${d.flavors.map((id, k) => `<i style="--c:${FLAVORS[id].base};--k:${k}"></i>`).join('')}</span>
	</button>`;
}).join('') + RESERVED.map((n, k) => `<div class="drop card empty" style="--r:${(rnd(k + 9) * 3 - 1.5).toFixed(2)}deg;--k:${k}" aria-label="Drop ${n}, reserved">
		${ICON.sleepy}<span class="drop-name">Drop ${n}</span><span class="drop-meta">Reserved</span></div>`).join('');

rail.addEventListener('click', (e) => {
	const b = e.target.closest('.drop[data-i]');
	if (b) { haptic(8); selectDrop(+b.dataset.i); }
});

/* ======================= stage ======================= */
const grid = $('#Grid'), head = $('#Head');
const renders = {}; // flavor id -> 3D still (data URL) once the model is ready

function flavorCard(f, i) {
	const up = f.drop.status === 'upcoming';
	const main = f.photos[0] ? `<img class="art" src="${img(f.photos[0])}" alt="" draggable="false">`
		: renders[f.id] ? `<img class="art" src="${renders[f.id]}" alt="">` : f.still ? `<img class="art" src="${img(f.still)}" alt="" draggable="false">` : `<span class="art blob"></span>`;
	const repSrc = renders[f.id] || (f.photos[1] && img(f.photos[1]));
	const rep = repSrc ? `<img class="rep" src="${repSrc}" alt="" draggable="false">` : '';
	return `<button class="flavor card${cut(f.photos[0]) || (!f.photos[0] && f.still && !renders[f.id]) ? ' cut' : ''}" data-id="${f.id}" aria-label="${f.name}, ${up ? 'coming soon' : 'released'}. Open details"
		style="--base:${f.base};--edge:${f.edge};--belly:${f.belly};--soft:${f.soft}">
		${main}${rep}
		<span class="acts"><span class="trigger">${ICON.eye}</span><span class="say">${up ? 'Remind me' : 'On secondary'}</span></span>
		${up ? '<span class="sticker">Soon</span>' : f.chase ? '<span class="sticker">Chase</span>' : ''}
		<span class="tag">${f.short || f.name}</span>
		<span class="flav-sub">${f.finish}</span>
	</button>`;
}
function introCard(d) {
	const lead = FLAVORS[d.flavors[0]];
	const bg = lead.photos[0] ? new URL(img(lead.photos[0]), document.baseURI).href : ''; // absolute: a url() in a custom property resolves against the stylesheet
	return `<div class="intro card" style="--img:url('${bg}')">
		<span class="big">${d.n}</span><span class="lbl">${d.name}</span>
		<span class="sm">${d.flavors.length} ${d.flavors.length === 1 ? 'piece' : 'flavors'} \u00b7 ${d.status === 'upcoming' ? 'coming ' + d.when : 'out ' + d.when}</span></div>`;
}
function headHTML(d) {
	return `<div><div class="eyebrow"><span>Drop ${d.n}</span>${d.status === 'upcoming' ? '<span class="chip soon">Coming soon</span>' : '<span class="chip">Released</span>'}<span>${d.when}</span></div>
		<h1>${d.name}</h1></div><span class="count">${d.flavors.length} ${d.flavors.length === 1 ? 'piece' : 'flavors'}</span><p>${d.blurb}</p>`;
}

let busy = false, pending = null;
async function selectDrop(i, first = false) {
	if (i === current && !first) return;
	if (busy) { pending = i; return; }
	busy = true;
	current = i;
	const d = DROPS[i];
	rail.querySelectorAll('.drop[data-i]').forEach((b) => {
		const on = +b.dataset.i === i;
		b.classList.toggle('active', on);
		b.setAttribute('aria-pressed', on);
		if (on && !first) { b.classList.remove('bounce'); void b.offsetWidth; b.classList.add('bounce'); }
	});
	dropTint();
	if (!first) {
		// departure: cards fly off one by one, the way the artist overlays leave
		head.classList.add('leaving');
		[...grid.children].forEach((c, k) => { c.style.setProperty('--d', `${k * 45}ms`); c.classList.add('leaving'); });
		await wait(380 + grid.children.length * 45);
	}
	head.className = 'drop-head pre';
	head.innerHTML = headHTML(d);
	grid.innerHTML = introCard(d) + d.flavors.map((id, k) => flavorCard(FLAVORS[id], k)).join('');
	// arrival: each card drops in from a random tilt and settles onto its own slight angle
	[...grid.children].forEach((c, k) => {
		const s = i * 10 + k;
		c.style.setProperty('--r', `${(rnd(s + 1) * 4 - 2).toFixed(2)}deg`);
		c.style.setProperty('--fy', `${Math.round(rnd(s + 2) * 160 - 120)}px`);
		c.style.setProperty('--fr', `${Math.round(rnd(s + 3) * 32 - 16)}deg`);
		c.style.setProperty('--d', `${k * 70}ms`);
		c.classList.add('pre');
	});
	await two();
	head.classList.remove('pre');
	[...grid.children].forEach((c) => c.classList.remove('pre'));
	setTimeout(() => [...grid.children].forEach((c) => c.style.setProperty('--d', '0s')), 600 + grid.children.length * 70);
	busy = false;
	if (pending !== null) { const p = pending; pending = null; selectDrop(p); }
}

grid.addEventListener('pointerover', (e) => { const c = e.target.closest('.flavor'); if (c) tint(FLAVORS[c.dataset.id]); });
grid.addEventListener('pointerleave', dropTint);
grid.addEventListener('click', (e) => { const c = e.target.closest('.flavor'); if (c) { haptic(10); openFlavor(c.dataset.id); } });

/* ======================= overlay ======================= */
const overlays = $('#DropOverlays'), sheet = $('#DropSheet'), closeX = $('#DropClose');
let openId = null, slide = 0, slides = 0, lastFocus = null;

function setOverlayColors(f) {
	overlays.style.setProperty('--o-base', hexMix(f.base, '#ffffff', 0.25));
	overlays.style.setProperty('--o-edge', f.edge);
	overlays.style.setProperty('--o-belly', hexMix(f.belly, '#ffffff', 0.5));
	overlays.style.setProperty('--o-soft', f.soft);
}
function specRows(f) {
	const sw = `<span class="swatch"><i style="--c:${f.base}"></i><i style="--c:${f.edge}"></i></span>`;
	if (!f.url) return `
			<dt>Height</dt><dd>${SIZE.h[0]}<small>${SIZE.h[1]}</small></dd>
			<dt>Width</dt><dd>${SIZE.w[0]}<small>${SIZE.w[1]}</small></dd>
			<dt>Depth</dt><dd>${SIZE.d[0]}<small>${SIZE.d[1]}</small></dd>
			<dt>Weight</dt><dd>${f.weight}</dd>
			<dt>Finish</dt><dd>${sw}${f.finish}</dd>
			<dt>Edition</dt><dd>${f.edition} pieces<small>stand-in</small></dd>`;
	const ed = f.minted && f.minted !== f.edition ? `${f.minted} of ${f.edition}<small>minted</small>` : `${f.edition}<small>pieces</small>`;
	return `
			<dt>Size</dt><dd>${f.size} vinyl art figure</dd>
			<dt>Finish</dt><dd>${sw}${f.finish}</dd>
			<dt>Edition</dt><dd>${ed}</dd>
			<dt>${f.id === 'gift' ? 'Who got one' : 'Pull odds'}</dt><dd>${f.odds}</dd>
			<dt>Drop price</dt><dd>${f.price}</dd>
			<dt>${f.floor ? 'Floor' : 'Last sale'}</dt><dd>${f.floor || f.last}${f.floor ? `<small>last sale ${f.last}</small>` : ''}</dd>`;
}
const COARSE = matchMedia('(pointer: coarse)').matches;
const CAN_MOVE = COARSE && 'DeviceMotionEvent' in window;
const MOTION_UI = `<button class="tilt" id="DropTilt" type="button" ${CAN_MOVE ? '' : 'hidden'}>${'<svg viewBox="0 0 20 20" aria-hidden="true"><rect x="5.5" y="2" width="9" height="16" rx="2.2" fill="none" stroke="currentColor" stroke-width="2.2" transform="rotate(-14 10 10)"/><path d="M2 7q-1.6 3 0 6M18 7q1.6 3 0 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>'}<span>Tilt &amp; shake</span></button>
	<span class="hint" id="Hint" hidden></span>`;
const haptic = (ms) => { try { navigator.vibrate?.(ms); } catch {} };
function hint(text, ms = 3200) {
	const h = $('#Hint'); if (!h) return;
	h.textContent = text; h.hidden = false; h.classList.remove('show'); void h.offsetWidth; h.classList.add('show');
	clearTimeout(hint.t); hint.t = setTimeout(() => h.classList.remove('show'), ms);
}
// The page is being shown inside someone else's frame (like the Claude preview), and the phone won't
// hand motion to a framed page. Opening the page on its own fixes it.
function offerFullPage() {
	const h = $('#Hint'); if (!h) return;
	clearTimeout(hint.t);
	h.innerHTML = 'Your phone blocks motion inside this preview. <button type="button" class="full">Open the page on its own</button> to shake him, or flick him with your finger.';
	h.hidden = false; h.classList.add('show', 'stay');
	$('.full', h).addEventListener('click', () => {
		const w = window.open(location.href, '_blank', 'noopener');
		if (!w) h.textContent = 'Couldn\u2019t open a new tab from here. Flick him with your finger instead.';
	});
}
function wireMotion() {
	const b = $('#DropTilt'); if (!b) return;   // not #Tilt: that id is the hero's own shake button
	if (window.Grumpl3D?.motionOn) { b.hidden = true; return; }
	if (!CAN_MOVE) { if (!wireMotion.told) { wireMotion.told = true; setTimeout(() => hint('Drag to spin him. Flick to toss him.'), 1400); } return; }
	b.addEventListener('click', async () => {
		b.disabled = true; haptic(10);
		const r = await window.Grumpl3D?.enableMotion();
		b.hidden = true;
		if (r === 'on') { hint('Tilt to look around his box. Shake hard to toss him.'); haptic([12, 40, 12]); }
		else if (r === 'framed') offerFullPage();
		else if (r === 'denied') hint('Motion was turned down. Flick him with your finger instead. (Safari asks again after you reload.)', 5200);
		else hint('Motion isn\u2019t available here. Flick him with your finger instead.');
	});
}
function sheetHTML(f) {
	const d = f.drop, up = d.status === 'upcoming';
	const list = d.flavors, idx = list.indexOf(f.id);
	const photoSlides = f.photos.length
		? f.photos.map((p, k) => `<div class="slide${cut(p) ? ' cut' : ''}" data-k="${k + 1}"><img src="${img(p)}" alt="${f.name} Grumpl, photo ${k + 1}" draggable="false"></div>`).join('')
		: `<div class="slide soon" data-k="1"><b>Photos soon</b><span>Samples are on their way.</span></div>`;
	const n = 1 + Math.max(1, f.photos.length);
	const pips = Array.from({ length: n }, (_, k) => `<button class="${k === 0 ? 'is3d' : ''}" data-go="${k}" aria-label="${k === 0 ? '3D view' : 'Photo ' + k}"></button>`).join('');
	const cta = up
		? `<form class="remind" novalidate>
				<label for="RemindEmail">Remind me when ${f.name} drops</label>
				<div class="row"><input id="RemindEmail" type="email" inputmode="email" autocomplete="email" placeholder="you@email.com" required><button class="go" type="submit">Remind me</button></div>
				<p class="err" aria-live="polite"></p>
			</form>`
		: `<a class="cta" href="${f.url || SECONDARY_URL}" target="_blank" rel="noopener">Buy on secondary <span class="trigger">${ICON.out}</span></a>
			<p class="cta-note">${f.url ? `Sold out. Listings and sales are on DYLI.` : 'Stand-in flavor, so this button has no listing yet.'}</p>`;
	return `
	<div class="art card"><div class="car" id="Car">
		<div class="track" id="Track">
			<div class="slide three on" data-k="0" id="ThreeSlot"><span class="wait">Waking the Grumpl\u2026</span>${MOTION_UI}</div>
			${photoSlides}
		</div>
		<span class="tag" id="SlideTag">3D \u00b7 drag to spin</span>
		<div class="car-nav">
			<button class="trigger" data-step="-1" aria-label="Previous photo">${ICON.prev}</button>
			<span class="pips">${pips}</span>
			<button class="trigger" data-step="1" aria-label="Next photo">${ICON.next}</button>
		</div>
	</div></div>
	<div class="info card${f.name.length > 22 ? ' long' : ''}">
		<h2 class="tag" id="FlavorName">${f.name}</h2>
		<div class="eyebrow"><span>Drop ${d.n} \u00b7 ${d.name}</span>${up ? '<span class="chip soon">Coming ' + d.when + '</span>' : '<span class="chip">Released ' + d.when + '</span>'}</div>
		<p class="desc">${f.desc}</p>
		<dl class="specs">${specRows(f)}</dl>
		${cta}
		<div class="acts">
			<button class="trigger" data-flav="-1" aria-label="Previous flavor">${ICON.prev}</button>
			<span>${idx + 1} of ${list.length}</span>
			<button class="trigger" data-flav="1" aria-label="Next flavor">${ICON.next}</button>
			${navigator.share ? `<button class="trigger" data-share aria-label="Share ${f.short || f.name}">${ICON.share}</button>` : ''}
		</div>
	</div>`;
}
function fillSheet(f) {
	openId = f.id;
	setOverlayColors(f);
	tint(f);
	sheet.innerHTML = sheetHTML(f);
	slide = 0;
	slides = sheet.querySelectorAll('.slide').length;
	goSlide(0, true);
	window.Grumpl3D?.mount($('#ThreeSlot'), f);
	wireMotion();
	const form = $('.remind', sheet);
	if (form) form.addEventListener('submit', (e) => {
		e.preventDefault();
		const v = $('#RemindEmail').value.trim();
		if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) { $('.err', form).textContent = 'That email looks off. Check it and try again.'; return; }
		form.outerHTML = `<div class="remind"><div class="done">${ICON.bell.replace('<svg', '<svg width="30" height="30"')}<div><b>You\u2019re on the list</b>We\u2019ll email ${v.replace(/[<>&"]/g, '')} when ${f.name} opens.</div></div></div>`;
	});
}
async function openFlavor(id) {
	lastFocus = document.activeElement;
	const f = FLAVORS[id];
	fillSheet(f);
	sheet.classList.add('arrive');
	document.body.classList.add('ds-no-scroll');
	boot3D();
	overlays.classList.add('active');
	overlays.setAttribute('aria-hidden', 'false');
	closeX.classList.add('active');
	await two();
	sheet.classList.remove('arrive');
	setTimeout(() => closeX.focus({ preventScroll: true, focusVisible: byKeys }), 300);   // the focus ring is for keyboard users only
}
function closeOverlay() {
	if (!overlays.classList.contains('active')) return;
	overlays.classList.remove('active');
	overlays.setAttribute('aria-hidden', 'true');
	closeX.classList.remove('active');
	document.body.classList.remove('ds-no-scroll');
	dropTint();
	setTimeout(() => { if (!overlays.classList.contains('active')) { window.Grumpl3D?.unmount(); sheet.innerHTML = ''; openId = null; } }, 700);
	lastFocus?.focus?.({ preventScroll: true });
}
async function stepFlavor(dir) {
	const list = FLAVORS[openId].drop.flavors;
	const next = list[(list.indexOf(openId) + dir + list.length) % list.length];
	sheet.classList.add('swap');
	await wait(420);
	fillSheet(FLAVORS[next]);
	sheet.classList.remove('swap');
	sheet.classList.add('arrive');
	await two();
	sheet.classList.remove('arrive');
}
function goSlide(k, instant = false) {
	slide = (k + slides) % slides;
	const track = $('#Track'); if (!track) return;
	if (instant) track.style.transition = 'none';
	track.style.transform = `translateX(${-100 * slide}%)`;
	if (instant) { void track.offsetWidth; track.style.transition = ''; }
	track.querySelectorAll('.slide').forEach((s, i) => s.classList.toggle('on', i === slide));
	sheet.querySelectorAll('.pips button').forEach((b, i) => b.classList.toggle('on', i === slide));
	const f = FLAVORS[openId];
	$('#SlideTag').textContent = slide === 0 ? (COARSE ? '3D \u00b7 drag or flick him' : '3D \u00b7 drag to spin, flick to toss') : f.photos.length ? `Photo ${slide} of ${f.photos.length}` : 'Photos soon';
	window.Grumpl3D?.setActive(slide === 0);
}
sheet.addEventListener('click', (e) => {
	const s = e.target.closest('[data-step]'), g = e.target.closest('[data-go]'), fl = e.target.closest('[data-flav]');
	if (s) goSlide(slide + +s.dataset.step);
	if (g) goSlide(+g.dataset.go);
	if (fl) { haptic(8); stepFlavor(+fl.dataset.flav); }
	if (e.target.closest('[data-share]')) {
		const f = FLAVORS[openId];
		navigator.share({ title: `${f.name} Grumpl`, text: `${f.name}, a Grumpl from drop ${f.drop.n}`, url: f.url || location.href }).catch(() => {});
	}
});
// swipe photos (the 3D slide uses drag to spin instead)
let sx = null;
sheet.addEventListener('pointerdown', (e) => { if (e.target.closest('.slide:not(.three)')) sx = e.clientX; });
addEventListener('pointerup', (e) => { if (sx === null) return; const dx = e.clientX - sx; sx = null; if (Math.abs(dx) > 40) goSlide(slide + (dx < 0 ? 1 : -1)); });
overlays.addEventListener('click', (e) => { if (e.target === overlays || e.target.classList.contains('overlay-bg') || e.target === sheet) closeOverlay(); });
closeX.addEventListener('click', closeOverlay);
// whether the last thing the visitor did was a key press (then the X shows its focus ring when a popup opens)
let byKeys = false;
addEventListener('keydown', () => { byKeys = true; closeX.classList.remove('quiet'); }, true);
addEventListener('pointerdown', () => { byKeys = false; closeX.classList.add('quiet'); }, true);
// phones: pull the popup down from the top to dismiss it
let pull = null;
overlays.addEventListener('touchstart', (e) => {
	if (overlays.scrollTop > 0 || e.touches.length > 1 || e.target.closest('.slide.three, input, .car')) return;
	pull = { y: e.touches[0].clientY, dy: 0 };
}, { passive: true });
overlays.addEventListener('touchmove', (e) => {
	if (!pull) return;
	pull.dy = Math.max(0, e.touches[0].clientY - pull.y);
	if (overlays.scrollTop > 0) { pull = null; sheet.style.transform = ''; return; }
	sheet.style.transition = 'none';
	sheet.style.transform = `translateY(${pull.dy * 0.6}px) rotate(${pull.dy * 0.012}deg)`;
}, { passive: true });
overlays.addEventListener('touchend', () => {
	if (!pull) return;
	const go = pull.dy > 120; pull = null;
	sheet.style.transition = 'transform 0.5s var(--ease)'; sheet.style.transform = '';
	if (go) { haptic(12); closeOverlay(); }
});
addEventListener('keydown', (e) => {
	if (!overlays.classList.contains('active')) return;
	if (e.key === 'Escape') closeOverlay();
	if (e.target.tagName === 'INPUT') return;
	if (e.key === 'ArrowRight') goSlide(slide + 1);
	if (e.key === 'ArrowLeft') goSlide(slide - 1);
});


/* when the 3D model is ready it renders a studio still of each flavor; those become the hover images */
addEventListener('grumpl3d-ready', async () => {
	for (const f of Object.values(FLAVORS)) {
		if (COARSE && f.photos.length) continue;
		renders[f.id] = await window.Grumpl3D.still(f, f.photos.length ? 0.55 : 0.35);
		grid.querySelectorAll(`.flavor[data-id="${f.id}"]`).forEach((c) => {
			let rep = $('.rep', c);
			if (!rep) { rep = document.createElement('img'); rep.className = 'rep'; rep.alt = ''; c.insertBefore(rep, $('.acts', c)); }
			rep.src = renders[f.id];
			const blob = $('.art.blob', c);
			if (blob) { const im = document.createElement('img'); im.className = 'art'; im.alt = ''; im.src = renders[f.id]; blob.replaceWith(im); }
		});
	}
});



/* the 3D box loads once the section gets close, or when a popup opens first */
let booted = false;
function boot3D() { if (booted) return; booted = true; import('./drops-3d.js').catch((err) => console.error(err)); }
new IntersectionObserver(([e], io) => { if (e.isIntersecting) { io.disconnect(); boot3D(); } }, { rootMargin: '600px 0px' }).observe(section);
addEventListener('grumpl-warm-drops', boot3D);

/* the hero's (i) and the menu's drop cards open the same things */
addEventListener('grumpl-open-flavor', (e) => openFlavor(e.detail.id));
addEventListener('grumpl-drop', (e) => { const i = DROPS.findIndex((d) => d.n === e.detail.n); if (i >= 0) selectDrop(i); });

selectDrop(current, true);
