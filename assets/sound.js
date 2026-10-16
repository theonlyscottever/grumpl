// Site sound: off until someone turns it on (browsers block audio before a tap anyway).
// Effects are synthesized, so there are no files to load: the box rattle when he hits a wall,
// a soft cushion thump when he lands, and a squeak when he presses against the glass.
// Turning sound on also plays the Grumpl beat (the song from the old Grumpl Artists site), looped, under the effects.
const KEY = 'grumpl-sound';
let ctx = null, master = null, noise = null;
const subs = new Set();
const state = { on: false };
try { state.on = localStorage.getItem(KEY) === '1'; } catch {}

function audio() {
  if (ctx) return ctx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  master = ctx.createGain(); master.gain.value = 0.8; master.connect(ctx.destination);
  // one second of noise, reused for every hit
  noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const d = noise.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return ctx;
}

function burst({ at = 0, dur = 0.12, freq = 300, q = 1, type = 'lowpass', gain = 0.5, attack = 0.002 }) {
  const t = ctx.currentTime + at;
  const src = ctx.createBufferSource(); src.buffer = noise;
  const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(gain, t + attack); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f).connect(g).connect(master);
  src.start(t, Math.random() * 0.8); src.stop(t + dur + 0.02);
}
function tone({ at = 0, f0 = 120, f1 = 60, dur = 0.12, gain = 0.4, type = 'sine' }) {
  const t = ctx.currentTime + at;
  const o = ctx.createOscillator(); o.type = type;
  o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(gain, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(master); o.start(t); o.stop(t + dur + 0.02);
}

// the song: one element for the whole page; the artists' dancing Grumpl is a second switch for it
const beat = new Audio(new URL('../artists/grumplbeat.mp3', import.meta.url).href);
beat.loop = true; beat.volume = 0.4; beat.preload = 'none';
const playBeat = () => beat.play().catch(() => {
  // sound was left on from an earlier visit: browsers hold audio until the first tap or key
  const go = () => { if (state.on) beat.play().catch(() => {}); };
  addEventListener('pointerdown', go, { once: true, capture: true }); addEventListener('keydown', go, { once: true, capture: true });
});
if (state.on) playBeat();

const ready = () => state.on && audio() && ctx.state !== 'closed';

export const sound = {
  get on() { return state.on; },
  beat,
  set(on) {
    state.on = !!on;
    try { localStorage.setItem(KEY, on ? '1' : '0'); } catch {}
    if (on) { audio(); ctx?.resume(); this.boop(); playBeat(); } else beat.pause();
    subs.forEach((f) => f(state.on));
  },
  toggle() { this.set(!state.on); return state.on; },
  subscribe(f) { subs.add(f); f(state.on); return () => subs.delete(f); },
  // vinyl knocking on cardboard: a low thump, the box wall's papery slap, and a little rattle after
  rattle(v = 4) {
    if (!ready()) return;
    const k = Math.min(1, v / 9);
    tone({ f0: 150 + Math.random() * 30, f1: 55, dur: 0.11, gain: 0.25 + 0.45 * k });
    burst({ freq: 900 + Math.random() * 500, q: 0.8, type: 'bandpass', dur: 0.07, gain: 0.25 + 0.4 * k });
    for (let i = 0; i < 2 + Math.round(k * 3); i++) burst({ at: 0.03 + i * (0.025 + Math.random() * 0.03), freq: 2200 + Math.random() * 1800, q: 3, type: 'bandpass', dur: 0.03, gain: 0.06 + 0.1 * k * Math.random() });
  },
  // landing in the cloud: soft and muffled
  thump(v = 3) {
    if (!ready()) return;
    const k = Math.min(1, v / 8);
    tone({ f0: 95, f1: 45, dur: 0.16, gain: 0.18 + 0.3 * k });
    burst({ freq: 260, dur: 0.14, gain: 0.08 + 0.12 * k });
  },
  // a damp face on cold glass
  squeak() {
    if (!ready()) return;
    tone({ f0: 900, f1: 1500, dur: 0.18, gain: 0.08, type: 'triangle' });
    tone({ at: 0.03, f0: 160, f1: 70, dur: 0.12, gain: 0.3 });
    burst({ freq: 3000, q: 4, type: 'bandpass', dur: 0.2, gain: 0.05 });
  },
  boop() {
    if (!ready()) return;
    tone({ f0: 520, f1: 760, dur: 0.09, gain: 0.12, type: 'triangle' });
  },
};
