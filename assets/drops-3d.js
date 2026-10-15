// The Grumpl inside his box, for the flavor popup: the drop site's own 3D view, as is.
// One renderer, carried into whichever popup is open.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';
import { MeshSurfaceSampler } from 'three/addons/math/MeshSurfaceSampler.js';

// One renderer, carried into whichever flavor popup is open. Lighting and the airbrushed
// body shader come from the Grumpl light study prototype, trimmed for a card-sized view.
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: false });
const DPR = Math.min(devicePixelRatio, matchMedia('(pointer: coarse)').matches ? 1.5 : 1.75);
renderer.setPixelRatio(DPR);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.95;
renderer.outputColorSpace = THREE.SRGBColorSpace;
const canvas = renderer.domElement;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xffffff);
const camera = new THREE.PerspectiveCamera(24, 1, 0.1, 50);
const LOOK = new THREE.Vector3(0, 0.98, 0);
camera.position.set(0, 1.35, 6.6);
camera.lookAt(LOOK);

function studioEnv(eyesOnly = false) {
	const env = new THREE.Scene();
	if (!eyesOnly) env.add(new THREE.Mesh(new THREE.BoxGeometry(24, 24, 24), new THREE.ShaderMaterial({
		side: THREE.BackSide, toneMapped: false,
		vertexShader: 'varying float vY; void main(){ vY = position.y; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
		fragmentShader: 'varying float vY; void main(){ gl_FragColor = vec4(vec3(mix(0.45, 0.30, smoothstep(-2.0, 2.0, vY))), 1.0); }'
	})));
	const panel = (w, h, pos, L, hex) => {
		const m = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide, toneMapped: false });
		m.color.set(hex).multiplyScalar(L);
		const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), m);
		p.position.set(...pos); p.lookAt(0, 1, 0); env.add(p);
	};
	if (eyesOnly) { panel(2.2, 1.4, [0, 7, 1], 4.0, 0xffffff); panel(1.2, 1.2, [-5, 4, 4], 3.0, 0xffffff); }
	else {
		panel(6, 4, [0, 7, 1], 3.0, 0xfff4e8);
		panel(3, 3, [-5, 4, 4], 2.5, 0xfff4e8);
		panel(0.8, 5, [-4.5, 2.5, -3.5], 12, 0xf2f6ff);
		panel(0.8, 5, [4.5, 2.5, -3.5], 10, 0xf2f6ff);
		panel(5, 2.5, [0, 0.4, 4.5], 0.5, 0xffffff);
		panel(3, 3, [5, 1.5, 2], 0.35, 0xffffff);
		panel(4, 3, [0, 1.5, -6], 3.0, 0xfff8f0);
	}
	const pm = new THREE.PMREMGenerator(renderer);
	const tex = pm.fromScene(env, 0.035).texture; pm.dispose(); return tex;
}
scene.environment = studioEnv();
const eyeEnv = studioEnv(true);
scene.add(new THREE.HemisphereLight(0xffffff, 0xf3ece6, 0.05));
const key = new THREE.DirectionalLight(0xfff1e0, 1.5);
scene.add(key, key.target);
key.target.position.copy(LOOK);
RectAreaLightUniformsLib.init();
[[-3.2, 20], [3.2, 16]].forEach(([x, p]) => { const r = new THREE.RectAreaLight(0xf2f6ff, p, 0.5, 3); r.position.set(x, 2, -2.6); r.lookAt(0, 1.1, 0); scene.add(r); });

const EYES = { color: 0x080809, roughness: 0.05, clearcoat: 1, clearcoatRoughness: 0.02, specularIntensity: 1, envMapIntensity: 1 };
const TEETH = { color: 0xf6f0e3, roughness: 0.5, envMapIntensity: 0.9 };
const BODY = {
	vinyl:  { roughness: 0.62, specularIntensity: 0.5, sheen: 0.6, sheenRoughness: 0.5, sheenColor: 0xffe0d4, envMapIntensity: 0.6 },
	chrome: { roughness: 0.14, metalness: 1, envMapIntensity: 1.25 },
	flock:  { roughness: 1, specularIntensity: 0, sheen: 1, sheenRoughness: 0.75, sheenColor: 0xd8ffd0, envMapIntensity: 0.9 },
	gummy:  { roughness: 0.3, transmission: 0.55, thickness: 1.4, ior: 1.47, attenuationColor: 0xff3347, attenuationDistance: 0.8,
		specularIntensity: 1, envMapIntensity: 1.3, sheen: 0.5, sheenRoughness: 0.7, sheenColor: 0xffffff },
};
const BASE = { color: 0xffffff, roughness: 0.5, metalness: 0, sheen: 0, sheenRoughness: 1, sheenColor: 0x000000, clearcoat: 0, clearcoatRoughness: 0,
	specularIntensity: 1, transmission: 0, thickness: 0, ior: 1.5, attenuationColor: 0xffffff, attenuationDistance: Infinity, envMapIntensity: 1 };
const mats = { body: new THREE.MeshPhysicalMaterial(), eyes: new THREE.MeshPhysicalMaterial(), teeth: new THREE.MeshPhysicalMaterial() };
mats.eyes.envMap = eyeEnv;
mats.eyes.onBeforeCompile = (sh) => {
	sh.fragmentShader = sh.fragmentShader.replace('#include <lights_fragment_begin>',
		THREE.ShaderChunk.lights_fragment_begin.replace('defined( RE_Direct_RectArea )', 'defined( RE_Direct_RectArea ) && 0'));
};
mats.eyes.customProgramCacheKey = () => 'grumpl-eyes';

// airbrush: the secondary hue pools in the crevices (baked AO in COLOR_0.g) and dusts ears, hands, feet (COLOR_0.r = thinness)
const U = { uBase: { value: new THREE.Color() }, uEdge: { value: new THREE.Color() }, uBelly: { value: new THREE.Color() },
	uAir: { value: 1 }, uGlow: { value: 0 }, uLocal: { value: new THREE.Matrix4() } };
mats.body.onBeforeCompile = (sh) => {
	Object.assign(sh.uniforms, U);
	sh.vertexShader = sh.vertexShader
		.replace('#include <common>', `#include <common>
			attribute vec4 color; uniform mat4 uLocal;
			varying float vThin; varying float vAo; varying vec3 vObj; varying vec3 vObjN;`)
		.replace('#include <begin_vertex>', `#include <begin_vertex>
			vThin = color.r; vAo = color.g;
			vObj = (uLocal * vec4(position, 1.0)).xyz; vObjN = normalize(mat3(uLocal) * objectNormal);`);
	sh.fragmentShader = sh.fragmentShader
		.replace('#include <common>', `#include <common>
			uniform vec3 uBase, uEdge, uBelly; uniform float uAir, uGlow;
			varying float vThin; varying float vAo; varying vec3 vObj; varying vec3 vObjN; float crevice;`)
		.replace('#include <color_fragment>', `
			float thin = smoothstep(0.03, 0.55, vThin);
			float feet = 1.0 - smoothstep(0.05, 0.35, vObj.y);
			float crown = smoothstep(1.55, 2.0, vObj.y);
			float edgeAmt = clamp(max(thin, max(feet * 0.8, crown * 0.6)), 0.0, 1.0);
			float belly = smoothstep(0.2, 0.9, vObjN.z) * (1.0 - smoothstep(0.25, 0.7, abs(vObj.x)))
				* smoothstep(0.15, 0.5, vObj.y) * (1.0 - smoothstep(1.05, 1.3, vObj.y));
			crevice = (1.0 - smoothstep(0.3, 0.95, vAo)) * uAir;
			float airbrush = clamp(max(crevice, edgeAmt * 0.45 * uAir), 0.0, 1.0);
			diffuseColor.rgb = mix(mix(uBase, uEdge, airbrush), uBelly, belly * 0.6 * uAir);`)
		.replace('#include <lights_fragment_end>', `#include <lights_fragment_end>
			{
				float through = mix(0.3, 1.0, smoothstep(0.0, 0.6, vThin));
				totalEmissiveRadiance += uBase * uGlow * through;
				totalEmissiveRadiance += uEdge * crevice * 0.12;
				float occ = mix(0.55, 1.0, smoothstep(0.0, 0.9, vAo));
				reflectedLight.indirectDiffuse *= occ;
				reflectedLight.indirectSpecular *= mix(0.6, 1.0, occ);
			}`);
};
mats.body.customProgramCacheKey = () => 'grumpl-body';

// rig = where physics puts him (position + tumble); spin = the drag / idle turn inside it
const rig = new THREE.Group(), spin = new THREE.Group();
rig.add(spin); scene.add(rig);
let sugar = null;

// the inside of his box: five walls, the open side is your screen. No ground shadow by design;
// all the shading budget goes to the light on his body.
const BOX = { x: 1.55, z: 1.25, top: 3.0 };
// unlit, so each face is just a soft tone of the flavor: sides a touch deeper than the back, floor brightest
const wallMats = [0.93, 0.93, 0.96, 1.0, 1, 0.97].map((l) => { const m = new THREE.MeshBasicMaterial({ side: THREE.BackSide, toneMapped: false }); m.userData.l = l; return m; });
wallMats[4].visible = false; // +z face: the window you look through
const box = new THREE.Mesh(new THREE.BoxGeometry(BOX.x * 2, BOX.top, BOX.z * 2), wallMats);
box.position.y = BOX.top / 2;
scene.add(box);

function applyFlavor(f) {
	const body = BODY[f.kind] || BODY.vinyl;
	for (const [part, spec0] of [['body', body], ['eyes', EYES], ['teeth', TEETH]]) {
		const spec = { ...BASE, ...spec0 }, m = mats[part];
		for (const [k, v] of Object.entries(spec)) { if (m[k] && m[k].isColor) m[k].set(v); else m[k] = v; }
		m.needsUpdate = true;
	}
	U.uBase.value.set(f.base); U.uEdge.value.set(f.edge); U.uBelly.value.set(f.belly);
	U.uAir.value = f.kind === 'chrome' ? 0.35 : 1;
	U.uGlow.value = f.kind === 'gummy' ? 0.28 : f.kind === 'vinyl' ? 0.04 : 0;
	if (f.kind === 'chrome') mats.body.color.set(f.base);
	if (sugar) sugar.visible = f.kind === 'gummy';
	scene.background.set(f.soft);
	const wall = new THREE.Color(f.soft).lerp(new THREE.Color(0xffffff), 0.2);
	wallMats.forEach((m) => m.color.copy(wall).multiplyScalar(m.userData.l));
	kick = 3;
}

function sugarCoat(mesh, count = 16000) {
	const sampler = new MeshSurfaceSampler(mesh).build();
	const s = new THREE.Vector3(); mesh.getWorldScale(s); const unit = 1 / s.x;
	const inst = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.12, envMapIntensity: 2.5 }), count);
	const p = new THREE.Vector3(), n = new THREE.Vector3(), q = new THREE.Quaternion(), e = new THREE.Euler(), sc = new THREE.Vector3(), m4 = new THREE.Matrix4();
	for (let i = 0; i < count; i++) {
		sampler.sample(p, n);
		const size = (0.003 + Math.random() * 0.005) * unit;
		p.addScaledVector(n, size * 0.25);
		q.setFromEuler(e.set(Math.random() * 6.3, Math.random() * 6.3, Math.random() * 6.3));
		sc.set(size, size * (0.7 + Math.random() * 0.5), size * (0.7 + Math.random() * 0.5));
		inst.setMatrixAt(i, m4.compose(p, q, sc));
	}
	mesh.add(inst); sugar = inst; sugar.visible = false;
}

// light: steer with the pointer, kept in a flattering range (front, ±60° az, 30–60° el)
const lightT = { az: 0.6, el: 0.9 }, lightC = { az: 0.6, el: 0.9 };
function placeKey() {
	const r = 6;
	key.position.set(Math.sin(lightC.az) * Math.cos(lightC.el) * r, Math.sin(lightC.el) * r + 0.5, Math.cos(lightC.az) * Math.cos(lightC.el) * r);
}
placeKey();

/* ---------- physics: a weeble in a box ----------
   p = his middle (1 unit above the feet), v = velocity, w = tumble (angular velocity).
   He is treated as a stubby capsule: 1.0 tall from the middle, 0.62 wide. Gravity pulls him down,
   a strong righting spring pops him back up on the floor, and the floor is a shallow bowl
   so he always wanders back to the middle of the box. */
const X = new THREE.Vector3(1, 0, 0), Y = new THREE.Vector3(0, 1, 0), Z = new THREE.Vector3(0, 0, 1), t2 = new THREE.Vector3();
const P = { g: 22, rest: 0.34, half: 1.0, wide: 0.62 };
const p = new THREE.Vector3(0, P.half, 0), v = new THREE.Vector3(), w = new THREE.Vector3();
const tmp = new THREE.Vector3(), up = new THREE.Vector3(), dq = new THREE.Quaternion(), ID = new THREE.Quaternion();
let grounded = true, tiltG = 0, lastBump = 0;
const ext = (n) => { const c = Math.abs(up.dot(n)); return P.half * c + P.wide * Math.sqrt(Math.max(0, 1 - c * c)); };
function bump(n, sign, axisLimit, k) {
	// keep him inside one pair of walls along axis n; returns impact speed
	const e = ext(n), pos = p.dot(n);
	const lim = sign > 0 ? axisLimit - e : axisLimit + e;
	if (sign > 0 ? pos <= lim : pos >= lim) return 0;
	p.addScaledVector(n, lim - pos);
	const vn = v.dot(n);
	if (sign > 0 ? vn <= 0 : vn >= 0) return 0;
	const hit = Math.abs(vn);
	v.addScaledVector(n, -vn * (1 + (hit < 1.4 ? 0 : P.rest)));
	w.add(t2.copy(n).multiplyScalar(-sign).cross(v).multiplyScalar(0.35 * k)); // glancing hits roll him
	return hit;
}
function step(dt) {
	up.copy(Y).applyQuaternion(rig.quaternion);
	v.y -= P.g * dt;
	v.x += tiltG * dt;
	p.addScaledVector(v, dt);
	let hit = 0;
	const floorHit = bump(Y, -1, 0, 1);
	grounded = p.y - ext(Y) < 0.02;
	hit = Math.max(hit, floorHit, bump(Y, 1, BOX.top, 1),
		bump(X, 1, BOX.x, 1), bump(X, -1, -BOX.x, 1),
		bump(Z, 1, BOX.z, 1), bump(Z, -1, -BOX.z, 1));
	if (grounded) {
		const f = Math.min(1, dt * 7); v.x -= v.x * f; v.z -= v.z * f;     // floor friction
		v.x -= p.x * 5 * dt; v.z -= p.z * 5 * dt;                           // the bowl
		w.add(tmp.copy(up).cross(Y).multiplyScalar(46 * dt));             // weeble righting
		w.multiplyScalar(Math.exp(-dt * 5.5));
		if (w.lengthSq() < 2.5 && v.lengthSq() < 1.5) rig.quaternion.slerp(ID, 1 - Math.exp(-dt * 3.2)); // face front again
	} else {
		w.add(tmp.copy(up).cross(Y).multiplyScalar(5 * dt));
		w.multiplyScalar(Math.exp(-dt * 0.5));
	}
	const a = w.length();
	if (a > 1e-5) rig.quaternion.premultiply(dq.setFromAxisAngle(tmp.copy(w).divideScalar(a), a * dt)).normalize();
	up.copy(Y).applyQuaternion(rig.quaternion);
	rig.position.copy(p).addScaledVector(up, -P.half);
	if (hit > 3 && motion.on && performance.now() - lastBump > 90) { navigator.vibrate?.(Math.min(28, hit * 2.2) | 0); lastBump = performance.now(); }
}
function throwHim(dx, dy, dz, spinAmt = 1) {
	v.add(tmp.set(dx, dy, dz));
	w.add(tmp.set(dz * 0.6 + (Math.random() - 0.5) * 2, (Math.random() - 0.5) * 3, -dx * 0.8).multiplyScalar(0.55 * spinAmt));
	idle = 0; kick = 3;
}
const awake = () => v.lengthSq() > 4e-4 || w.lengthSq() > 4e-4 || !grounded || 1 - Math.abs(rig.quaternion.dot(ID)) > 1e-6 || Math.abs(p.x) + Math.abs(p.z) > 2e-3;
function resetBody() { p.set(0, P.half, 0); v.set(0, 0, 0); w.set(0, 0, 0); rig.quaternion.identity(); rig.position.set(0, 0, 0); }

/* ---------- motion: tilt = look around inside the box, a real shake = jostle / throw ---------- */
const motion = { on: false, heard: false, base: null, beta: 0, gamma: 0, peak: 0, peakVec: new THREE.Vector3(), peakAt: 0 };
const camT = new THREE.Vector2(), camC = new THREE.Vector2();
function onOrient(e) {
	if (e.beta == null) return;
	motion.heard = true;
	const b = e.beta, gm = e.gamma;
	if (!motion.base) motion.base = { beta: b, gamma: gm };
	// the rest pose slowly follows how you hold the phone, so only the change reads as parallax
	motion.base.beta += (b - motion.base.beta) * 0.012;
	motion.base.gamma += (gm - motion.base.gamma) * 0.012;
	motion.beta = THREE.MathUtils.clamp(b - motion.base.beta, -35, 35);
	motion.gamma = THREE.MathUtils.clamp(gm - motion.base.gamma, -35, 35);
	camT.set(-Math.sin(motion.gamma * Math.PI / 180) * 2.0, Math.sin(motion.beta * Math.PI / 180) * 1.3);
	// a deliberate tilt (past 12°) lets him slide toward the low side
	const g = Math.abs(motion.gamma) > 12 ? Math.sign(motion.gamma) * (Math.abs(motion.gamma) - 12) : 0;
	tiltG = g * 0.45;
}
const SHAKE = { wobble: 7, toss: 14 }; // m/s² of the phone's own acceleration (gravity removed)
function onMotion(e) {
	const a = e.acceleration;
	if (!a || a.x == null) return;
	motion.heard = true;
	const m = Math.hypot(a.x, a.y, a.z);
	if (m > SHAKE.wobble && m > motion.peak) { motion.peak = m; motion.peakVec.set(a.x, a.y, a.z); motion.peakAt = performance.now(); }
}
function applyShake(now) {
	// act on the strongest sample of each burst, once the burst has peaked
	if (!motion.peak || now - motion.peakAt < 45) return;
	const m = motion.peak, d = motion.peakVec.divideScalar(m);
	motion.peak = 0;
	if (m < SHAKE.toss) { w.add(tmp.set(-d.z, (Math.random() - 0.5), d.x).multiplyScalar((m - SHAKE.wobble) * 0.5)); kick = 3; return; }
	const s = Math.min(16, (m - SHAKE.toss) * 1.1 + 4);
	// the box moves, he stays put: he flies the opposite way to the phone
	throwHim(-d.x * s, -d.y * s + 2, -d.z * s * 0.6, 1.4);
}
async function enableMotion() {
	if (motion.on) return 'on';
	if (!('DeviceMotionEvent' in window)) return 'none';
	const framed = window.self !== window.top;
	// Chrome can say up front when the embedding frame doesn't allow sensors
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
	motion.on = true;
	// some hosts (an embedded frame, a desktop) never send readings even with permission
	await new Promise((r) => setTimeout(r, 1200));
	if (!motion.heard) { removeEventListener('devicemotion', onMotion); removeEventListener('deviceorientation', onOrient); motion.on = false; return 'silent'; }
	return 'on';
}

let slot = null, active = false, ready = false, flavor = null, vel = 0.0, drag = null, idle = 0, kick = 3;
const autoSpin = 0.35;
function resize() {
	if (!slot) return;
	const w = slot.clientWidth, h = slot.clientHeight;
	if (!w || !h) return;
	renderer.setSize(w, h, false);
	camera.aspect = w / h;
	// keep the box filling a tall phone frame as well as a square desktop one
	camera.fov = camera.aspect < 0.95 ? 24 / Math.max(0.72, camera.aspect) : 24;
	// a tall phone frame gets a narrower box so its side walls stay in view
	BOX.x = camera.aspect < 0.95 ? 1.2 : 1.55; box.scale.x = BOX.x / 1.55;
	camera.updateProjectionMatrix(); kick = 3;
}
const ro = new ResizeObserver(resize);

// drag sideways to spin him; flick fast to throw him (works without motion sensors too)
const trail = [];
canvas.addEventListener('pointerdown', (e) => { drag = { x: e.clientX }; trail.length = 0; trail.push([e.clientX, e.clientY, e.timeStamp]); canvas.setPointerCapture(e.pointerId); vel = 0; });
canvas.addEventListener('pointermove', (e) => {
	const r = canvas.getBoundingClientRect();
	const nx = (e.clientX - r.left) / r.width * 2 - 1, ny = (e.clientY - r.top) / r.height * 2 - 1;
	lightT.az = THREE.MathUtils.clamp(-nx * 1.05, -1.05, 1.05);
	lightT.el = THREE.MathUtils.clamp(0.79 - ny * 0.26, 0.52, 1.05);
	if (e.pointerType === 'mouse' && !motion.on) camT.set(-nx * 0.35, -ny * 0.2);
	kick = 3;
	if (!drag) return;
	trail.push([e.clientX, e.clientY, e.timeStamp]); if (trail.length > 6) trail.shift();
	const dx = e.clientX - drag.x; drag.x = e.clientX;
	spin.rotation.y += dx * 0.012; vel = dx * 0.012 * 60; idle = 0;
});
const endDrag = (e) => {
	if (!drag) return;
	drag = null;
	const a = trail[0], b = trail[trail.length - 1];
	if (!a || b === a) return;
	const ms = Math.max(8, b[2] - a[2]);
	if (e.timeStamp - b[2] > 80) return; // stopped before letting go
	const vx = (b[0] - a[0]) / ms, vy = (b[1] - a[1]) / ms; // px per ms
	const sp = Math.hypot(vx, vy);
	if (sp > 1.1) { const s = Math.min(1.8, sp) * 7; throwHim(vx / sp * s, -vy / sp * s + 3, -2, 1); vel *= 0.3; }
};
canvas.addEventListener('pointerup', endDrag);
canvas.addEventListener('pointercancel', () => { drag = null; });

let last = performance.now();
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
function frame(now) {
	requestAnimationFrame(frame);
	const dt = Math.min(1 / 30, (now - last) / 1000); last = now;
	if (!ready || !slot || !active) return;
	if (motion.on) applyShake(now);
	const phys = awake();
	if (phys) { const n = dt > 1 / 70 ? 2 : 1; for (let i = 0; i < n; i++) step(dt / n); }
	let moving = phys || drag || kick > 0;
	if (!drag) {
		idle += dt;
		const target = reduce ? 0 : autoSpin;
		vel += (target - vel) * Math.min(1, dt * (idle > 1.2 ? 1.5 : 0.4));
		spin.rotation.y += vel * dt;
		if (Math.abs(vel) > 1e-3) moving = true;
	}
	const ease = Math.min(1, dt * 4), ec = Math.min(1, dt * 6);
	if (Math.abs(lightT.az - lightC.az) + Math.abs(lightT.el - lightC.el) > 1e-4) moving = true;
	lightC.az += (lightT.az - lightC.az) * ease;
	lightC.el += (lightT.el - lightC.el) * ease;
	if (camT.distanceTo(camC) > 1e-4) moving = true;
	camC.lerp(camT, ec);
	if (!moving) return; // nothing changed: skip the frame entirely
	kick = Math.max(0, kick - 1);
	placeKey();
	camera.position.set(camC.x, 1.35 + camC.y, 7.2);
	camera.lookAt(LOOK);
	renderer.render(scene, camera);
}
requestAnimationFrame(frame);

window.Grumpl3D = {
	mount(el, f) {
		slot = el; flavor = f;
		el.querySelector('.wait')?.toggleAttribute('hidden', ready);
		el.appendChild(canvas);
		ro.disconnect(); ro.observe(el);
		resize();
		if (ready) { applyFlavor(f); arrive(); }
	},
	unmount() { slot = null; ro.disconnect(); canvas.remove(); },
	setActive(on) { active = on; kick = 3; },
	enableMotion,
	get motionOn() { return motion.on; },
	async still(f, angle) {
		const keep = { rot: spin.rotation.y, az: lightC.az, el: lightC.el, q: rig.quaternion.clone(), pos: rig.position.clone(), aspect: camera.aspect, fov: camera.fov };
		renderer.setPixelRatio(1); renderer.setSize(640, 640, false);
		camera.aspect = 1; camera.fov = 24; camera.updateProjectionMatrix();
		camera.position.set(0, 1.35, 6.6); camera.lookAt(LOOK);
		box.visible = false; rig.quaternion.identity(); rig.position.set(0, 0, 0);
		applyFlavor(f); spin.rotation.y = angle; lightC.az = 0.6; lightC.el = 0.9; placeKey();
		renderer.render(scene, camera);
		const url = canvas.toDataURL('image/webp', 0.9);
		box.visible = true; rig.quaternion.copy(keep.q); rig.position.copy(keep.pos);
		renderer.setPixelRatio(DPR);
		spin.rotation.y = keep.rot; lightC.az = keep.az; lightC.el = keep.el;
		if (flavor) applyFlavor(flavor);
		resize();
		await new Promise((r) => setTimeout(r, 30));
		return url;
	},
};
// a new flavor drops in from the top of the box and lands with a little bounce
function arrive() { resetBody(); spin.rotation.y = -1.6; vel = 3.2; idle = 0; p.y = BOX.top - 1.1; v.set(0, -2, 0); w.set(0, 0, 1.2); kick = 3; }
active = true;


async function unpack() { return (await fetch('assets/models/grumpl.glb')).arrayBuffer(); }
unpack().then((buf) => new GLTFLoader().parse(buf, '', (gltf) => {
	gltf.scene.updateMatrixWorld(true);
	const rootInv = gltf.scene.matrixWorld.clone().invert();
	const found = [];
	gltf.scene.traverse((o) => { if (o.isMesh) found.push(o); });
	found.forEach((o) => {
		if (!o.geometry.attributes.normal) o.geometry.computeVertexNormals();
		if (o.name === 'body') U.uLocal.value.copy(rootInv).multiply(o.matrixWorld);
		o.material = mats[o.name] || mats.body;
		if (o.material === mats.body) sugarCoat(o);
	});
	spin.add(gltf.scene);
	ready = true;
	if (slot) { slot.querySelector('.wait')?.setAttribute('hidden', ''); applyFlavor(flavor); arrive(); }
	dispatchEvent(new Event('grumpl3d-ready'));
}, (err) => console.error(err))).catch((err) => {
	console.error(err);
	if (slot) slot.querySelector('.wait').textContent = 'The 3D view could not load.';
});
