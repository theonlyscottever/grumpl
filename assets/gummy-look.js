// The gummy baseline: the look Scott picked from the puff-logo experiment (gummy letters on the puffed
// cloud, lit by the warm room). Anything on the site that should read as gummy candy starts here:
//   const room = await warmRoom(renderer);   scene.environment = room.texture;
//   gummyRenderer(renderer, room);            // neutral tone mapping + the room's exposure
//   const mat = gummyMaterial('clear', '#ff5a4a');
//   sugarCoat(mesh, { count: 800, size: 0.02 });   // the sour finish
// The room's light is the HDRI (Poly Haven st_fagans_interior, warm window light, 512 px). The experiment
// rotated the room with the cursor; three 0.160 has no scene.environmentRotation, so callers rotate their
// camera and model together instead (see envRig below), which lights the candy exactly the same way.
import * as THREE from 'three';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { MeshSurfaceSampler } from 'three/addons/math/MeshSurfaceSampler.js';

export const WARM_ROOM = { url: new URL('./hdri/warm-room-512.hdr', import.meta.url).href, exposure: 1.1, rotation: 4 * Math.PI / 3 };

let roomPromise = null;
// Loads the room once per page and prefilters it for the given renderer.
export function warmRoom(renderer) {
  if (!roomPromise) roomPromise = new RGBELoader().setDataType(THREE.HalfFloatType).loadAsync(WARM_ROOM.url).then((t) => {
    t.mapping = THREE.EquirectangularReflectionMapping;
    const pm = new THREE.PMREMGenerator(renderer);
    const texture = pm.fromEquirectangular(t).texture;
    pm.dispose(); t.dispose();
    return { texture, exposure: WARM_ROOM.exposure, rotation: WARM_ROOM.rotation };
  });
  return roomPromise;
}

// Khronos PBR Neutral, the tone mapping the experiment used (three added it in r162; this page runs r160).
const NEUTRAL = `vec3 CustomToneMapping( vec3 color ) {
  const float startCompression = 0.8 - 0.04;
  const float desaturation = 0.15;
  color *= toneMappingExposure;
  float x = min( color.r, min( color.g, color.b ) );
  float offset = x < 0.08 ? x - 6.25 * x * x : 0.04;
  color -= offset;
  float peak = max( color.r, max( color.g, color.b ) );
  if ( peak < startCompression ) return color;
  float d = 1. - startCompression;
  float newPeak = 1. - d * d / ( peak + d - startCompression );
  color *= newPeak / peak;
  float g = 1. - 1. / ( desaturation * ( peak - newPeak ) + 1. );
  return mix( color, vec3( newPeak ), g );
}`;
export function gummyRenderer(renderer, room) {
  if (THREE.NeutralToneMapping !== undefined) renderer.toneMapping = THREE.NeutralToneMapping;
  else {
    const chunk = THREE.ShaderChunk.tonemapping_pars_fragment;
    if (!chunk.includes('startCompression')) THREE.ShaderChunk.tonemapping_pars_fragment = chunk.replace('vec3 CustomToneMapping( vec3 color ) { return color; }', NEUTRAL);
    renderer.toneMapping = THREE.CustomToneMapping;
  }
  renderer.toneMappingExposure = room ? room.exposure : WARM_ROOM.exposure;
}

// Turning the room: rotate a rig that holds both the camera and the candy by -angle, and the highlights
// slide across the gummy as if the room itself turned. yaw/pitch are the experiment's environmentRotation.
export function envRig(rig, yaw, pitch) { rig.rotation.set(-pitch, -yaw, 0, 'YXZ'); }

// ---------- The finishes ----------
// clear: the experiment's gummy letters. Fully transmissive jelly, the colour lives in the volume.
// milky: the experiment's puffed cloud under the gummy finish. Opaque, soft, a velvet sheen at the edges.
// sour: clear jelly gone frosty under a sugar coat; pair it with sugarCoat() for the crystals.
// cola: the dark, glossy end of clear (cola bottles, the patty): short attenuation so it goes deep brown in the middle.
// Any of them can be two-tone: tone = { color, from, to } blends to a second colour along the model's own y.
const C = (c) => new THREE.Color(c);
const WHITE = new THREE.Color('#ffffff');
export const GUMMY = {
  clear: (c) => ({ color: C(c).lerp(WHITE, 0.55), roughness: 0.12, transmission: 1, thickness: 0.9, ior: 1.45,
    attenuationColor: C(c), attenuationDistance: 0.6, clearcoat: 0.8, clearcoatRoughness: 0.1 }),
  milky: (c) => ({ color: C(c), roughness: 0.55, sheen: 1, sheenColor: C('#ffffff'), sheenRoughness: 0.6 }),
  sour: (c) => ({ color: C(c).lerp(WHITE, 0.25), roughness: 0.42, transmission: 0.82, thickness: 0.9, ior: 1.45,
    attenuationColor: C(c), attenuationDistance: 0.5, sheen: 0.7, sheenColor: C('#ffffff'), sheenRoughness: 0.75 }),
  cola: (c) => ({ color: C(c).lerp(WHITE, 0.3), roughness: 0.16, transmission: 1, thickness: 1, ior: 1.46,
    attenuationColor: C(c), attenuationDistance: 0.22, clearcoat: 1, clearcoatRoughness: 0.06 }),
};
// opts: anything MeshPhysicalMaterial takes, to nudge a finish (thickness to match the model, say), plus tone.
export function gummyMaterial(kind, color, opts = {}) {
  const { tone, ...rest } = opts;
  const m = new THREE.MeshPhysicalMaterial({ ...GUMMY[kind](color), ...rest });
  m.userData.gummy = kind;
  const U = tone ? { uTone: { value: C(tone.color) }, uToneFrom: { value: tone.from }, uToneTo: { value: tone.to } } : {};
  m.userData.tone = tone ? U : null;
  const deep = m.transmission > 0;
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, U);
    if (tone) {
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', '#include <common>\nvarying float vToneY;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvToneY = position.y;');
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', '#include <common>\nvarying float vToneY; uniform vec3 uTone; uniform float uToneFrom, uToneTo;')
        .replace('#include <color_fragment>', '#include <color_fragment>\ndiffuseColor.rgb = mix(diffuseColor.rgb, uTone, smoothstep(uToneFrom, uToneTo, vToneY));');
    }
    // Jelly is deeper at the silhouette: light crossing the edge travels further through it, so the edges
    // go rich and saturated while the middle stays bright. Three treats thickness as one number; this
    // stretches it by the viewing angle.
    if (deep) sh.fragmentShader = sh.fragmentShader.replace('#include <transmission_fragment>',
      THREE.ShaderChunk.transmission_fragment.replace('material.thickness = thickness;',
        'material.thickness = thickness * mix(2.2, 0.6, pow(saturate(dot(normal, normalize(vViewPosition))), 0.7));'));
  };
  m.customProgramCacheKey = () => `gummy-${tone ? 'tone' : 'flat'}-${deep ? 'deep' : 'opaque'}`;
  return m;
}

// ---------- The sour coat ----------
// Same idea as the figure's sugarCoat in grumpl-look.js (tiny glossy crystals scattered over the surface),
// with the crystal size given in the model's own units so it works at any scale.
const crystalMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.12, metalness: 0, envMapIntensity: 2.5 });
export function sugarCoat(mesh, { count = 600, size = 0.02, seed = 1 } = {}) {
  const sampler = new MeshSurfaceSampler(mesh).build();
  let s = seed * 9301 + 49297;
  const rand = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
  sampler.setRandomGenerator(rand);
  const inst = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), crystalMat, count);
  const p = new THREE.Vector3(), n = new THREE.Vector3(), q = new THREE.Quaternion();
  const e = new THREE.Euler(), sc = new THREE.Vector3(), m4 = new THREE.Matrix4();
  for (let i = 0; i < count; i++) {
    sampler.sample(p, n);
    const k = size * (0.45 + rand() * 0.8);
    p.addScaledVector(n, k * 0.2);
    q.setFromEuler(e.set(rand() * 6.3, rand() * 6.3, rand() * 6.3));
    sc.set(k, k * (0.7 + rand() * 0.5), k * (0.7 + rand() * 0.5));
    inst.setMatrixAt(i, m4.compose(p, q, sc));
  }
  inst.instanceMatrix.needsUpdate = true;
  mesh.add(inst);
  return inst;
}
