// The drop the landing page opens on. Only the newest drop is shown on the turntable.
// Stand-in: Sugar Rush (drop 03) from the drop site, plus Clover as a third. Swap in the real drop here.
export const DROP = {
  n: '03',
  name: 'Sugar Rush',
  status: 'upcoming',             // 'live' -> Buy now, 'soldout' -> Buy on secondary, 'upcoming' -> Remind me
  blurb: 'Stand-in for the next drop. Three flavors, swap them for the real ones when they exist.',
};

// base / edge / belly: the airbrushed body. edge is the secondary (luminous neighbouring hue), and the
// page tint is taken from it. finish picks the shader: vinyl, gummy (sugar-coated translucent), flock.
export const FLAVORS = [
  {
    id: 'blueraz', name: 'Blue Raspberry', finish: 'Matte vinyl, airbrushed', kind: 'vinyl',
    base: 0x56c2dc, edge: 0x6d72ff, belly: 0x9fe0ea,
    edition: 300, size: '8"', weight: '210 g', status: 'upcoming',
    photos: ['g7716', 'g7717', 'g5754', 'g5753', 'g5750'],
    desc: 'Slushie blue with a violet glow in every crease. Stand-in flavor shot from a pre-production sample.',
  },
  {
    id: 'strawberry', name: 'Strawberry Gummy', finish: 'Sugar-coated translucent resin', kind: 'gummy',
    base: 0xff5a50, edge: 0xff2d6a, belly: 0xff8a78,
    edition: 100, size: '8"', weight: '240 g', status: 'upcoming',
    photos: [],
    desc: 'Translucent red resin rolled in sugar crystals. A render only for now; no samples exist yet.',
  },
  {
    id: 'clover', name: 'Clover', finish: 'Flocked vinyl', kind: 'flock',
    base: 0x4ca63e, edge: 0x48aa4c, belly: 0x50a842,
    edition: 150, size: '8"', weight: '215 g', status: 'upcoming',
    photos: [],
    desc: 'Grass-green nylon flock over vinyl, soft as a tennis ball. The edges glow lighter where the fibres turn away.',
  },
];

export const SECONDARY_URL = 'https://www.dyli.io/profile/goblintown';
