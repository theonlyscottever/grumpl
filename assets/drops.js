// Every drop, newest first, for the drops section and the burger menu.
// Real data for drops 01 and 02 comes from DYLI (crawled 2026-10-14, grumpl/site/dyli/products.json).
// Drop 03 is the hero's drop (drop.js); before drop 01 is the studio and sketch work.
import { DROP, FLAVORS } from './drop.js';

const DYLI = (slug) => `https://www.dyli.io/drop/${slug}`;
const BOX = 'Blind box, Process Grey × BigShotToyWorks';

export const PAST = {
  fleshberry:  { name: 'Fleshberry', finish: BOX, base: 0xeeaa9c, edge: 0xff6f8e, belly: 0xf6cbbd, cut: 'd2253', photos: ['g5729', 'g5730', 'g5733'],
    url: DYLI('2253-grumpl-fleshberry'), size: '4"', edition: 313, odds: '29%', price: '$42.69', last: '$10',
    desc: 'The most common pull in the box at 29%. Sealed collector box designed by Process Grey; 4" vinyl art figure.' },
  moss:        { name: 'Mosssnootfruit', finish: BOX, base: 0x9fd6a0, edge: 0x4fb8e0, belly: 0xcdeec2, cut: 'd2254', photos: ['g5709', 'g5711', 'g5712', 'g5713', 'g5710'],
    url: DYLI('2254-grumpl-mosssnootfruit'), size: '4"', edition: 273, odds: '25%', price: '$42.69', last: '$33',
    desc: 'Moss green with blue pooled in the creases. One in four boxes.' },
  obo:         { name: 'Color That Tastes Like Obo’s Foot', short: 'Obo’s Foot', finish: BOX, base: 0xa9a6e6, edge: 0x7f8cff, belly: 0xcac8f2, cut: 'd2255',
    photos: ['g5717', 'g5718', 'g5719', 'g5720', 'g5721', 'g5722', 'g5723'],
    url: DYLI('2255-grumpl-color-that-tastes-like-obo-s-foot'), size: '4"', edition: 213, odds: '20%', price: '$42.69', last: '$20',
    desc: 'Periwinkle that leans violet at the ears and toes.' },
  lunchbutter: { name: 'Lunchbutter', finish: BOX, base: 0xd8b862, edge: 0xff9fb0, belly: 0xefd9a0, cut: 'd2256', photos: ['g5716'],
    url: DYLI('2256-grumpl-lunchbutter'), size: '4"', edition: 163, odds: '15%', price: '$42.69', last: '$37.90',
    desc: 'Mustard butter with pink ears.' },
  cement:      { name: 'Cement Juice', finish: BOX, base: 0xc9c7c4, edge: 0xff9fb8, belly: 0xe6e4e1, cut: 'd2257', photos: ['g5726', 'g5725', 'g5727'],
    url: DYLI('2257-grumpl-cement-juice'), size: '4"', edition: 107, odds: '10%', price: '$42.69', last: '$6',
    desc: 'Sidewalk gray with pink in the crevices. One in ten boxes.' },
  speshul:     { name: 'Bagfasehed Speshul', finish: 'Hand-painted by Process Grey', base: 0xd9d4cc, edge: 0xb48cff, belly: 0xefebe5, cut: 'd2258', photos: [],
    url: DYLI('2258-grumpl-bagfasehed-speshul'), size: '4"', edition: 17, odds: '1%', price: '$42.69', last: '$250', chase: true,
    desc: 'The chase. Hand-painted by Process Grey, pulled from 1% of boxes, and only 17 exist. DYLI shows him as a mystery outline.' },
  gift:        { name: '8" Collector’s Gift', finish: 'Airdrop to holders of 5+ colors', base: 0xe0d6c6, edge: 0xffb36b, belly: 0xf2ece2, cut: 'd2312', photos: [],
    url: DYLI('2312-8-grumpl-collector-s-gift'), size: '8"', edition: 50, odds: 'Holders of 5+ colors', price: 'Free', last: '$6.90', chase: true,
    desc: 'An 8" Grumpl airdropped to anyone holding five or more colors from the blind drop. The colorway is still being finalized.' },
  canvas:      { name: 'Blank Canvas', finish: 'Unpainted matte vinyl', base: 0xece9e3, edge: 0xc3cdf0, belly: 0xfbfaf7, photos: ['g7719', 'g7721', 'g7688'],
    size: '8"', desc: 'The raw pull, straight off the mold with no paint.' },
  chrome:      { name: 'Rose Chrome', finish: 'Mirror-plated vinyl', base: 0xe7b3a2, edge: 0xf39ab8, belly: 0xf6d3c6, photos: ['g7690', 'g7692', 'g7685'],
    size: '8"', desc: 'A mirror-plated oddball from a test run.' },
};

// status: 'upcoming' | 'live' | 'soldout' | 'studio'
export const DROPS = [
  { n: DROP.n, name: DROP.name, when: 'Next', status: DROP.status, current: true, blurb: DROP.blurb,
    flavors: FLAVORS.map((f, i) => ({ ...f, heroIndex: i, cut: f.cut || `r-${f.id}` })) },
  { n: '02', name: 'Collector’s Gift', when: 'Feb 2025', status: 'soldout', flavors: [PAST.gift],
    blurb: 'Fifty 8" Grumpls airdropped Feb 20–21 2025 to anyone holding five or more blind box colors.' },
  { n: '01', name: 'Blind Box', when: 'Feb 2025', status: 'soldout',
    flavors: ['fleshberry', 'moss', 'obo', 'lunchbutter', 'cement', 'speshul'].map((k) => PAST[k]),
    blurb: 'Six 4" flavors in sealed collector boxes by Process Grey with BigShotToyWorks, $42.69 a box, Feb 12–14 2025. Sold out. Every flavor trades on DYLI now.' },
  { n: '00', name: 'Before drop 01', when: '2022–2024', status: 'studio', concept: true, flavors: [PAST.canvas, PAST.chrome],
    blurb: 'Test pulls, a chrome mistake we kept, and the drawings that started it.' },
];

// sketchbook pages shown with the concept drop
export const SKETCHES = [
  { img: 'grumpl-stand.png', cap: 'First standing pose', line: true },
  { img: 'grumpl-skip.gif', cap: 'The skip', line: true },
  { img: 'g7719', cap: 'First raw pull' },
  { img: 'g7690', cap: 'Chrome test' },
  { img: 'art-grumpls-gen.webp', cap: 'Trap study' },
];
