// The Grumpl's look, shared by the hero stage and the pose-and-download studio:
// the studio environment, the airbrushed vinyl / gummy / flock body shader, and the model loader.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshSurfaceSampler } from 'three/addons/math/MeshSurfaceSampler.js';

// ---------- The light: one fixed product-photography setup ----------
// Shot like a vinyl toy on a white sweep:
// - key: a big soft box high and to camera-left (about 35° round, 50° up), so his round belly
//   turns from light to shade left to right and his ears and brow throw a little form shadow;
// - two tall strip boxes behind, left and right, tracing his silhouette so he separates from the white;
// - an overhead scrim for a soft top light on his head and ears;
// - a low white bounce card in front, so the shadow side opens up but never goes flat;
// - eyes see only two small, crisp windows: one clean catchlight each, like a teddy bear's.
// The environment map carries the soft wrap and the long curved highlights; real lights add the shape.
export function buildStudioEnv(renderer, eyesOnly = false) {
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

const EYES = { color: 0x080809, roughness: 0.05, clearcoat: 1, clearcoatRoughness: 0.02, specularIntensity: 1, envMapIntensity: 1.0 };
const TEETH = { color: 0xf6f0e3, roughness: 0.5, envMapIntensity: 0.9 };
export function finishFor(f) {
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

// Light uniforms for the body shader (view-space directions, refreshed every frame by the scene that owns them)
export const makeLightU = () => ({
  uKeyPosV: { value: new THREE.Vector3() }, uKeyStrength: { value: 1 },
  uRimDirV: { value: [new THREE.Vector3(), new THREE.Vector3()] }, uBackDirV: { value: new THREE.Vector3() },
  uLocal: { value: new THREE.Matrix4() }
});
export const bodyCompile = (U) => (sh) => {
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
export const eyesCompile = (sh) => {
  // keep the edge strip lights out of the eyes: they drew white rims around them
  sh.fragmentShader = sh.fragmentShader.replace('#include <lights_fragment_begin>',
    THREE.ShaderChunk.lights_fragment_begin.replace('defined( RE_Direct_RectArea )', 'defined( RE_Direct_RectArea ) && 0'));
};
// f: a flavor {kind, base, edge, belly}; lightU from makeLightU(); eyeEnv from buildStudioEnv(renderer, true)
export function makeSet(f, lightU, eyeEnv) {
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
// recolor an existing set (same kind of finish) without recompiling
export function paintSet(set, f) {
  const fin = finishFor(f);
  set.U.uBase.value.set(fin.tint.base); set.U.uEdge.value.set(fin.tint.edge); set.U.uBelly.value.set(fin.tint.belly);
  set.U.uSss.value.set(fin.tint.sss);
}

export function sugarCoat(mesh, count) {
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


export async function loadGLB(url) {
  const buf = await (await fetch(url)).arrayBuffer();
  const gltf = await new GLTFLoader().parseAsync(buf, '');
  gltf.scene.updateMatrixWorld(true);
  return gltf;
}
// The figure: returns { group, meshes, set } with his feet at y = 0, using a fresh material set.
export function buildFigure(fig, f, lightU, eyeEnv, sugarCount = 12000) {
  const found = [];
  fig.scene.traverse((o) => { if (o.isMesh) found.push(o); });
  const rootInv = fig.scene.matrixWorld.clone().invert();
  const bodyMesh = found.find((o) => o.name === 'body');
  lightU.uLocal.value.copy(rootInv).multiply(bodyMesh.matrixWorld);
  const set = makeSet(f, lightU, eyeEnv);
  const group = new THREE.Group(), meshes = [];
  found.forEach((o) => {
    if (!o.geometry.attributes.normal) o.geometry.computeVertexNormals();
    const m = new THREE.Mesh(o.geometry, set[o.name] || set.body);
    m.name = o.name;
    m.applyMatrix4(rootInv.clone().multiply(o.matrixWorld));
    group.add(m); meshes.push(m);
    if (o.name === 'body' && set.sugar && sugarCount) { group.updateMatrixWorld(true); sugarCoat(m, sugarCount); }
  });
  return { group, meshes, set };
}
