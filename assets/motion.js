// Grumpl tilt + shake, lifted from the drop site (grumpl/site/index.html) and made engine-free.
// Tested on Scott's iPhone 2026-10-15 at https://theonlyscottever.github.io/grumpl/grumpl-drop-test/
//
//   import { createMotion } from './grumpl-motion.js';
//   const motion = createMotion({ onTilt, onWobble, onToss });
//   button.onclick = async () => { const r = await motion.enable(); ... };   // must run inside a tap on iOS
//   // in your frame loop: motion.tick(performance.now());
//
// Directions are in the phone's screen frame: +x right, +y up, +z out of the screen toward you.

export const SHAKE = { wobble: 7, toss: 14 }; // m/s² of the phone's own acceleration (gravity removed)
export const TILT = { range: 35, recentre: 0.012, slideFrom: 12 }; // degrees, per-event follow rate, degrees

export const canMove = () => matchMedia('(pointer: coarse)').matches && 'DeviceMotionEvent' in window;
export const haptic = (ms) => { try { navigator.vibrate?.(ms); } catch {} };

export function createMotion({ onTilt, onWobble, onToss } = {}) {
	const s = { on: false, heard: false, base: null, beta: 0, gamma: 0, peak: 0, peakVec: [0, 0, 0], peakAt: 0 };
	const clamp = (v, a) => Math.max(-a, Math.min(a, v));

	function onOrient(e) {
		if (e.beta == null) return;
		s.heard = true;
		const b = e.beta, g = e.gamma;
		if (!s.base) s.base = { beta: b, gamma: g };
		// the rest pose slowly follows how you hold the phone, so only the change reads as parallax
		s.base.beta += (b - s.base.beta) * TILT.recentre;
		s.base.gamma += (g - s.base.gamma) * TILT.recentre;
		s.beta = clamp(b - s.base.beta, TILT.range);
		s.gamma = clamp(g - s.base.gamma, TILT.range);
		const rad = Math.PI / 180;
		// a deliberate tilt (past slideFrom degrees) lets him slide toward the low side
		const over = Math.abs(s.gamma) - TILT.slideFrom;
		onTilt?.({
			x: -Math.sin(s.gamma * rad), // -1..1-ish camera offset; the drop site used x*2.0, y*1.3 world units
			y: Math.sin(s.beta * rad),
			slide: over > 0 ? Math.sign(s.gamma) * over : 0, // degrees past the dead zone; drop site used slide*0.45 as sideways accel
			beta: s.beta, gamma: s.gamma,
		});
	}

	function onMotion(e) {
		const a = e.acceleration;
		if (!a || a.x == null) return;
		s.heard = true;
		const m = Math.hypot(a.x, a.y, a.z);
		if (m > SHAKE.wobble && m > s.peak) { s.peak = m; s.peakVec = [a.x, a.y, a.z]; s.peakAt = performance.now(); }
	}

	// call every frame: acts once on the strongest sample of each burst, after it has peaked
	function tick(now = performance.now()) {
		if (!s.on || !s.peak || now - s.peakAt < 45) return;
		const m = s.peak, d = s.peakVec.map((v) => v / m);
		s.peak = 0;
		if (m < SHAKE.toss) {
			// drop site: angular velocity += (-d.z, rand-0.5, d.x) * strength
			onWobble?.({ dir: d, strength: (m - SHAKE.wobble) * 0.5, magnitude: m });
			return;
		}
		const speed = Math.min(16, (m - SHAKE.toss) * 1.1 + 4);
		// the box moves, he stays put: he flies the opposite way to the phone (plus a little lift)
		onToss?.({ velocity: [-d[0] * speed, -d[1] * speed + 2, -d[2] * speed * 0.6], speed, magnitude: m });
	}

	// returns 'on' | 'denied' | 'framed' (inside an iframe, e.g. a Claude artifact) | 'silent' (no readings) | 'none'
	async function enable() {
		if (s.on) return 'on';
		if (!('DeviceMotionEvent' in window)) return 'none';
		const framed = window.self !== window.top;
		if (framed && document.featurePolicy && !document.featurePolicy.allowsFeature('accelerometer')) return 'framed';
		try {
			if (typeof DeviceMotionEvent.requestPermission === 'function') {
				// both asks must start inside the same tap, so they run side by side
				const [a, b] = await Promise.all([DeviceMotionEvent.requestPermission(), DeviceOrientationEvent.requestPermission?.() ?? 'granted']);
				// inside an embedded frame iOS answers "denied" without ever showing its prompt
				if (a !== 'granted' || b !== 'granted') return framed ? 'framed' : 'denied';
			}
		} catch { return framed ? 'framed' : 'denied'; }
		addEventListener('devicemotion', onMotion);
		addEventListener('deviceorientation', onOrient);
		s.on = true;
		// some hosts never send readings even with permission
		await new Promise((r) => setTimeout(r, 1200));
		if (!s.heard) { stop(); return 'silent'; }
		return 'on';
	}

	function stop() {
		removeEventListener('devicemotion', onMotion);
		removeEventListener('deviceorientation', onOrient);
		s.on = false; s.base = null; s.peak = 0;
	}

	return { enable, tick, stop, get on() { return s.on; }, state: s };
}
