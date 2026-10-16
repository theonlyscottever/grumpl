// The room: ONE environment for every 3D thing on the site (Scott, 2026-10-16): every Grumpl in every view
// (hero, info box, studio, butt hill), the 3D logo and the gummy burger, so a colorway renders the same
// everywhere. It is an open green meadow (512 px), which the rose chrome mirrors.
// The chrome and gummy pieces use Khronos Neutral tone mapping at exposure 1.1 (roomOnly), and the room
// swings with the cursor (or the phone's tilt) the same way for everything lit by it.
// r160 has no Neutral tone mapping and no environment rotation, so both go in by hand (the maths of r162+).
import * as THREE from 'three';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';

// Default is an open green meadow (pmndrs "park", Poly Haven CC0): Scott 2026-10-16 found the forest busy because of
// the trunks' vertical lines and asked for open greenery. ?room=forest|soft|meadow picks one to compare.
const ROOMS = {
  meadow: { file: 'meadow-512.hdr', rot: 4 * Math.PI / 3 },
  forest: { file: 'forest-512.hdr', rot: 4 * Math.PI / 3 },
  soft: { file: 'forest-soft-512.hdr', rot: 4 * Math.PI / 3 },
  // round 4 options (Scott: more contrast and clearer shapes; the gallery with the red benches is the fallback)
  gallery: { file: 'gallery-512.hdr', rot: 4 * Math.PI / 3 },
  coast: { file: 'coast-512.hdr', rot: 4 * Math.PI / 3 },
  hills: { file: 'hills-512.hdr', rot: 4 * Math.PI / 3 },
};
const pick = ROOMS[new URLSearchParams(location.search).get('room')] || ROOMS.meadow;
const rotQ = parseFloat(new URLSearchParams(location.search).get('roomrot'));
export const ROOM = { url: new URL(`./hdri/${pick.file}`, import.meta.url).href, exposure: 1.1, rot: Number.isFinite(rotQ) ? rotQ : pick.rot };

// where the cursor or the phone's tilt points, -1..1 (the hero writes it), and the room's turn from it
export const roomWant = new THREE.Vector2();
export const roomRot = { value: new THREE.Matrix3() };
const aim = new THREE.Vector2(), _e = new THREE.Euler(), _m = new THREE.Matrix4();
let lastAt = 0;
// The room's turn for a yaw/pitch on top of its 240°, into a rotation uniform
export const setTurn = (u, yaw, pitch) => u.value.setFromMatrix4(_m.makeRotationFromEuler(_e.set(-pitch, -(ROOM.rot + yaw), 0)));
// Eases the room toward the cursor; returns true while it is still moving. Safe to call from several loops
// in one frame (only the first call per frame moves it).
export function turnRoom(now = performance.now()) {
  if (now - lastAt >= 4) {
    const dt = Math.min((now - (lastAt || now)) / 1000, 0.05); lastAt = now;
    aim.lerp(roomWant, 1 - Math.exp(-dt * 4));
    setTurn(roomRot, aim.x * 0.9, aim.y * 0.25);
  }
  return aim.distanceToSquared(roomWant) > 1e-5;
}
export const roomAim = aim;
turnRoom(0);

// the HDRI is fetched once; each renderer gets its own prefiltered copy
let data = null;
const loadData = () => data ||= new RGBELoader().setDataType(THREE.HalfFloatType).loadAsync(ROOM.url);
const envs = new WeakMap();
export function roomEnv(renderer) {
  if (!envs.has(renderer)) envs.set(renderer, loadData().then((t) => {
    t.mapping = THREE.EquirectangularReflectionMapping;
    const pm = new THREE.PMREMGenerator(renderer);
    const tex = pm.fromEquirectangular(t).texture;
    pm.dispose();
    return tex;
  }));
  return envs.get(renderer);
}

export const NEUTRAL_GLSL = `vec3 roomNeutral( vec3 color ) {
  const float startCompression = 0.8 - 0.04;
  const float desaturation = 0.15;
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
// As a renderer-wide tone mapping (the logo's own canvas)
export const NEUTRAL_TM = (() => {
  if (THREE.NeutralToneMapping) return THREE.NeutralToneMapping;
  const chunk = THREE.ShaderChunk.tonemapping_pars_fragment;
  if (!chunk.includes('roomNeutral')) THREE.ShaderChunk.tonemapping_pars_fragment = chunk.replace('vec3 CustomToneMapping( vec3 color ) { return color; }',
    NEUTRAL_GLSL + '\nvec3 CustomToneMapping( vec3 color ) { return roomNeutral( color * toneMappingExposure ); }');
  return THREE.CustomToneMapping;
})();

// Patches a physical material's environment lookups to use the room's turn
export function turnEnv(sh, rot = roomRot) {
  sh.uniforms.uRoomRot = rot;
  sh.fragmentShader = sh.fragmentShader.replace('#include <envmap_physical_pars_fragment>', 'uniform mat3 uRoomRot;\n' +
    THREE.ShaderChunk.envmap_physical_pars_fragment
      .replace('textureCubeUV( envMap, worldNormal, 1.0 )', 'textureCubeUV( envMap, uRoomRot * worldNormal, 1.0 )')
      .replace('textureCubeUV( envMap, reflectVec, roughness )', 'textureCubeUV( envMap, uRoomRot * reflectVec, roughness )'));
}
// For a material inside a scene with other lighting (the hero, the studio): lit only by the room, with the
// room's own tone mapping, whatever the renderer uses for everything else
export function roomOnly(sh) {
  turnEnv(sh);
  sh.fragmentShader = sh.fragmentShader
    .replace('#include <common>', '#include <common>\n' + (THREE.ShaderChunk.tonemapping_pars_fragment.includes('roomNeutral') ? '' : NEUTRAL_GLSL))
    .replace('#include <lights_fragment_end>', '#include <lights_fragment_end>\nreflectedLight.directDiffuse = vec3( 0.0 ); reflectedLight.directSpecular = vec3( 0.0 );')
    .replace('#include <tonemapping_fragment>', `gl_FragColor.rgb = roomNeutral( gl_FragColor.rgb * ${ROOM.exposure.toFixed(3)} );`);
}
