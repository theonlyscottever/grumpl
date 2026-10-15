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

let hdrPromise = null;
const rooms = new WeakMap();
// Loads the room once per page and prefilters it once per renderer (a prefiltered texture belongs to one
// WebGL context, so two canvases each get their own).
export function warmRoom(renderer) {
  if (!hdrPromise) hdrPromise = new RGBELoader().setDataType(THREE.HalfFloatType).loadAsync(WARM_ROOM.url).then((t) => {
    t.mapping = THREE.EquirectangularReflectionMapping;
    return t;
  });
  if (!rooms.has(renderer)) rooms.set(renderer, hdrPromise.then((t) => {
    const pm = new THREE.PMREMGenerator(renderer);
    const texture = pm.fromEquirectangular(t).texture;
    pm.dispose();
    return { texture, exposure: WARM_ROOM.exposure, rotation: WARM_ROOM.rotation };
  }));
  return rooms.get(renderer);
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

// ---------- The fast finish ----------
// One cheap opaque material for every finish at once, for things that must run at 60 fps on a phone (the
// menu burger). No transmission pass: the jelly is faked on top of MeshStandardMaterial's room lighting.
// Per vertex: color (vertex colours, linear) and aMat = (jelly, sour, gloss), each 0..1.
//   jelly: saturated, deeper edges, a light glow through the middle, and the cursor lamp shining through it.
//   sour:  frosted, with sugar grains as a procedural sparkle (fades to an even frost when grains get
//          smaller than a pixel, so tiny copies don't shimmer).
//   gloss: roughness 0.65 -> 0.1 and a tighter lamp highlight.
// The lamp is analytic: a point above the screen at uniforms.uLamp.value = (x, y, height) in framebuffer
// pixels (gl_FragCoord space); uniforms.uLampOn scales it (0 = off).
export function fastGummyUniforms() {
  return { uLamp: { value: new THREE.Vector3(0, 0, 300) }, uLampOn: { value: 1 }, uLampColor: { value: new THREE.Color('#fff2de') } };
}
export function fastGummyMaterial(uniforms = fastGummyUniforms()) {
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.65, metalness: 0 });
  m.userData.uniforms = uniforms;
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, uniforms);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec3 aMat; varying vec3 vMat; varying vec3 vObj;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvMat = aMat; vObj = position;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
varying vec3 vMat; varying vec3 vObj;
uniform vec3 uLamp; uniform float uLampOn; uniform vec3 uLampColor;
float gHash(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }`)
      .replace('#include <roughnessmap_fragment>', 'float roughnessFactor = mix(roughness, 0.1, vMat.z);')
      .replace('#include <opaque_fragment>', `{
  vec3 base = diffuseColor.rgb;
  float jelly = vMat.x, sour = vMat.y, gloss = vMat.z;
  vec3 V = geometryViewDir;
  float ndv = saturate(dot(normal, V));
  float fres = pow(1.0 - ndv, 2.0);
  // jelly: the edges go deep and saturated, the middle glows as if lit through
  outgoingLight *= mix(vec3(1.0), base * 1.4 + 0.08, fres * jelly * 0.85);
  outgoingLight += base * (0.42 * pow(ndv, 1.4) * jelly);
  // the lamp
  vec2 d = uLamp.xy - gl_FragCoord.xy;
  vec3 L = normalize(vec3(d, uLamp.z));
  vec3 H = normalize(L + V);
  float wrap = saturate((dot(normal, L) + 0.6) / 1.6);
  float near = exp(-dot(d, d) / (uLamp.z * uLamp.z * 2.0));
  outgoingLight += uLampOn * base * (wrap * 0.22 + near * jelly * 0.5);
  float spec = pow(saturate(dot(normal, H)), mix(18.0, 140.0, gloss)) * (0.12 + 1.1 * gloss);
  outgoingLight += uLampOn * uLampColor * spec;
  // soft rim
  outgoingLight += mix(vec3(1.0), base, 0.5) * fres * (0.1 + 0.18 * jelly);
  // sugar
  if (sour > 0.01) {
    vec3 q = vObj * 30.0, c = floor(q);
    vec3 o = vec3(gHash(c + 3.1), gHash(c + 7.7), gHash(c + 11.3));
    float dd = length(fract(q) - (0.2 + 0.6 * o));
    float crisp = 1.0 - smoothstep(0.3, 0.8, length(fwidth(q)));
    float grain = (1.0 - smoothstep(0.17, 0.3, dd)) * step(0.3, gHash(c));
    vec3 cn = normalize(normal + (o - 0.5) * 1.8);
    float glint = pow(saturate(dot(cn, H)), 30.0) * uLampOn + pow(saturate(dot(cn, normalize(V + vec3(-0.5, 0.7, 0.4)))), 24.0);
    outgoingLight += sour * (0.035 + fres * 0.16);
    outgoingLight += sour * mix(0.06, grain * (0.45 + 1.8 * glint), crisp);
  }
}
#include <opaque_fragment>`);
  };
  m.customProgramCacheKey = () => 'gummy-fast-1';
  return m;
}
