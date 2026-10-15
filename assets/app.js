// Grumpl landing: the hero stage.
// Built from the Light Study (v26): same body shader, cloud shading and physics, with
// - one fixed product-photography light (no cursor light),
// - the newest drop on a turntable of clouds (focused one in the middle, the others further back),
// - the brand-book logo pressed into one foreground cloud,
// - a page tint taken from the focused Grumpl's secondary color.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as CANNON from 'cannon-es';
import { MeshSurfaceSampler } from 'three/addons/math/MeshSurfaceSampler.js';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';
import { DROP, FLAVORS } from './drop.js';
import { initUI } from './ui.js';
import { createMotion, canMove, haptic } from './motion.js';

const HULL = {"v":[[-0.3237,0.0,0.1173],[0.5271,1.9964,-0.329],[0.9383,0.6757,0.0653],[-0.1516,1.2282,0.56],[-0.4956,1.9708,-0.3318],[0.2007,0.5576,-0.5524],[-0.9294,0.7082,0.1177],[0.2442,0.4608,0.5809],[0.4813,0.0073,-0.0364],[0.0212,1.9077,0.2427],[-0.4673,0.585,-0.4272],[0.0209,1.7802,-0.6516],[-0.3224,0.6529,0.5423],[0.3647,1.4639,0.4544],[-0.3369,1.626,0.3886],[0.4025,1.5924,-0.5027],[-0.3495,1.5827,-0.5076],[0.501,1.7099,0.1171],[0.4827,0.333,-0.3489],[-0.2092,0.2646,-0.4104],[-0.118,0.3431,0.5525],[0.013,1.6479,0.5067],[-0.1505,0.5936,-0.5573],[-0.0102,0.7329,0.6432],[0.3602,0.0024,0.2699],[0.2938,1.7752,0.3555],[0.1704,1.2287,0.5663],[0.4872,0.6315,-0.4523],[-0.2741,1.8422,0.2349],[0.3307,0.7125,0.5626],[-0.2687,0.0128,-0.1393],[0.2524,0.3158,-0.4574],[-0.4396,0.3542,-0.3639],[-0.1151,1.7982,0.3936],[-0.3222,0.4259,0.5003],[0.0016,0.5144,0.6415],[-0.1851,1.5292,0.5017],[0.5453,0.0098,0.1634],[-0.3063,0.4402,-0.501],[0.0354,1.9571,0.045],[0.2219,1.6036,0.4907],[0.0829,0.3333,0.5636],[0.0901,1.8083,0.4009],[0.3715,0.4699,-0.5024],[0.2882,0.0011,-0.0808],[-0.436,0.0105,-0.039],[0.1542,0.6235,0.638],[0.239,1.8843,0.2146],[0.4038,0.4522,0.4856],[-0.1533,0.6155,0.624],[-0.5062,0.0092,0.1347],[-0.4068,1.7179,0.224],[0.4395,1.682,0.2825],[0.2642,1.5104,-0.5724],[-0.313,0.6173,-0.5254],[-0.393,0.0085,0.2644],[-0.8881,0.6296,-0.0163],[-0.2035,1.6811,0.4564],[-0.1308,1.9071,0.1972],[0.3962,0.0001,0.1135],[0.3565,1.6414,0.4093],[0.0158,1.2311,0.5803],[-0.1528,0.4394,-0.5236],[0.3417,0.6186,-0.5321]],"f":[[6,4,56],[16,56,4],[51,4,6],[18,27,2],[43,27,18],[2,1,17],[17,52,2],[1,52,17],[11,4,1],[11,16,4],[56,16,10],[1,4,39],[39,9,1],[33,9,58],[58,39,4],[9,39,58],[25,52,1],[2,13,29],[43,18,31],[2,52,60],[60,13,2],[52,25,60],[61,3,23],[5,31,62],[43,31,5],[16,11,54],[54,10,16],[14,51,6],[36,57,14],[33,58,28],[28,57,33],[4,51,28],[28,58,4],[51,14,28],[28,14,57],[1,9,47],[47,25,1],[6,56,50],[42,9,33],[42,47,9],[25,47,42],[13,60,40],[40,60,25],[25,42,40],[43,5,63],[63,5,11],[11,53,63],[63,27,43],[15,1,2],[2,27,15],[15,11,1],[15,53,11],[27,63,15],[15,63,53],[22,54,11],[22,5,62],[11,5,22],[12,3,36],[12,14,6],[36,14,12],[34,12,6],[26,29,13],[13,40,26],[26,61,23],[36,3,21],[3,61,21],[21,57,36],[61,26,21],[21,26,40],[21,40,42],[33,57,21],[21,42,33],[62,31,19],[31,30,19],[8,31,18],[8,18,2],[23,3,49],[3,12,49],[12,34,49],[34,20,49],[32,19,30],[56,10,32],[44,30,31],[31,8,44],[37,8,2],[45,32,30],[45,50,56],[56,32,45],[62,19,38],[19,32,38],[38,22,62],[54,22,38],[10,54,38],[38,32,10],[55,20,34],[6,50,55],[55,34,6],[59,44,8],[8,37,59],[48,37,2],[2,29,48],[29,7,48],[35,49,20],[23,49,35],[20,55,41],[41,35,20],[7,35,41],[24,59,37],[24,41,55],[7,41,24],[37,48,24],[24,48,7],[0,55,50],[44,59,0],[0,24,55],[59,24,0],[50,45,0],[30,44,0],[0,45,30],[46,7,29],[46,35,7],[23,35,46],[46,26,23],[29,26,46]]};
const COM_Y = 0.9;                                   // model origin is at his feet; physics body is centred here
const CLOUD_TOP = 0.1883, SINK = 0.34, LIFT = CLOUD_TOP - SINK;
const BANK_SPHERES = [[-1.744,-1.107,-0.509,0.539],[-1.744,-1.101,0.627,0.566],[-1.182,-0.858,-0.642,0.618],[-1.182,-0.786,0.724,0.581],[1.152,-0.783,-0.646,0.561],[1.152,-0.672,0.091,0.518],[1.152,-0.788,0.615,0.567],[2.007,-1.202,-0.622,0.488],[2.007,-1.232,-0.116,0.484],[2.007,-1.191,0.497,0.428],[0.0,-1.211,0.0,1.35],[0.55,-1.111,-0.25,1.17],[-0.6,-1.161,0.2,1.2]];
const BOUNDS = { x: 3, zBack: -2.0, zFront: 1.3, top: 4.2 };
const FRONT_Z = 2.5;                                 // the foreground cloud with the logo

const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const coarse = matchMedia('(pointer: coarse)').matches;

let kick = 30;
const poke = (n = 6) => { kick = Math.max(kick, n); };
const stage = document.getElementById('stage');
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: false });
const DPR_STEPS = [0.75, 1, 1.25, 1.5, 1.75, 2].filter((d) => d <= Math.max(1, devicePixelRatio));
let dprMax = DPR_STEPS.length - 1;
let dprIdx = DPR_STEPS.indexOf(coarse ? 1 : Math.min(1.25, DPR_STEPS[dprMax]));
if (dprIdx < 0) dprIdx = DPR_STEPS.length - 1;
renderer.setPixelRatio(DPR_STEPS[dprIdx]);
renderer.setClearColor(0xffffff, 0);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.95;
renderer.outputColorSpace = THREE.SRGBColorSpace;
stage.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
const lookAt = new THREE.Vector3();

// ---------- The light: one fixed product-photography setup ----------
// Shot like a vinyl toy on a white sweep:
// - key: a big soft box high and to camera-left (about 35° round, 50° up), so his round belly
//   turns from light to shade left to right and his ears and brow throw a little form shadow;
// - two tall strip boxes behind, left and right, tracing his silhouette so he separates from the white;
// - an overhead scrim for a soft top light on his head and ears;
// - a low white bounce card in front, so the shadow side opens up but never goes flat;
// - eyes see only two small, crisp windows: one clean catchlight each, like a teddy bear's.
// The environment map carries the soft wrap and the long curved highlights; real lights add the shape.
function buildStudioEnv(eyesOnly = false) {
  const env = new THREE.Scene();
  const room = new THREE.Mesh(new THREE.BoxGeometry(24, 24, 24), new THREE.ShaderMaterial({
    side: THREE.BackSide, toneMapped: false,
    vertexShader: 'varying float vY; void main(){ vY = position.y; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: 'varying float vY; void main(){ gl_FragColor = vec4(vec3(mix(0.42, 0.26, smoothstep(-2.0, 2.0, vY))), 1.0); }'
  }));
  if (!eyesOnly) env.add(room);
  const panel = (w, h, pos, L, hex) => {
    const m = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide, toneMapped: false });
    m.color.set(hex).multiplyScalar(L);
    const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), m);
    p.position.set(...pos);
    p.lookAt(0, 1, 0);
    env.add(p);
  };
  if (eyesOnly) {
    panel(1.8, 1.2, [-4.2, 5.2, 4.5], 4.0, 0xffffff);   // the key's window: one catchlight upper left
    panel(0.6, 0.6, [3.5, 2.5, 5], 1.2, 0xffffff);      // a faint second from the bounce card
  } else {
    panel(4.5, 4.5, [-4.6, 4.6, 4.2], 3.2, 0xfff3e6);    // big key softbox, front-left, high
    panel(6, 3, [0, 7, 0.5], 2.0, 0xfff7ee);             // overhead scrim
    panel(0.9, 5.5, [-4.6, 2.6, -3.4], 11, 0xf3f6ff);    // strip left, behind
    panel(0.9, 5.5, [4.6, 2.6, -3.4], 9, 0xf3f6ff);      // strip right, behind
    panel(6, 2.2, [0, 0.2, 4.8], 0.75, 0xffffff);        // low white bounce card in front
    panel(3.5, 3.5, [5.2, 1.8, 2.4], 0.55, 0xffffff);    // right V-flat fill
    panel(4, 3, [0, 1.5, -6], 2.4, 0xfff8f0);            // back panel, lights the gummy through
  }
  const pm = new THREE.PMREMGenerator(renderer);
  const tex = pm.fromScene(env, 0.035).texture;
  pm.dispose();
  return tex;
}
const rigEnv = buildStudioEnv();
scene.environment = rigEnv;
const eyeEnv = buildStudioEnv(true);

const KEY = { az: THREE.MathUtils.degToRad(-36), el: THREE.MathUtils.degToRad(50), r: 4.8 };
const key = new THREE.SpotLight(0xfff1e2, 24, 0, Math.PI / 4, 1, 2);
scene.add(key, key.target);
RectAreaLightUniformsLib.init();
const rims = [[-3.2, 20], [3.2, 15]].map(([x, power]) => {
  const r = new THREE.RectAreaLight(0xf2f6ff, power, 0.5, 3);
  r.position.set(x, 2.0, -2.6);
  r.lookAt(0, 1.1, 0);
  scene.add(r);
  return r;
});

// ---------- Finishes ----------
const EYES = { color: 0x080809, roughness: 0.05, clearcoat: 1, clearcoatRoughness: 0.02, specularIntensity: 1, envMapIntensity: 1.0 };
const TEETH = { color: 0xf6f0e3, roughness: 0.5, envMapIntensity: 0.9 };
function finishFor(f) {
  if (f.kind === 'gummy') return {
    sugar: true,
    tint: { base: f.base, edge: f.edge, belly: f.belly, sss: 0xff3a30, sssAmt: 1.0, glow: 0.28 },
    body: { roughness: 0.3, transmission: 0.55, thickness: 1.4, ior: 1.47, attenuationColor: 0xff3347,
            attenuationDistance: 0.8, specularIntensity: 1, envMapIntensity: 1.3, sheen: 0.5, sheenRoughness: 0.7, sheenColor: 0xffffff },
    eyes: EYES, teeth: { ...TEETH, roughness: 0.45 }
  };
  if (f.kind === 'flock') return {
    flock: true,
    tint: { base: f.base, edge: f.edge, belly: f.belly, sss: f.base, sssAmt: 0.03, glow: 0.0 },
    body: { roughness: 1, specularIntensity: 0.0, sheen: 0, envMapIntensity: 0.9 },
    eyes: EYES, teeth: TEETH
  };
  return {
    tint: { base: f.base, edge: f.edge, belly: f.belly, sss: f.base, sssAmt: 0.08, glow: 0.06 },
    body: { roughness: 0.62, specularIntensity: 0.5, sheen: 0.6, sheenRoughness: 0.5, sheenColor: 0xffe0d4, envMapIntensity: 0.6 },
    eyes: EYES, teeth: TEETH
  };
}
const BASE = { color: 0xffffff, roughness: 0.5, metalness: 0, sheen: 0, sheenRoughness: 1, sheenColor: 0x000000,
  clearcoat: 0, clearcoatRoughness: 0, specularIntensity: 1, transmission: 0, thickness: 0, ior: 1.5,
  attenuationColor: 0xffffff, attenuationDistance: Infinity, emissive: 0x000000, emissiveIntensity: 1, envMapIntensity: 1 };

// Shared light uniforms for the body shader (view-space directions, refreshed every frame)
const lightU = {
  uKeyPosV: { value: new THREE.Vector3() }, uKeyStrength: { value: 1 },
  uRimDirV: { value: [new THREE.Vector3(), new THREE.Vector3()] }, uBackDirV: { value: new THREE.Vector3() },
  uLocal: { value: new THREE.Matrix4() }
};
const bodyCompile = (U) => (sh) => {
  Object.assign(sh.uniforms, U);
  sh.vertexShader = sh.vertexShader
    .replace('#include <common>', `#include <common>
      attribute vec4 color;
      uniform mat4 uLocal;
      varying float vThin; varying float vAo; varying vec3 vObj; varying vec3 vObjN;`)
    .replace('#include <begin_vertex>', `#include <begin_vertex>
      vThin = color.r;
      vAo = color.g;
      vObj = (uLocal * vec4(position, 1.0)).xyz;
      vObjN = normalize(mat3(uLocal) * objectNormal);`);
  sh.fragmentShader = sh.fragmentShader
    .replace('#include <common>', `#include <common>
      uniform vec3 uBase, uEdge, uBelly, uSss; uniform float uSssAmt, uGlow, uKeyStrength, uFlock;
      float hash13(vec3 p) { p = fract(p * 0.1031); p += dot(p, p.zyx + 31.32); return fract((p.x + p.y) * p.z); }
      float vnoise(vec3 p) {
        vec3 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
        return mix(mix(mix(hash13(i), hash13(i + vec3(1,0,0)), f.x), mix(hash13(i + vec3(0,1,0)), hash13(i + vec3(1,1,0)), f.x), f.y),
                   mix(mix(hash13(i + vec3(0,0,1)), hash13(i + vec3(1,0,1)), f.x), mix(hash13(i + vec3(0,1,1)), hash13(i + vec3(1,1,1)), f.x), f.y), f.z);
      }
      float fleck = 0.5, fleckAA = 0.0;
      uniform vec3 uKeyPosV, uBackDirV; uniform vec3 uRimDirV[2];
      varying float vThin; varying float vAo; varying vec3 vObj; varying vec3 vObjN;
      float crevice;
      float sssLobe(vec3 V, vec3 L, vec3 N, float p) { return pow(saturate(dot(V, -normalize(L + N * 0.4))), p); }`)
    .replace('#include <color_fragment>', `
      float thin = smoothstep(0.03, 0.55, vThin);
      float feet = 1.0 - smoothstep(0.05, 0.35, vObj.y);
      float crown = smoothstep(1.55, 2.0, vObj.y);
      float edgeAmt = clamp(max(thin, max(feet * 0.8, crown * 0.6)), 0.0, 1.0);
      float belly = smoothstep(0.2, 0.9, vObjN.z) * (1.0 - smoothstep(0.25, 0.7, abs(vObj.x)))
                  * smoothstep(0.15, 0.5, vObj.y) * (1.0 - smoothstep(1.05, 1.3, vObj.y));
      crevice = 1.0 - smoothstep(0.3, 0.95, vAo);
      float airbrush = clamp(max(crevice, edgeAmt * 0.45), 0.0, 1.0);
      vec3 tint = mix(uBase, uEdge, airbrush);
      tint = mix(tint, uBelly, belly * 0.6);
      diffuseColor.rgb = tint;
      if (uFlock > 0.5) {
        vec3 fp = vObj * 110.0;
        float fw = length(fwidth(fp));
        fleckAA = 1.0 - smoothstep(0.7, 1.6, fw);
        float fine = vnoise(fp), fine2 = vnoise(fp * 2.13 + 17.0);
        fleck = mix(0.5, clamp(0.5 + (fine * 0.55 + fine2 * 0.45 - 0.5) * 2.2, 0.0, 1.0), fleckAA);
        float mottle = vnoise(vObj * 22.0);
        diffuseColor.rgb *= (0.86 + 0.28 * fleck) * (0.96 + 0.08 * mottle);
      }`)
    .replace('#include <lights_physical_fragment>', `#include <lights_physical_fragment>
      if (uFlock > 0.5) {
        vec3 fV = normalize(vViewPosition);
        float fNV = saturate(dot(normal, fV));
        vec3 alb = material.diffuseColor;
        material.diffuseColor = mix(pow(alb, vec3(0.85)), pow(alb, vec3(1.2)), smoothstep(0.2, 0.95, fNV));
        material.diffuseColor = mix(material.diffuseColor, pow(material.diffuseColor, vec3(1.5)), crevice * 0.6);
      }`)
    .replace('#include <lights_fragment_end>', `#include <lights_fragment_end>
      if (uFlock > 0.5) {
        vec3 fV = normalize(vViewPosition);
        vec3 fL = normalize(uKeyPosV + vViewPosition);
        float retro = pow(saturate(dot(fL, fV) * 0.5 + 0.5), 2.0);
        float fNV = saturate(dot(normal, fV));
        reflectedLight.directDiffuse *= 0.5 + 0.2 * retro;
        float side = pow(1.0 - fNV, 2.2) * mix(0.75, 1.25, fleck);
        vec3 sideTint = vec3(1.35, 1.12, 1.0);
        reflectedLight.directDiffuse *= 1.0 + side * 0.9 * sideTint;
        reflectedLight.indirectDiffuse *= 1.0 + side * 0.9 * sideTint;
        reflectedLight.indirectDiffuse *= 1.55;
        reflectedLight.indirectDiffuse *= mix(1.0, 0.82, fNV * fNV);
      }
      {
        vec3 Vv = normalize(vViewPosition);
        float through = mix(0.3, 1.0, smoothstep(0.0, 0.6, vThin));
        float s = sssLobe(Vv, normalize(uKeyPosV + vViewPosition), normal, 3.0) * uKeyStrength;
        s += sssLobe(Vv, uRimDirV[0], normal, 3.0) * 0.6 + sssLobe(Vv, uRimDirV[1], normal, 3.0) * 0.5;
        s += sssLobe(Vv, uBackDirV, normal, 2.0) * 0.5;
        float wrap = saturate((dot(normal, normalize(uKeyPosV + vViewPosition)) + 0.5) / 1.5) * 0.25;
        totalEmissiveRadiance += uSss * (s * through + wrap + uGlow * through) * uSssAmt;
        totalEmissiveRadiance += uEdge * crevice * 0.12;
        float occ = mix(0.55, 1.0, smoothstep(0.0, 0.9, vAo));
        float dOcc = mix(0.62, 1.0, smoothstep(0.05, 0.85, vAo));
        reflectedLight.directDiffuse *= dOcc;
        reflectedLight.directSpecular *= dOcc;
        reflectedLight.indirectDiffuse *= occ;
        reflectedLight.indirectSpecular *= mix(0.6, 1.0, occ);
      }`);
};
const eyesCompile = (sh) => {
  // keep the edge strip lights out of the eyes: they drew white rims around them
  sh.fragmentShader = sh.fragmentShader.replace('#include <lights_fragment_begin>',
    THREE.ShaderChunk.lights_fragment_begin.replace('defined( RE_Direct_RectArea )', 'defined( RE_Direct_RectArea ) && 0'));
};
function makeSet(f) {
  const U = { ...lightU,
    uBase: { value: new THREE.Color() }, uEdge: { value: new THREE.Color() }, uBelly: { value: new THREE.Color() },
    uSss: { value: new THREE.Color() }, uSssAmt: { value: 0 }, uGlow: { value: 0 }, uFlock: { value: 0 } };
  const set = { U, body: new THREE.MeshPhysicalMaterial(), eyes: new THREE.MeshPhysicalMaterial(), teeth: new THREE.MeshPhysicalMaterial() };
  set.body.onBeforeCompile = bodyCompile(U);
  set.body.customProgramCacheKey = () => 'grumpl-body';
  set.eyes.envMap = eyeEnv;
  set.eyes.onBeforeCompile = eyesCompile;
  set.eyes.customProgramCacheKey = () => 'grumpl-eyes';
  const fin = finishFor(f);
  for (const part of ['body', 'eyes', 'teeth']) {
    const spec = { ...BASE, ...fin[part] };
    for (const [k, v] of Object.entries(spec)) { if (set[part][k] && set[part][k].isColor) set[part][k].set(v); else set[part][k] = v; }
  }
  U.uBase.value.set(fin.tint.base); U.uEdge.value.set(fin.tint.edge); U.uBelly.value.set(fin.tint.belly);
  U.uSss.value.set(fin.tint.sss); U.uSssAmt.value = fin.tint.sssAmt; U.uGlow.value = fin.tint.glow;
  U.uFlock.value = fin.flock ? 1 : 0;
  set.sugar = !!fin.sugar;
  return set;
}

function sugarCoat(mesh, count) {
  const sampler = new MeshSurfaceSampler(mesh).build();
  const s = new THREE.Vector3(); mesh.getWorldScale(s);
  const unit = 1 / s.x;
  const inst = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1),
    new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.12, metalness: 0, envMapIntensity: 2.5 }), count);
  const p = new THREE.Vector3(), n = new THREE.Vector3(), q = new THREE.Quaternion();
  const e = new THREE.Euler(), sc = new THREE.Vector3(), m4 = new THREE.Matrix4();
  for (let i = 0; i < count; i++) {
    sampler.sample(p, n);
    const size = (0.003 + Math.random() * 0.005) * unit;
    p.addScaledVector(n, size * 0.25);
    q.setFromEuler(e.set(Math.random() * 6.3, Math.random() * 6.3, Math.random() * 6.3));
    sc.set(size, size * (0.7 + Math.random() * 0.5), size * (0.7 + Math.random() * 0.5));
    inst.setMatrixAt(i, m4.compose(p, q, sc));
  }
  mesh.add(inst);
}

// ---------- Physics ----------
const world = new CANNON.World({ gravity: new CANNON.Vec3(0, -22, 0) });
world.allowSleep = true;
const mat = new CANNON.Material('clay');
world.defaultContactMaterial.friction = 0.45;
world.defaultContactMaterial.restitution = 0.15;
const cloudPhys = new CANNON.Material('cloud');
world.addContactMaterial(new CANNON.ContactMaterial(mat, cloudPhys, { friction: 0.9, restitution: 0.02 }));
function addWall(normal, point) {
  const b = new CANNON.Body({ mass: 0, material: mat });
  b.addShape(new CANNON.Plane());
  b.quaternion.setFromVectors(new CANNON.Vec3(0, 0, 1), normal);
  b.position.copy(point);
  world.addBody(b);
  return b;
}
// side walls follow the screen's edges (see resize), so a throw never sends him off the page
const wallL = addWall(new CANNON.Vec3(1, 0, 0), new CANNON.Vec3(-BOUNDS.x, 0, 0));
const wallR = addWall(new CANNON.Vec3(-1, 0, 0), new CANNON.Vec3(BOUNDS.x, 0, 0));
addWall(new CANNON.Vec3(0, 0, 1), new CANNON.Vec3(0, 0, BOUNDS.zBack));
addWall(new CANNON.Vec3(0, 0, -1), new CANNON.Vec3(0, 0, BOUNDS.zFront));
addWall(new CANNON.Vec3(0, -1, 0), new CANNON.Vec3(0, BOUNDS.top, 0));
// a soft floor inside the clouds: thrown off the crest he lands in the fluff, then hops home
const floorB = new CANNON.Body({ mass: 0, material: cloudPhys });
floorB.addShape(new CANNON.Plane());
floorB.quaternion.setFromVectors(new CANNON.Vec3(0, 0, 1), new CANNON.Vec3(0, 1, 0));
floorB.position.set(0, LIFT - 0.75, 0);
world.addBody(floorB);

const crest = new CANNON.Body({ mass: 0, material: cloudPhys });
BANK_SPHERES.forEach(([x, y, z, r]) => crest.addShape(new CANNON.Sphere(r), new CANNON.Vec3(x, y, z)));
crest.addShape(new CANNON.Box(new CANNON.Vec3(1.1, 0.12, 0.65)), new CANNON.Vec3(0, CLOUD_TOP - 0.12, 0));
crest.position.set(0, -SINK, 0);
world.addBody(crest);

const body = new CANNON.Body({ mass: 1, material: mat, angularDamping: 0.3, linearDamping: 0.04, sleepSpeedLimit: 0.05 });
body.addShape(new CANNON.ConvexPolyhedron({ vertices: HULL.v.map(([x, y, z]) => new CANNON.Vec3(x, y - COM_Y, z)), faces: HULL.f }));
world.addBody(body);

const _up = new CANNON.Vec3(), _ax = new CANNON.Vec3(), _fwd = new CANNON.Vec3(), Y_UP = new CANNON.Vec3(0, 1, 0);
let twirlSteps = 0;
let grip = null;
let tiltG = 0;
world.addEventListener('preStep', () => {
  if (grip) return;
  if (tiltG) body.force.x += tiltG;               // a deliberate phone tilt lets him slide to the low side
  const p = body.position;
  if (Math.abs(p.x) > 1.8 || Math.abs(p.z) > 1.1 || p.y > LIFT + COM_Y + 0.9 || p.y < LIFT + COM_Y - 0.8) return;
  const v = body.velocity;
  body.force.x += -p.x * 9 - v.x * 2.2;
  body.force.z += -p.z * 9 - v.z * 2.2;
  body.quaternion.vmult(Y_UP, _up);
  _up.cross(Y_UP, _ax);
  const w = body.angularVelocity;
  body.torque.x += _ax.x * 26 - w.x * 2.4;
  body.torque.z += _ax.z * 26 - w.z * 2.4;
  if (twirlSteps > 0 && --twirlSteps < 200) {
    body.quaternion.vmult(_fwd.set(0, 0, 1), _ax);
    w.y += (-Math.atan2(_ax.x, _ax.z) * 4 - w.y) * 0.12;
  }
});
const hand = new CANNON.Body({ mass: 0, type: CANNON.Body.KINEMATIC });
world.addBody(hand);
function standUp() {
  body.position.set(0, COM_Y + LIFT + 0.02, 0);
  body.quaternion.set(0, 0, 0, 1);
  body.velocity.setZero();
  body.angularVelocity.setZero();
  body.wakeUp();
}
standUp();

// ---------- Cloud shading (from the Light Study) ----------
const OCC_LOCAL = [[0, 0.72, 0.02, 0.62], [0, 1.45, -0.05, 0.55], [-0.4, 0.12, 0.12, 0.22], [0.4, 0.12, 0.12, 0.22]]
  .map(([x, y, z, r]) => [new THREE.Vector3(x, y - COM_Y, z), r]);
const occU = { value: OCC_LOCAL.map(() => new THREE.Vector4()) };
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
const pressU = { value: new THREE.Vector4(0, CLOUD_TOP, 0, 0) };
const skyU = { value: new THREE.Color(0x9fbcf0) };
const tintU = { value: new THREE.Color(0x56c2dc) };
const logoMaskU = { value: null };
const logoRectU = { value: new THREE.Vector4(0, 0, 1, 1) };   // centre xy, size xy in the front cloud's own space
function makeCloudMat({ fade = true, front = false } = {}) {
  const m = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.95, metalness: 0, sheen: 1, sheenRoughness: 0.85,
    sheenColor: 0xffffff, envMapIntensity: 1.1, vertexColors: true, toneMapped: false });
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uOcc = occU; sh.uniforms.uPress = pressU; sh.uniforms.uSky = skyU; sh.uniforms.uTint = tintU;
    sh.uniforms.uMask = logoMaskU; sh.uniforms.uRect = logoRectU;
    const DENT = `
      uniform vec4 uPress; uniform sampler2D uMask; uniform vec4 uRect;
      float dentH( vec2 q ) {
        q.y *= 1.25;
        float d = length( q );
        return - uPress.w * exp( - d * d / 0.5 ) + uPress.w * 0.38 * exp( - ( d - 1.0 ) * ( d - 1.0 ) / 0.07 );
      }`;
    // The front cloud: where the logo sits the fluff is pressed back, so the logo lies in a hollow and the
    // puffs round over its edges. The mask is the logo's silhouette, blurred and pulled in a little.
    const LOGO_V = front ? `
      vec2 lUv = ( position.xy - uRect.xy ) / uRect.zw + 0.5;
      float lIn = step( 0.0, lUv.x ) * step( lUv.x, 1.0 ) * step( 0.0, lUv.y ) * step( lUv.y, 1.0 );
      vLogo = texture2D( uMask, lUv ).r * lIn;
      vLogoUv = lUv;
      transformed.z -= vLogo * 0.95 * smoothstep( -0.2, 0.5, objectNormal.z );` : '';
    sh.vertexShader = 'varying vec3 vCW, vCN; varying float vSY, vLogo; varying vec2 vLogoUv;\n' + DENT + '\n' + sh.vertexShader
      .replace('#include <beginnormal_vertex>', `#include <beginnormal_vertex>
        vec4 dW = modelMatrix * vec4( position, 1.0 );
        vec3 dN = normalize( mat3( modelMatrix ) * objectNormal );
        float dUp = smoothstep( -0.1, 0.6, dN.y ) * smoothstep( uPress.y - 1.0, uPress.y - 0.5, dW.y ) * ${front ? '0.0' : '1.0'};
        vec2 dq = dW.xz - uPress.xz;
        float dE = 0.03;
        vec2 dG = vec2( dentH( dq + vec2( dE, 0.0 ) ) - dentH( dq - vec2( dE, 0.0 ) ),
                        dentH( dq + vec2( 0.0, dE ) ) - dentH( dq - vec2( 0.0, dE ) ) ) / ( 2.0 * dE ) * dUp;
        dW.y += dentH( dq ) * dUp;
        objectNormal = normalize( transpose( mat3( modelMatrix ) ) * normalize( dN + vec3( - dG.x, 0.0, - dG.y ) ) );`)
      .replace('#include <begin_vertex>', '#include <begin_vertex>\n transformed = ( inverse( modelMatrix ) * dW ).xyz;' + LOGO_V)
      .replace('#include <worldpos_vertex>',
        '#include <worldpos_vertex>\n vCW = (modelMatrix * vec4(transformed, 1.0)).xyz; vCN = normalize(mat3(modelMatrix) * objectNormal);')
      .replace('#include <project_vertex>', '#include <project_vertex>\n vSY = gl_Position.y / gl_Position.w;');
    sh.fragmentShader = 'varying vec3 vCW, vCN; varying float vSY, vLogo; varying vec2 vLogoUv; uniform vec3 uSky, uTint;\n' + AO_GLSL + `
      float cHash( vec3 p ) { p = fract( p * 0.1031 ); p += dot( p, p.zyx + 31.32 ); return fract( ( p.x + p.y ) * p.z ); }
      float cloudNoise( vec3 p ) {
        vec3 i = floor( p ), f = fract( p ); f = f * f * ( 3.0 - 2.0 * f );
        return mix( mix( mix( cHash( i ), cHash( i + vec3( 1, 0, 0 ) ), f.x ), mix( cHash( i + vec3( 0, 1, 0 ) ), cHash( i + vec3( 1, 1, 0 ) ), f.x ), f.y ),
                    mix( mix( cHash( i + vec3( 0, 0, 1 ) ), cHash( i + vec3( 1, 0, 1 ) ), f.x ), mix( cHash( i + vec3( 0, 1, 1 ) ), cHash( i + vec3( 1, 1, 1 ) ), f.x ), f.y ), f.z );
      }
    ` + sh.fragmentShader
      .replace('#include <color_fragment>', `
        float puffAO = vColor.r;`)
      .replace('#include <opaque_fragment>', `
        vec3 cN = normalize( vCN );
        vec3 cV = normalize( cameraPosition - vCW );
        float lum = dot( outgoingLight, vec3( 0.2126, 0.7152, 0.0722 ) );
        float shade = 0.35 + 0.65 * smoothstep( 0.1, 1.5, lum );
        float fold = ( 1.0 - smoothstep( 0.4, 1.0, puffAO ) ) * 0.75 + ( 1.0 - smoothstep( -0.6, 0.3, cN.y ) ) * 0.2;
        float press = 1.0 - sphereAO( vCW, cN );
        shade *= 1.0 - clamp( fold, 0.0, 1.0 ) * 0.7;
        shade *= 1.0 - clamp( press * 1.3, 0.0, 1.0 ) * 0.7;
        ${front ? `shade = mix( shade, 1.0, 0.45 );                                    // it faces us and the key: brighter than the bank
        shade *= 1.0 - smoothstep( 0.05, 0.6, vLogo ) * 0.55;                  // the walls of the hollow the logo sits in` : ''}
        vec3 shadowCol = mix( uSky, uSky * 0.55 + uTint * 0.6, clamp( press * 1.4, 0.0, 1.0 ) );
        vec3 lit = mix( mix( shadowCol, vec3( 1.0 ), 0.25 ), vec3( 1.0 ), smoothstep( 0.1, 0.9, shade ) );
        float wisp = cloudNoise( vCW * 3.1 ) * 0.6 + cloudNoise( vCW * 7.3 ) * 0.4;
        float edge = smoothstep( 0.5, 0.92, ( 1.0 - abs( dot( cN, cV ) ) ) + ( wisp - 0.5 ) * 0.35 );
        lit = mix( lit, vec3( 1.0 ), edge * ( 1.0 - clamp( press * 1.5, 0.0, 1.0 ) ) ${front ? '* ( 1.0 - smoothstep( 0.05, 0.5, vLogo ) )' : ''} );
        lit = mix( lit, vec3( 1.0 ), smoothstep( 9.0, 22.0, length( cameraPosition - vCW ) ) * 0.85 );
        outgoingLight = lit;
        #include <opaque_fragment>`)
      .replace('#include <dithering_fragment>', `#include <dithering_fragment>
        ${fade ? 'gl_FragColor.rgb = mix( gl_FragColor.rgb, vec3( 1.0 ), smoothstep( -0.2, -0.75, vSY ) );' : ''}`);
  };
  m.customProgramCacheKey = () => `cloud-${fade}-${front}`;
  return m;
}
const cloudMat = makeCloudMat();
const frontMat = makeCloudMat({ fade: false, front: true });

async function loadGLB(url) {
  const buf = await (await fetch(url)).arrayBuffer();
  const gltf = await new GLTFLoader().parseAsync(buf, '');
  gltf.scene.updateMatrixWorld(true);
  return gltf;
}
const meshOf = (o, material) => {
  if (!o.geometry.attributes.normal) o.geometry.computeVertexNormals();
  const m = new THREE.Mesh(o.geometry, material);
  m.applyMatrix4(o.matrixWorld);       // keep quantized data intact; place the mesh instead
  return m;
};

// ---------- The turntable ----------
// Each Grumpl in the drop stands on its own cloud. They sit on an arc: the focused one in the middle,
// the others further back to the left and right. Switching turns the arc, so the next one comes forward.
const N = FLAVORS.length;
const ring = { f: 0, show: 0, from: 0, t: 1, dur: 0.9 };    // show = the arc's position, eased toward f
const slots = FLAVORS.map((f) => ({ f, group: new THREE.Group(), cloud: new THREE.Group(), set: null, meshes: [] }));
slots.forEach((s) => scene.add(s.group, s.cloud));
let ARC = { rx: 2.0, rz: 1.9, step: THREE.MathUtils.degToRad(58) };
const wrapU = (u) => { u = ((u % N) + N) % N; return u > N / 2 ? u - N : u; };
const _slotP = new THREE.Vector3();
function slotPose(u, out) {
  // u = place on the arc: 0 front and centre, ±1 the neighbours, ±1.5 behind (where wrapping happens)
  const a = THREE.MathUtils.clamp(u, -1, 1) * ARC.step;
  out.set(ARC.rx * Math.sin(a) / Math.sin(ARC.step), 0, -ARC.rz * (1 - Math.cos(a)) / (1 - Math.cos(ARC.step)));
  if (Math.abs(u) > 1) {                                       // past the neighbours: sink down into the back clouds
    const k = Math.abs(u) - 1;
    out.x = Math.sign(u) * ARC.rx * (1 + 0.25 * k);
    out.z = -ARC.rz * (1 + 0.8 * k);
    out.y = -2.4 * k * k;
  }
  return out;
}
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

// the focused Grumpl hands over to physics; the one leaving keeps whatever pose he had and eases upright
const leaving = { slot: -1, p: new THREE.Vector3(), q: new THREE.Quaternion() };
const focusGroup = () => slots[ring.f].group;
function focus(i, dir) {
  i = ((i % N) + N) % N;
  if (i === ring.f && ring.t >= 1) return;
  if (grip) release();
  leaving.slot = ring.f;
  leaving.p.copy(focusGroup().position); leaving.q.copy(focusGroup().quaternion);
  // go the short way round unless a direction was asked for
  let target = ring.show + wrapU(i - ring.show);
  if (dir && Math.sign(target - ring.show) !== dir && Math.abs(wrapU(i - ring.show)) > 0.01) target += dir * N;
  ring.from = ring.show; ring.to = target; ring.t = 0;
  ring.dur = reduceMotion ? 0.01 : 0.75 + 0.2 * Math.abs(target - ring.show);
  ring.f = i;
  onFocus(FLAVORS[i], i);
  poke(4);
}
function updateRing(dt) {
  if (ring.t < 1) {
    ring.t = Math.min(1, ring.t + dt / ring.dur);
    ring.show = ring.from + (ring.to - ring.from) * ease(ring.t);
    if (ring.t >= 1) {
      ring.show = ((ring.to % N) + N) % N;
      standUp();
      body.velocity.set(0, -1, 0);
      leaving.slot = -1;
    }
    poke(2);
  }
  const _q = new THREE.Quaternion();
  slots.forEach((s, i) => {
    const u = wrapU(i - ring.show);
    slotPose(u, _slotP);
    s.cloud.position.copy(_slotP);
    if (i === ring.f && ring.t >= 1) return;                       // physics drives him
    // stand on his cloud, turned a little toward the middle so the line-up reads as a group
    const yaw = -u * 0.32;
    _q.setFromAxisAngle(THREE.Object3D.DEFAULT_UP, yaw);
    s.group.position.set(_slotP.x, _slotP.y + LIFT + COM_Y, _slotP.z);
    s.group.quaternion.copy(_q);
    if (i === leaving.slot && ring.t < 1) {                        // the one leaving lets go of his pose first
      const k = ease(Math.min(1, ring.t / 0.55));
      s.group.position.lerpVectors(leaving.p, s.group.position, k);
      s.group.quaternion.slerpQuaternions(leaving.q, _q, k);
    }
    const hide = THREE.MathUtils.smoothstep(Math.abs(u), 1.25, 1.5);
    s.group.visible = s.cloud.visible = hide < 0.999;
  });
}

// ---------- The foreground cloud and the logo ----------
const front = { group: new THREE.Group(), logo: null, canvas: null, ctx: null, pieces: [], tex: null, s: 1, anim: [] };
scene.add(front.group);
const LOGO_W = 4.15, LOGO_H = LOGO_W * 758 / 1307;          // in the cloud's own units
const LOGO_C = new THREE.Vector2(0.06, -1.38);
logoRectU.value.set(LOGO_C.x, LOGO_C.y, LOGO_W, LOGO_H);

async function buildLogo() {
  const txt = await (await fetch('assets/logo.svg')).text();
  const holder = document.createElement('div');
  holder.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden;visibility:hidden';
  holder.innerHTML = txt;
  document.body.appendChild(holder);
  const svg = holder.querySelector('svg');
  const get = (id) => svg.querySelector('#' + id);
  const P = (el) => ({ path: new Path2D(el.getAttribute('d')), fill: el.getAttribute('fill'), alpha: +(el.getAttribute('fill-opacity') || 1), rule: el.getAttribute('fill-rule') || 'nonzero' });
  const cloudParts = ['cloud-shadow', 'cloud-outline', 'cloud-fill', 'cloud-shade'].map((id) => P(get(id)));
  front.pieces = ['g', 'r', 'u', 'm', 'p', 'l'].map((k) => {
    const els = [...svg.querySelectorAll(`[id^="drop-${k}-"]`), get('letter-' + k)];
    const bb = get('letter-' + k).getBBox();
    return { k, parts: els.map(P), cx: bb.x + bb.width / 2, cy: bb.y + bb.height * 0.62, t: -1 };
  });
  const outline = get('cloud-outline').getAttribute('d');
  holder.remove();

  const S = 1536 / 1307, W = 1536, H = Math.round(758 * S);
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  front.canvas = cv; front.ctx = cv.getContext('2d');
  front.draw = () => {
    const g = front.ctx;
    g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, W, H);
    g.setTransform(S, 0, 0, S, 0, 0);
    for (const c of cloudParts.slice(1)) { g.globalAlpha = c.alpha; g.fillStyle = c.fill; g.fill(c.path, c.rule); }
    g.globalAlpha = 1;
    const now = performance.now();
    let busy = false;
    for (const pc of front.pieces) {
      let sc = 1, dy = 0, rot = 0;
      if (pc.t > 0) {
        const t = (now - pc.t) / 520;
        if (t >= 1) pc.t = -1;
        else {
          busy = true;
          // a puff: squash, pop up big, settle with a wobble (the brand-book letter jump)
          const pop = Math.sin(Math.PI * Math.min(1, t * 1.6)) * (1 - t * 0.4);
          sc = 1 + 0.16 * pop - 0.05 * Math.sin(t * 14) * (1 - t);
          dy = -26 * pop;
          rot = 0.05 * Math.sin(t * 11) * (1 - t);
        }
      }
      g.save();
      g.translate(pc.cx, pc.cy + dy); g.rotate(rot); g.scale(sc, sc); g.translate(-pc.cx, -pc.cy);
      for (const c of pc.parts) { g.fillStyle = c.fill; g.fill(c.path, c.rule); }
      g.restore();
    }
    if (front.tex) front.tex.needsUpdate = true;
    return busy;
  };
  front.draw();
  front.tex = new THREE.CanvasTexture(cv);
  front.tex.colorSpace = THREE.SRGBColorSpace;
  front.tex.anisotropy = 4;

  // the silhouette, blurred: drives the hollow in the cloud and the soft shadow its rim casts on the logo
  const mk = (blur, inset) => {
    const m = document.createElement('canvas'); m.width = 256; m.height = Math.round(256 * 758 / 1307);
    const g = m.getContext('2d');
    g.fillStyle = '#000'; g.fillRect(0, 0, m.width, m.height);
    g.filter = `blur(${blur}px)`;
    const k = m.width / 1307;
    g.setTransform(k * inset, 0, 0, k * inset, m.width * (1 - inset) / 2, m.height * (1 - inset) / 2);
    g.fillStyle = '#fff'; g.fill(new Path2D(outline));
    const t = new THREE.CanvasTexture(m);
    t.flipY = true;
    return t;
  };
  logoMaskU.value = mk(5, 0.9);
  const rimTex = mk(9, 0.96);

  const logoMat = new THREE.ShaderMaterial({
    transparent: true, toneMapped: false,
    uniforms: { uTex: { value: front.tex }, uRim: { value: rimTex }, uSky: skyU },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `uniform sampler2D uTex, uRim; uniform vec3 uSky; varying vec2 vUv;
      void main(){
        vec4 c = texture2D(uTex, vUv);
        // the cloud's lip shades the logo's upper-left edge (the key comes from there)
        float lip = texture2D(uRim, vUv + vec2(-0.012, 0.03)).r;
        c.rgb *= mix(mix(uSky, vec3(1.0), 0.45), vec3(1.0), smoothstep(0.35, 0.95, lip));
        gl_FragColor = c;
        #include <colorspace_fragment>
      }`
  });
  front.logo = new THREE.Mesh(new THREE.PlaneGeometry(LOGO_W, LOGO_H), logoMat);
  front.logo.position.set(LOGO_C.x, LOGO_C.y, 0.42);
  front.logo.renderOrder = 2;
  front.group.add(front.logo);
  frontMat.needsUpdate = true;
  poke(10);
}
function puffLetter(i, delay = 0) {
  const pc = front.pieces[i]; if (!pc) return;
  setTimeout(() => { pc.t = performance.now(); front.busy = true; poke(); }, delay);
}
function puffRow() { front.pieces.forEach((_, i) => puffLetter(i, i * 110)); }

// ---------- Load everything ----------
const ready = Promise.all([
  loadGLB('assets/models/grumpl.glb'),
  loadGLB('assets/models/cloud-bank.glb'),
  loadGLB('assets/models/cloud-front.glb'),
  buildLogo().catch((e) => console.error('logo', e)),
]).then(([fig, bank, fc]) => {
  // background rows of the bank stay put; the hero puff is copied under each Grumpl on the arc
  bank.scene.traverse((o) => {
    if (!o.isMesh) return;
    if (o.name === 'hero') slots.forEach((s) => s.cloud.add(meshOf(o, cloudMat)));
    else if (!o.name.startsWith('front')) scene.add(meshOf(o, cloudMat));
  });
  fc.scene.traverse((o) => { if (o.isMesh) front.group.add(meshOf(o, frontMat)); });

  const found = [];
  fig.scene.traverse((o) => { if (o.isMesh) found.push(o); });
  const rootInv = fig.scene.matrixWorld.clone().invert();
  const bodyMesh = found.find((o) => o.name === 'body');
  lightU.uLocal.value.copy(rootInv).multiply(bodyMesh.matrixWorld);
  slots.forEach((s) => {
    s.set = makeSet(s.f);
    const inner = new THREE.Group();
    inner.position.y = -COM_Y;
    found.forEach((o) => {
      if (!o.geometry.attributes.normal) o.geometry.computeVertexNormals();
      const m = new THREE.Mesh(o.geometry, s.set[o.name] || s.set.body);
      m.applyMatrix4(rootInv.clone().multiply(o.matrixWorld));
      inner.add(m);
      s.meshes.push(m);
      if (o.name === 'body' && s.set.sugar) { inner.updateMatrixWorld(true); sugarCoat(m, coarse ? 12000 : 20000); }
    });
    s.group.add(inner);
  });
  updateRing(0);
  resize();
  document.body.classList.add('ready');
  poke(30);
}).catch((e) => {
  document.getElementById('loading').textContent = 'The Grumpl could not load. Reload to try again.';
  console.error(e);
});

// ---------- Tint ----------
// The page wash takes the focused Grumpl's secondary color, softened to a pale pastel.
const tmpC = new THREE.Color();
function onFocus(f, i) {
  const hsl = {};
  tmpC.set(f.edge).getHSL(hsl);
  skyU.value.set(0x9fbcf0).lerp(tmpC.set(f.edge), 0.22);
  tintU.value.set(f.base);
  ui.focus(f, i);
}

// ---------- Jump ----------
function jump() {
  if (ring.t < 1) return;
  if (grip) release();
  body.wakeUp();
  const dir = Math.random() < 0.5 ? -1 : 1;
  body.velocity.set(0, Math.max(body.velocity.y, 6.2), 0);
  body.angularVelocity.set(0, body.angularVelocity.y + dir * 9, 0);
  twirlSteps = 280;
  navigator.vibrate?.(12);
  poke();
}

// ---------- Cushion ----------
const press = { s: 0, v: 0, rest: 0, prevVy: 0, lastBoop: 0 };
let offAt = 0;
function updateCushion(dt) {
  const p = body.position;
  const above = p.y - (LIFT + COM_Y);
  const onCrest = Math.abs(p.x) < 1.9 && Math.abs(p.z) < 1.1 && above < 0.6 && !grip;
  const target = onCrest ? 0.24 * (1 - THREE.MathUtils.smoothstep(above, 0.0, 0.6)) : 0;
  press.rest += (target - press.rest) * Math.min(1, dt * 10);
  if (onCrest && press.prevVy < -1.5 && body.velocity.y > press.prevVy + 1.2) {
    press.v += -press.prevVy * 0.16;
    // every landing makes the letters go boop boop boop
    const now = performance.now();
    if (-press.prevVy > 4 && now - press.lastBoop > 1200) { press.lastBoop = now; puffRow(); }
  }
  press.prevVy = body.velocity.y;
  if (dt > 0) {
    press.v += (-140 * press.s - 11 * press.v) * dt;
    press.s = THREE.MathUtils.clamp(press.s + press.v * dt, -0.05, 0.22);
  }
  pressU.value.set(p.x, CLOUD_TOP, p.z, press.rest + press.s);
  // knocked off the crest into the fluff: once he's still for a moment, he hops back home
  if (!onCrest && !grip && body.velocity.length() < 0.6 && above < 0.2) {
    if (!offAt) offAt = performance.now();
    else if (performance.now() - offAt > 1400) {
      offAt = 0;
      const t = 0.75;
      body.wakeUp();
      body.quaternion.set(0, 0, 0, 1);
      body.velocity.set(-p.x / t, 6.5, -p.z / t);
      body.angularVelocity.set(0, (Math.random() - 0.5) * 6, 0);
      twirlSteps = 260;
    }
  } else offAt = 0;
}

// ---------- Input ----------
const raycaster = new THREE.Raycaster();
const ndc = new THREE.Vector2();
const dragPlane = new THREE.Plane();
const handTarget = new THREE.Vector3();
const canvas = renderer.domElement;
let mode = null, sx = 0, sy = 0, lastY = 0;
const toNdc = (e) => { const r = canvas.getBoundingClientRect(); ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); };
function handPoint() {
  raycaster.setFromCamera(ndc, camera);
  if (!raycaster.ray.intersectPlane(dragPlane, handTarget)) return;
  handTarget.x = THREE.MathUtils.clamp(handTarget.x, -BOUNDS.x + 0.3, BOUNDS.x - 0.3);
  handTarget.y = THREE.MathUtils.clamp(handTarget.y, -0.6, BOUNDS.top - 0.3);
  handTarget.z = THREE.MathUtils.clamp(handTarget.z, BOUNDS.zBack + 0.3, BOUNDS.zFront - 0.3);
}
function hitSlot() {
  raycaster.setFromCamera(ndc, camera);
  let best = null;
  slots.forEach((s, i) => {
    if (!s.group.visible) return;
    const h = raycaster.intersectObjects(s.meshes, false)[0];
    if (h && (!best || h.distance < best.h.distance)) best = { i, h };
  });
  return best;
}
canvas.addEventListener('pointerdown', (e) => {
  toNdc(e);
  sx = e.clientX; sy = lastY = e.clientY;
  const hit = ring.t >= 1 ? hitSlot() : null;
  if (hit && hit.i === ring.f) {
    canvas.setPointerCapture(e.pointerId);
    mode = 'grab';
    const p = hit.h.point;
    dragPlane.setFromNormalAndCoplanarPoint(camera.getWorldDirection(new THREE.Vector3()).negate(), p);
    hand.position.set(p.x, p.y, p.z);
    handTarget.copy(p);
    grip = new CANNON.PointToPointConstraint(body, body.pointToLocalFrame(new CANNON.Vec3(p.x, p.y, p.z)), hand, new CANNON.Vec3(0, 0, 0), 40);
    world.addConstraint(grip);
    body.angularDamping = 0.7;
    body.wakeUp();
    canvas.style.cursor = 'grabbing';
    ui.played();
  } else if (hit) {
    mode = 'tap'; mode_i = hit.i;
  } else {
    mode = 'swipe';
    canvas.setPointerCapture(e.pointerId);
  }
});
let mode_i = -1;
canvas.addEventListener('pointermove', (e) => {
  toNdc(e);
  if (mode === 'grab') { handPoint(); return; }
  if (mode === 'swipe' && coarse) {                       // vertical drags off the Grumpl still scroll the page
    const dy = e.clientY - lastY; lastY = e.clientY;
    if (Math.abs(e.clientY - sy) > Math.abs(e.clientX - sx)) scrollBy(0, -dy);
    return;
  }
  if (!mode && !coarse) {
    const h = hitSlot();
    canvas.style.cursor = h ? (h.i === ring.f ? 'grab' : 'pointer') : 'default';
  }
});
function release() {
  if (grip) { world.removeConstraint(grip); grip = null; }
  hand.velocity.setZero();
  body.angularDamping = 0.3;
  canvas.style.cursor = 'default';
}
canvas.addEventListener('pointerup', (e) => {
  const dx = e.clientX - sx, dy = e.clientY - sy;
  if (mode === 'swipe' && Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.2) step(dx < 0 ? 1 : -1);
  else if (mode === 'tap' && Math.hypot(dx, dy) < 12) focus(mode_i);
  mode = null; release();
});
canvas.addEventListener('pointercancel', () => { mode = null; release(); });
canvas.addEventListener('dblclick', standUp);
const step = (d) => focus(ring.f + d, d);
addEventListener('keydown', (e) => {
  if (e.target.closest?.('input, textarea, [contenteditable]')) return;
  if (e.key === 'ArrowLeft') step(-1);
  else if (e.key === 'ArrowRight') step(1);
  else if (e.code === 'Space' && scrollY < innerHeight * 0.6) { e.preventDefault(); jump(); }
});
['pointerdown', 'keydown', 'resize'].forEach((ev) => addEventListener(ev, () => { poke(); idleAt = performance.now(); }, true));

// idle: the letters puff one after another, like on the brand book
let idleAt = performance.now();
if (!reduceMotion) setInterval(() => {
  if (performance.now() - idleAt > 6000 && document.visibilityState === 'visible') { puffRow(); idleAt = performance.now(); }
}, 700);

// ---------- Tilt and shake (phones; from the drop site, grumpl/handoff/motion) ----------
// Tilt: the camera leans with the phone, so you look around him a little. Past 12° he slides downhill.
// Shake: a jostle sets him wobbling; a hard shake tosses him the opposite way to the phone, like a toy in a box.
const camBase = new THREE.Vector3();
const par = { cur: new THREE.Vector3(), want: new THREE.Vector3() };
const motion = createMotion({
  onTilt({ x, y, slide }) { par.want.set(x * 0.9, y * 0.6, 0); tiltG = slide * 0.45; },
  onWobble({ dir, strength }) {
    if (ring.t < 1 || grip) return;
    body.wakeUp();
    body.angularVelocity.x += -dir[2] * strength; body.angularVelocity.y += (Math.random() - 0.5) * strength; body.angularVelocity.z += dir[0] * strength;
    body.velocity.y = Math.max(body.velocity.y, 1.5);
    haptic(10); poke();
  },
  onToss({ velocity }) {
    if (ring.t < 1 || grip) return;
    body.wakeUp();
    body.velocity.set(velocity[0], Math.max(velocity[1], 3), velocity[2]);
    body.angularVelocity.set((Math.random() - 0.5) * 10, (Math.random() - 0.5) * 12, (Math.random() - 0.5) * 10);
    twirlSteps = 260;
    haptic([18, 30, 12]); poke();
  },
});
let lastWallHit = 0;
body.addEventListener('collide', (e) => {
  if (!motion.on || e.body === crest || e.body === floorB || e.body === hand) return;
  const v = Math.abs(e.contact.getImpactVelocityAlongNormal()), now = performance.now();
  if (v > 2 && now - lastWallHit > 90) { lastWallHit = now; haptic(Math.min(28, v * 2.2)); }
});

// ---------- Layout ----------
const _r = new THREE.Vector3(), _n = new THREE.Vector3();
function screenToPlaneZ(nx, ny, z, out) {
  raycaster.setFromCamera(_n.set(nx, ny, 0), camera);
  const t = (z - raycaster.ray.origin.z) / raycaster.ray.direction.z;
  return out.copy(raycaster.ray.origin).addScaledVector(raycaster.ray.direction, t);
}
function resize() {
  const w = innerWidth, h = stage.clientHeight || innerHeight;
  renderer.setSize(w, h, false);
  const aspect = w / h;
  camera.aspect = aspect;
  const tanH = Math.tan(THREE.MathUtils.degToRad(16));
  const portrait = aspect < 0.8;
  // He commands the frame: on a phone he fills most of the width; on a wide screen, about half the height.
  const dist = portrait ? Math.max(6.4, 2.5 / (2 * tanH * aspect)) : Math.max(5.6, 2.3 / (2 * tanH * Math.min(aspect, 1.3)) * 0.92);
  const halfH = tanH * dist;
  // his middle sits a little above centre; the foreground cloud takes the bottom
  const centreNdc = portrait ? 0.08 : 0.02;
  lookAt.set(0, LIFT + 1.0 - centreNdc * halfH, 0);
  camBase.set(0, lookAt.y + dist * 0.13, dist);
  camera.position.copy(camBase).add(par.cur);
  camera.lookAt(lookAt);
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld();
  // walls at the screen's edges, measured where he stands
  const halfW = halfH * aspect;
  const wx = Math.max(1.3, Math.min(5, halfW - 0.55));
  wallL.position.x = -wx; wallR.position.x = wx;
  // the neighbours stand well back: smaller, half out of frame on a phone, framing him on a wide screen
  ARC = portrait ? { rx: Math.max(1.7, halfW * 1.5), rz: 4.6, step: THREE.MathUtils.degToRad(58) }
                 : { rx: Math.min(4.2, halfW * 0.95), rz: 4.2, step: THREE.MathUtils.degToRad(58) };
  // the foreground cloud: logo across most of a phone, a modest badge on a wide screen
  const depth = dist - FRONT_Z;
  const halfWf = tanH * depth * aspect;
  const logoW = portrait ? halfWf * 2 * 0.8 : Math.min(halfWf * 2 * 0.24, tanH * depth * 2 * 0.3 * 1.72);
  front.s = logoW / LOGO_W;
  front.group.scale.setScalar(front.s);
  screenToPlaneZ(0, portrait ? -0.56 : -0.74, FRONT_Z, _r);
  front.group.position.set(_r.x - LOGO_C.x * front.s, _r.y - LOGO_C.y * front.s, FRONT_Z - 0.42 * front.s);
  ui.layout?.({ portrait });
  poke(4);
}
addEventListener('resize', resize);

// ---------- Frame loop ----------
const _v = new THREE.Vector3(), _c3 = new THREE.Vector3();
const backDirW = new THREE.Vector3(0, 0.25, -1).normalize();
const clock = new THREE.Clock();
let lastFrameAt = 0, frameAvg = 16.7, fastRun = 0, lastSig = '';
function adaptResolution() {
  const now = performance.now(), gap = now - lastFrameAt;
  lastFrameAt = now;
  if (gap > 100) return;
  frameAvg += (gap - frameAvg) * 0.1;
  if (frameAvg > 22 && dprIdx > 0) { dprMax = --dprIdx; frameAvg = 16.7; fastRun = 0; renderer.setPixelRatio(DPR_STEPS[dprIdx]); resize(); }
  else if (frameAvg < 18) { if (++fastRun > 90 && dprIdx < dprMax) { dprIdx++; fastRun = 0; renderer.setPixelRatio(DPR_STEPS[dprIdx]); resize(); } }
  else fastRun = 0;
}
window.__grumpl = { renderer, scene, camera, ring, slots, focus: (i) => focus(i), jump, puffRow };
const ui = initUI({ DROP, FLAVORS, focus: (i) => focus(i), step, jump, motion, canMove });
onFocus(FLAVORS[0], 0);
resize();

renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), 1 / 20);
  if (!slots[0].set) return;
  if (grip && dt > 0) hand.velocity.set((handTarget.x - hand.position.x) / dt * 0.6, (handTarget.y - hand.position.y) / dt * 0.6, (handTarget.z - hand.position.z) / dt * 0.6);
  motion.tick();
  if (motion.on) {
    par.cur.lerp(par.want, Math.min(1, dt * 6));
    if (par.cur.distanceToSquared(par.want) > 1e-6) { camera.position.copy(camBase).add(par.cur); camera.lookAt(lookAt); poke(2); }
  }
  updateRing(dt);
  const g = focusGroup();
  if (ring.t >= 1) {
    world.step(1 / 60, dt, 4);
    if (body.position.y < -4) standUp();
    updateCushion(dt);
    g.position.copy(body.position); g.position.y -= press.s;
    g.quaternion.copy(body.quaternion);
  }
  // fixed key, aimed at the focused Grumpl
  const flat = Math.cos(KEY.el) * KEY.r;
  key.position.set(Math.sin(KEY.az) * flat, Math.sin(KEY.el) * KEY.r + 0.3 + LIFT, Math.cos(KEY.az) * flat);
  key.target.position.set(g.position.x * 0.5, LIFT + 0.8, g.position.z * 0.5);
  const vm = camera.matrixWorldInverse;
  lightU.uKeyPosV.value.copy(key.position).applyMatrix4(vm);
  rims.forEach((r, i) => lightU.uRimDirV.value[i].copy(_v.copy(r.position).sub(g.position).normalize().transformDirection(vm)));
  lightU.uBackDirV.value.copy(backDirW).transformDirection(vm);
  g.updateMatrixWorld(true);
  OCC_LOCAL.forEach(([p, r], i) => { _c3.copy(p).applyMatrix4(g.matrixWorld); occU.value[i].set(_c3.x, _c3.y, _c3.z, r); });
  if (front.busy && front.draw) { front.busy = front.draw(); poke(2); }

  const p = g.position, q = g.quaternion;
  const sig = [p.x, p.y, p.z, q.x, q.y, q.z, pressU.value.w, ring.show].map((v) => v.toFixed(4)).join();
  if (sig !== lastSig || kick > 0 || grip) {
    adaptResolution();
    renderer.render(scene, camera);
    lastSig = sig;
    kick = Math.max(0, kick - 1);
  }
});
