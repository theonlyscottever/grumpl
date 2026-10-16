// The drop the landing page opens on. Only the newest drop is shown on the turntable.
// Stand-in: Sugar Rush (drop 03) from the drop site: Blue Raspberry, Rose Chrome and Clover. Swap in the real drop here.
// (Strawberry Gummy was cut 2026-10-16: Scott, it will never be a real toy and it cost the most to draw.)
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
    id: 'chrome', name: 'Rose Chrome', finish: 'Mirror-plated vinyl', kind: 'chrome',
    base: 0xf2c9b8, edge: 0xf39ab8, belly: 0xf6d3c6,
    edition: 50, size: '8"', weight: '226 g', status: 'upcoming',
    photos: ['g7690', 'g7692', 'g7685'],
    desc: 'Mirror-plated rose gold, the same chrome as the logo. Stand-in flavor shot from a test pull.',
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
