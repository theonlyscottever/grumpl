// The butt hill: the footer scene.
// A giant Grumpl lies face down and his cheek is the hill; a little Grumpl stands on the crest.
// Every so often the little one tips forward at us in one somersault, growing as he falls, and lands face
// down to become the new hill, while the old hill drops away below the frame. The next flavor drops in
// from above, bounces with a twirl and settles. Then it holds. Ported from grumpl/butt/build-butt.py,
// with the cannon physics swapped for a few damped springs.
import * as THREE from 'three';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';
import { buildStudioEnv, makeLightU, makeSet, buildFigure, bodyCompile, loadGLB } from './grumpl-look.js';
import { roomEnv } from './room.js';

const MODEL_URL = new URL('./models/grumpl.glb', import.meta.url).href;

// The cheek: turn the model so `dir` points straight up; apex is the cheek's highest point (model space).
// yaw turns the whole hill so we look at the butt three-quarters on: the crack and the other cheek come into view.
const BUTT = { scale: 7, dir: [0.36, -0.27, -0.89], apex: [0.374, 0.447, -0.496], cheekR: 0.283, yaw: 0.35 };
const BUTT_APEX = new THREE.Vector3(...BUTT.apex);
const BUTT_Q = (() => {                           // cheek normal -> up, his head -> away from us
  const v = new THREE.Vector3(...BUTT.dir).normalize();
  const h = new THREE.Vector3(0, 1, 0).addScaledVector(v, -v.y).normalize();
  const w = h.clone().negate(), u = new THREE.Vector3().crossVectors(v, w);
  return new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(u, v, w).transpose())
    .premultiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), BUTT.yaw));
})();
const REST = new THREE.Vector3(0, 0, 0);          // the crest sits at the origin
const FALL = { grow: 1.15, drop: 1.4 };           // seconds: he falls and grows into the hill; after a beat, the next one drops in at `drop`
const HOLD = 3.5;                                 // seconds the scene holds between change-overs
const STEP = 1 / 120;                             // fixed step, so a debug jump to time t matches the live run
const G = 22;
const SINK = 0.22;                                // how deep his feet press into the cheek
const OCC_LOCAL = [[0, 0.72, 0.02, 0.62], [0, 1.45, -0.05, 0.55], [-0.4, 0.12, 0.12, 0.22], [0.4, 0.12, 0.12, 0.22]]
  .map(([x, y, z, r]) => [new THREE.Vector3(x, y, z), r]);   // his volume (feet at 0), for the soft contact darkening
const KEY = { az: THREE.MathUtils.degToRad(-36), el: THREE.MathUtils.degToRad(50), r: 4.8 };

const AO_GLSL = `
  uniform vec4 uOcc[4];
  float sphereAO( vec3 p, vec3 n ) {
    float o = 0.0;
    for ( int i = 0; i < 4; i ++ ) {
      vec3 d = uOcc[i].xyz - p; float l2 = max( dot( d, d ), 1e-4 ); float r = uOcc[i].w;
      o += clamp( dot( n, d ) * inversesqrt( l2 ), 0.0, 1.0 ) * min( r * r / l2, 1.5 ) * ( 1.0 - smoothstep( r, 2.6 * r, sqrt( l2 ) ) );
    }
    return exp( -1.1 * o );
  }`;
// The dent under his feet: x, y, z = where they press, w = how deep
const DENT_GLSL = `
  uniform vec4 uPress;
  float dentH( vec2 q ) {
    q.y *= 1.25;
    float d = length( q );
    return - uPress.w * exp( - d * d / 0.5 ) + uPress.w * 0.38 * exp( - ( d - 1.0 ) * ( d - 1.0 ) / 0.07 );
  }`;
const DENT_VERTEX = `#include <beginnormal_vertex>
  vec4 dW = modelMatrix * vec4( position, 1.0 );
  vec3 dN = normalize( mat3( modelMatrix ) * objectNormal );
  float dUp = smoothstep( -0.1, 0.6, dN.y ) * smoothstep( uPress.y - 1.0, uPress.y - 0.5, dW.y );
  vec2 dq = dW.xz - uPress.xz;
  float dE = 0.03;
  vec2 dG = vec2( dentH( dq + vec2( dE, 0.0 ) ) - dentH( dq - vec2( dE, 0.0 ) ),
                  dentH( dq + vec2( 0.0, dE ) ) - dentH( dq - vec2( 0.0, dE ) ) ) / ( 2.0 * dE ) * dUp;
  dW.y += dentH( dq ) * dUp;
  objectNormal = normalize( transpose( mat3( modelMatrix ) ) * normalize( dN + vec3( - dG.x, 0.0, - dG.y ) ) );`;

// The hill's body shader: the shared Grumpl look, plus
// - uGrain: a giant keeps the same size of flock fibre and mottle,
// - uSide: the hill is all grazing angles, so the flock's side glow is turned down to keep its colour,
// - the dent under the little one's feet, the soft darkening where he stands, and a melt into white
//   towards the bottom of the frame.
let warned = false;
function hillCompile(U) {
  const base = bodyCompile(U);
  return (sh) => {
    base(sh);
    const fs0 = sh.fragmentShader;
    sh.fragmentShader = sh.fragmentShader
      .replace('uniform float uSssAmt, uGlow, uKeyStrength, uFlock;', 'uniform float uSssAmt, uGlow, uKeyStrength, uFlock, uGrain, uSide;')
      .replace('vec3 fp = vObj * 110.0;', 'vec3 fp = vObj * 110.0 * uGrain;')
      .replace('float mottle = vnoise(vObj * 22.0);', 'float mottle = vnoise(vObj * 22.0 * uGrain);')
      .replace('float side = pow(1.0 - fNV, 2.2) * mix(0.75, 1.25, fleck);', 'float side = pow(1.0 - fNV, 2.2) * mix(0.75, 1.25, fleck) * uSide;');
    if (!warned && !sh.fragmentShader.includes('uGrain, uSide')) { warned = true; console.warn('butt: the hill shader patch did not apply'); }
    if (!sh.fragmentShader.includes('uGrain, uSide')) sh.fragmentShader = 'uniform float uGrain, uSide;\n' + fs0;
    sh.vertexShader = 'varying vec3 vCW, vCN; varying float vSY;\n' + DENT_GLSL + '\n' + sh.vertexShader
      .replace('#include <beginnormal_vertex>', DENT_VERTEX)
      .replace('#include <begin_vertex>', '#include <begin_vertex>\n transformed = ( inverse( modelMatrix ) * dW ).xyz;')
      .replace('#include <worldpos_vertex>',
        '#include <worldpos_vertex>\n vCW = (modelMatrix * vec4(transformed, 1.0)).xyz; vCN = normalize(mat3(modelMatrix) * objectNormal);')
      .replace('#include <project_vertex>', '#include <project_vertex>\n vSY = gl_Position.y / gl_Position.w;');
    sh.fragmentShader = 'varying vec3 vCW, vCN; varying float vSY;\n' + AO_GLSL + '\n' + sh.fragmentShader
      .replace('#include <lights_fragment_end>', `#include <lights_fragment_end>
        { float cAO = sphereAO( vCW, normalize( vCN ) ); reflectedLight.directDiffuse *= cAO; reflectedLight.indirectDiffuse *= cAO; }`)
      .replace('#include <dithering_fragment>', `#include <dithering_fragment>
        gl_FragColor = vec4( mix( gl_FragColor.rgb, vec3( 1.0 ), smoothstep( -0.45, -1.0, vSY ) ), 1.0 );`);
  };
}

const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

export function mountButt(el, { FLAVORS }) {
  const N = FLAVORS.length;
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const coarse = matchMedia('(pointer: coarse)').matches;

  el.classList.add('butt');
  const tag = document.createElement('p');
  tag.className = 'butt-tag';
  tag.textContent = "It's butts all the way down";
  el.appendChild(tag);

  let renderer = null, scene, camera, key, rims, lightU, eyeEnv, rigEnv;
  let littles = [], rigs = [], spare = null, fig = null;
  let ready = false, destroyed = false, visible = false, raf = 0, timer = 0, last = 0, acc = 0;
  let dbg = false, dbgBase = null, frames = 0;
  const pressU = { value: new THREE.Vector4(0, 0, 0, 0) };
  const occU = { value: OCC_LOCAL.map(() => new THREE.Vector4()) };
  const backDirW = new THREE.Vector3(0, 0.25, -1).normalize();
  const _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _a = new THREE.Vector3(), _v = new THREE.Vector3();
  const X_AXIS = new THREE.Vector3(1, 0, 0), Y_AXIS = new THREE.Vector3(0, 1, 0);

  // ---- state ----
  const st = {
    hill: null,                // the rig that is the hill now
    little: 0,                 // the little one's flavor
    phase: 'idle',             // 'idle' | 'busy' (a change-over is running)
    fall: null, drop: null, queued: -1,
    press: { s: 0, v: 0, rest: SINK },
    jelly: 0,
  };

  // ---- build (lazily, when the footer comes near) ----
  async function init() {
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
    } catch (e) {
      el.classList.add('butt-nogl');
      return;
    }
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, coarse ? 1.5 : 2));
    renderer.setClearColor(0xffffff, 0);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.95;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.domElement.setAttribute('aria-hidden', 'true');
    el.insertBefore(renderer.domElement, el.firstChild);

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
    rigEnv = buildStudioEnv(renderer);
    scene.environment = rigEnv;
    eyeEnv = buildStudioEnv(renderer, true);
    key = new THREE.SpotLight(0xfff1e2, 24, 0, Math.PI / 4, 1, 2);
    const flat = Math.cos(KEY.el) * KEY.r;
    key.position.set(Math.sin(KEY.az) * flat, Math.sin(KEY.el) * KEY.r + 0.45, Math.cos(KEY.az) * flat);
    key.target.position.set(0, 0.95, 0);
    scene.add(key, key.target);
    RectAreaLightUniformsLib.init();
    rims = [[-3.2, 20], [3.2, 15]].map(([x, power]) => {
      const r = new THREE.RectAreaLight(0xf2f6ff, power, 0.5, 3);
      r.position.set(x, 2.15, -2.6);
      r.lookAt(0, 1.25, 0);
      scene.add(r);
      return r;
    });
    lightU = makeLightU();

    fig = await loadGLB(MODEL_URL);
    if (destroyed) return;
    littles = FLAVORS.map((f) => {
      const fg = buildFigure(fig, f, lightU, eyeEnv, f.kind === 'gummy' ? (coarse ? 5000 : 9000) : 0);
      fg.group.visible = false;
      scene.add(fg.group);
      return fg;
    });
    rigs = FLAVORS.map((f) => makeRig(f));
    st.hill = rigs[(st.little - 1 + N) % N];
    if (st.hill === rigs[st.little]) st.hill = spareRig();
    settle();
    layout();
    // compile everything now, so the first change-over does not stall
    const shown = [...rigs, spare].filter(Boolean).map((r) => [r.holder, r.holder.visible]).concat(littles.map((l) => [l.group, l.group.visible]));
    shown.forEach(([o]) => { o.visible = true; });
    // the chrome's warm room goes on before compiling, or it would compile twice
    const env = await roomEnv(renderer);
    scene.traverse((o) => { const m = o.material; if (m?.userData.room && !m.envMap) { m.envMap = env; m.needsUpdate = true; } });
    try { renderer.compile(scene, camera); } catch (e) { /* compiles on first draw instead */ }
    shown.forEach(([o, v]) => { o.visible = v; });
    ready = true;
    el.classList.add('butt-ready');
    render();
    wake();
  }

  function makeRig(f) {
    const set = makeSet(f, lightU, eyeEnv);
    Object.assign(set.U, { uGrain: { value: BUTT.scale }, uSide: { value: 0.3 }, uPress: pressU, uOcc: occU });
    set.body.onBeforeCompile = hillCompile(set.U);
    set.body.customProgramCacheKey = () => 'grumpl-hill';
    // a giant gummy is a solid slab of jelly: no see-through (it read as milk over the white page, and the
    // transmission pass is the most expensive thing on a phone); its glow comes from the body shader's sss term
    // and we see the hill at grazing angles, where the gummy's white sheen and softbox reflections washed it out
    if (set.body.transmission > 0) Object.assign(set.body, { transmission: 0, thickness: 0, sheen: 0.1, roughness: 0.42, envMapIntensity: 0.7, specularIntensity: 0.6 });
    const holder = new THREE.Group(), inner = new THREE.Group();
    holder.add(inner);
    holder.visible = false;
    const rootInv = fig.scene.matrixWorld.clone().invert();
    fig.scene.traverse((o) => {
      if (!o.isMesh) return;
      const m = new THREE.Mesh(o.geometry, set[o.name] || set.body);
      m.applyMatrix4(rootInv.clone().multiply(o.matrixWorld));
      inner.add(m);
    });
    scene.add(holder);
    return { holder, inner, set, f };
  }
  function spareRig() { return spare || (spare = makeRig(FLAVORS[0])); }
  function rigFor(i, avoid) { return rigs[i] !== avoid ? rigs[i] : spareRig(); }

  // holder sits at the cheek's apex (so squash and growth happen around it); inner turns and scales him
  function poseRig(r, apexW, q, s) {
    r.holder.position.copy(apexW);
    r.holder.scale.setScalar(1);
    r.inner.quaternion.copy(q);
    r.inner.scale.setScalar(s);
    r.inner.position.copy(BUTT_APEX).multiplyScalar(s).applyQuaternion(q).negate();
    r.set.U.uGrain.value = s;
  }

  // the resting scene: hill at the crest, little one standing in his dent
  function settle() {
    rigs.concat(spare || []).forEach((r) => { r.holder.visible = false; });
    poseRig(st.hill, REST, BUTT_Q, BUTT.scale);
    st.hill.holder.visible = true;
    littles.forEach((l, i) => { l.group.visible = i === st.little; });
    st.fall = null; st.drop = null; st.phase = 'idle';
    st.press.s = 0; st.press.v = 0; st.press.rest = SINK;
    poseLittle();
  }

  // ---- the change-over ----
  function startFall(next, dir = 1) {
    if (st.phase !== 'idle' || !ready) return false;
    const lg = littles[st.little].group;
    const fallRig = rigFor(st.little, st.hill);
    fallRig.f = FLAVORS[st.little];
    const q0 = lg.quaternion.clone();
    const apex0 = BUTT_APEX.clone().applyQuaternion(q0).add(lg.position);   // his own cheek, right now
    st.fall = { t: 0, rig: fallRig, old: st.hill, q0, apex0, next, dir, dropped: false };
    poseRig(fallRig, apex0, q0, 1);
    fallRig.holder.visible = true;
    lg.visible = false;
    st.phase = 'busy';
    return true;
  }
  function updateFall(dt) {
    const f = st.fall;
    f.t += dt;
    const e = Math.min(f.t / FALL.grow, 1);
    if (!f.landed) {
    const ez = e * e * (3 - 2 * e);                  // smooth in and out for the path
    const es = e * e;                                // the zoom speeds up as he comes at us
    // he tips forward toward the screen in one somersault, growing, and lands face down
    _q.slerpQuaternions(f.q0, BUTT_Q, ez);
    _q2.setFromAxisAngle(X_AXIS, Math.PI * 2 * ez);
    _q.premultiply(_q2);
    const s = Math.exp(Math.log(BUTT.scale) * es);
    _a.lerpVectors(f.apex0, REST, ez);
    _a.y += Math.sin(Math.PI * e) * 0.9;
    _a.z += Math.sin(Math.PI * e) * 1.6;
    poseRig(f.rig, _a, _q, s);
    // the old hill falls away beneath him and past the bottom of the screen
    _a.set(0, -11 * es, 2.5 * es);
    poseRig(f.old, _a, BUTT_Q, BUTT.scale * (1 + 0.6 * es));
    }
    // the next little one waits above the frame, then drops onto the new cheek
    if (!f.dropped && f.t >= FALL.drop) {
      f.dropped = true;
      st.little = f.next;
      littles.forEach((l, i) => { l.group.visible = i === st.little; });
      st.drop = { y: 5.5, vy: -3, yaw: 0, w: f.dir * 7, target: f.dir * Math.PI * 2, hit: false, ground: false,
        sq: 0, sqv: 0, tilt: 0, tiltv: 0 };
    }
    if (e >= 1 && !f.landed) {
      f.landed = true;
      f.old.holder.visible = false;
      poseRig(f.rig, REST, BUTT_Q, BUTT.scale);
      st.hill = f.rig;
      st.press.v -= 1.2;                             // the new hill settles with a wobble
    }
    if (f.landed && f.dropped) st.fall = null;
  }
  function updateDrop(dt) {
    const d = st.drop;
    if (!d.ground) {
      d.vy -= G * dt;
      d.y += d.vy * dt;
      if (d.y <= 0) {
        const hit = -d.vy;
        d.y = 0;
        if (hit > 1.2) {
          d.vy = hit * 0.3;
          d.sqv += hit * 0.26;
          d.tiltv += hit * 0.07;
          st.press.v += hit * 0.16;
        } else { d.vy = 0; d.ground = true; }
        d.hit = true;
      }
    }
    // the twirl: spins in the air, then springs round to face us again
    if (!d.hit) d.yaw += d.w * dt;
    else { d.w += (-30 * (d.yaw - d.target) - 6 * d.w) * dt; d.yaw += d.w * dt; }
    d.sqv += (-320 * d.sq - 15 * d.sqv) * dt; d.sq = Math.max(-0.3, Math.min(0.32, d.sq + d.sqv * dt));
    d.tiltv += (-140 * d.tilt - 9 * d.tiltv) * dt; d.tilt += d.tiltv * dt;
    if (d.ground && Math.abs(d.yaw - d.target) < 2e-3 && Math.abs(d.w) < 2e-2 && Math.abs(d.sq) < 2e-3 && Math.abs(d.sqv) < 2e-2
        && Math.abs(d.tilt) < 2e-3 && Math.abs(d.tiltv) < 2e-2 && !st.fall) {
      st.drop = null;
    }
  }
  function updatePress(dt) {
    const p = st.press, d = st.drop;
    const standing = !st.fall || (st.fall.dropped);
    const above = d ? d.y : 0;
    const target = standing ? SINK * (1 - smooth(0, 0.6, above)) : 0;
    p.rest += (target - p.rest) * Math.min(1, dt * 10);
    p.v += (-140 * p.s - 11 * p.v) * dt;
    p.s = Math.max(-0.05, Math.min(0.22, p.s + p.v * dt));
  }
  function poseLittle() {
    const l = littles[st.little];
    if (!l) return;
    const d = st.drop, g = l.group, depth = st.press.rest + st.press.s;
    g.position.set(0, (d ? d.y : 0) - depth, 0);
    g.quaternion.setFromAxisAngle(Y_AXIS, d ? d.yaw : 0);
    if (d) g.quaternion.premultiply(_q.setFromAxisAngle(X_AXIS, d.tilt));
    const sy = 1 - (d ? d.sq : 0);
    g.scale.set(1 / Math.sqrt(sy), sy, 1 / Math.sqrt(sy));
    pressU.value.set(0, 0, 0, Math.max(0, depth));
    // the hill squashes and springs back with the cushion, like jelly
    if ((!st.fall || st.fall.landed) && st.hill) { const j = st.press.s * 0.5; st.hill.holder.scale.set(1 + j * 0.5, 1 - j, 1 + j * 0.5); }
  }
  function busy() {
    const p = st.press;
    return st.phase === 'busy' || Math.abs(p.v) > 1e-3 || Math.abs(p.s) > 1e-3 || Math.abs(p.rest - SINK) > 1e-3;
  }
  function tick(dt) {
    if (st.fall) updateFall(dt);
    if (st.drop) updateDrop(dt);
    updatePress(dt);
    poseLittle();
    if (st.phase === 'busy' && !st.fall && !st.drop) {
      st.phase = 'idle';
      if (st.queued >= 0) { const q = st.queued; st.queued = -1; if (q !== st.little) go(q); }
    }
  }
  function advance(dt) {
    acc += dt;
    while (acc >= STEP) { tick(STEP); acc -= STEP; }
  }

  // ---- drawing ----
  function render() {
    if (!ready || destroyed) return;
    const vm = camera.matrixWorldInverse;
    const g = littles[st.little].group;
    lightU.uKeyPosV.value.copy(key.position).applyMatrix4(vm);
    rims.forEach((r, i) => lightU.uRimDirV.value[i].copy(_v.copy(r.position).sub(g.position).normalize().transformDirection(vm)));
    lightU.uBackDirV.value.copy(backDirW).transformDirection(vm);
    g.updateMatrixWorld(true);
    const show = g.visible ? 1 : 0;
    OCC_LOCAL.forEach(([p, r], i) => { _v.copy(p).applyMatrix4(g.matrixWorld); occU.value[i].set(_v.x, _v.y, _v.z, r * show); });
    renderer.render(scene, camera);
    frames++;
  }
  function layout() {
    if (!renderer) return;
    const w = el.clientWidth || 1, h = el.clientHeight || 1;
    renderer.setSize(w, h, false);
    const aspect = w / h;
    camera.aspect = aspect;
    const tanH = Math.tan(THREE.MathUtils.degToRad(16));
    const portrait = aspect < 0.9;
    // shot like the prototype: nearly level, he stands a little above the middle, the cheek a round mound
    // under him that melts away into the page
    const dist = portrait ? Math.max(10, 2.6 / (2 * tanH * aspect)) : 8.6;
    camera.position.set(0, 1.7, dist);
    camera.lookAt(0, portrait ? 0.72 : 0.55, 0);
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();
  }

  // ---- running: only while on screen, and only while something moves ----
  function frame(now) {
    raf = 0;
    if (!visible || destroyed || dbg) return;
    const dt = Math.min((now - last) / 1000, 1 / 20);
    last = now;
    advance(dt);
    render();
    if (busy()) raf = requestAnimationFrame(frame);
    else schedule();
  }
  function loop() {
    if (raf || !visible || !ready || destroyed || dbg) return;
    clearTimeout(timer); timer = 0;
    last = performance.now();
    raf = requestAnimationFrame(frame);
  }
  function schedule() {
    clearTimeout(timer); timer = 0;
    if (reduceMotion || !visible || !ready || dbg || busy() || document.hidden) return;
    timer = setTimeout(() => { timer = 0; go((st.little + 1) % N); }, HOLD * 1000);
  }
  function wake() { if (busy()) loop(); else { render(); schedule(); } }
  addEventListener('grumpl-room-ready', () => { if (ready && visible) render(); });   // the chrome finish's warm room arrived
  function go(next, dir) {
    if (dir === undefined) dir = Math.random() < 0.5 ? -1 : 1;
    if (startFall(next, dir)) loop();
  }

  // tap: the next change-over now, unless one is running
  const onClick = () => { if (ready && st.phase === 'idle' && !dbg) go((st.little + 1) % N); };
  el.addEventListener('click', onClick);

  const near = new IntersectionObserver((es) => {
    if (es.some((e) => e.isIntersecting)) { near.disconnect(); init().catch((e) => console.error('butt', e)); }
  }, { rootMargin: '300px 0px' });
  near.observe(el);
  const seen = new IntersectionObserver((es) => {
    visible = es[es.length - 1].isIntersecting;
    if (visible) wake();
    else { cancelAnimationFrame(raf); raf = 0; clearTimeout(timer); timer = 0; }
  });
  seen.observe(el);
  const onVis = () => { if (document.hidden) { clearTimeout(timer); timer = 0; } else if (visible) wake(); };
  document.addEventListener('visibilitychange', onVis);
  const ro = new ResizeObserver(() => { if (ready) { layout(); render(); } });
  ro.observe(el);

  // debug: jump to time t of a change-over (starting from the scene as it stood when first called)
  const debug = {
    get state() { return { phase: st.phase, little: st.little, hill: st.hill && st.hill.f.id, ready, frames, visible, raf: !!raf, timer: !!timer }; },
    whenReady: () => new Promise((res) => { const c = () => (ready ? res(true) : setTimeout(c, 100)); c(); }),
    stepTo(t, next) {
      if (!ready) return false;
      dbg = true; cancelAnimationFrame(raf); raf = 0; clearTimeout(timer); timer = 0;
      if (!dbgBase) dbgBase = { little: st.little, hill: st.hill };
      st.little = dbgBase.little; st.hill = dbgBase.hill;
      settle(); acc = 0;
      if (t > 0) { startFall(next ?? (st.little + 1) % N, 1); advance(t); }
      render();
      return debug.state;
    },
    rebase() { dbgBase = null; },
    resume() { dbg = false; dbgBase = null; wake(); },
  };
  window.__butt = debug;

  return {
    // show flavor i on the crest: plays a change-over when on screen, snaps when not
    setFlavor(i) {
      i = ((i % N) + N) % N;
      if (!ready) { st.little = i; return; }
      if (i === st.little) return;
      if (st.phase !== 'idle') { st.queued = i; return; }
      if (visible && !document.hidden) { go(i); return; }
      st.hill = rigFor((i - 1 + N) % N, null);
      if (st.hill === rigs[i]) st.hill = spareRig();
      st.little = i;
      settle();
    },
    destroy() {
      destroyed = true;
      cancelAnimationFrame(raf); clearTimeout(timer);
      near.disconnect(); seen.disconnect(); ro.disconnect();
      document.removeEventListener('visibilitychange', onVis);
      el.removeEventListener('click', onClick);
      if (window.__butt === debug) delete window.__butt;
      if (renderer) {
        scene.traverse((o) => { if (o.isMesh || o.isInstancedMesh) { if (o.material.dispose) o.material.dispose(); } });
        rigEnv?.dispose(); eyeEnv?.dispose();
        renderer.dispose(); renderer.forceContextLoss(); renderer.domElement.remove();
      }
      tag.remove();
      el.classList.remove('butt', 'butt-ready', 'butt-nogl');
    },
  };
}
