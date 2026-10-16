// The selected Grumpl's surface, for everything that isn't him: the logo and every button wear it.
// Scott (2026-10-16): chrome Grumpl, chrome logo and buttons; flocked Grumpl, flocked; vinyl (blue now, pure white
// later), vinyl. All lit by the one forest room (room.js), plus a soft light that follows the cursor or finger.
import * as THREE from 'three';
import { flockTexture } from './grumpl-look.js';

// ---- which finish is on: the hero says when the focused flavor changes
export const finish = { kind: 'vinyl', flavor: null };
const subs = new Set();
export function onFinish(f) { subs.add(f); if (finish.flavor) f(finish); return () => subs.delete(f); }
export function setFinish(flavor) {
  finish.flavor = flavor; finish.kind = flavor.kind || 'vinyl';
  subs.forEach((f) => f(finish));
}

// ---- material values for a surface of color `hex` (and its airbrushed edge `edge`) in the current finish
const NUM = ['metalness', 'roughness', 'clearcoat', 'clearcoatRoughness', 'sheen', 'sheenRoughness', 'envMapIntensity', 'opacity', 'edgeAmt', 'fuzz'];
const COL = ['color', 'sheenColor', 'edge'];
export const SKIN_KEYS = { NUM, COL };
export function skinParams(kind, hex, edge = hex) {
  const c = new THREE.Color(hex), e = new THREE.Color(edge);
  const p = { color: c.clone(), edge: e.clone(), sheenColor: new THREE.Color(0xffffff), metalness: 0, roughness: 0.5, clearcoat: 0.3,
    clearcoatRoughness: 0.25, sheen: 0.5, sheenRoughness: 0.5, envMapIntensity: 0.4, opacity: 0.9, edgeAmt: 0.6, fuzz: 0 };
  if (kind === 'chrome') Object.assign(p, { metalness: 1, roughness: 0.1, clearcoat: 0, sheen: 0, envMapIntensity: 1.2, opacity: 1, edgeAmt: 0.35,
    color: c.clone().lerp(new THREE.Color(0xffffff), 0.12) });
  else if (kind === 'flock') Object.assign(p, { roughness: 1, clearcoat: 0, sheen: 1, sheenRoughness: 0.75, envMapIntensity: 0.9, opacity: 1, edgeAmt: 0.5, fuzz: 1,
    sheenColor: c.clone().lerp(new THREE.Color(0xffffff), 0.55) });
  else if (kind === 'gummy') Object.assign(p, { roughness: 0.12, clearcoat: 0.8, clearcoatRoughness: 0.1, sheen: 0, envMapIntensity: 1.1, opacity: 0.78, edgeAmt: 0.9 });
  return p;
}

// ---- the cursor light: where the pointer is on screen (css px). Touch moves it too, and it drifts home when idle.
export const cursor = { x: innerWidth * 0.3, y: innerHeight * 0.2, at: 0, gen: 0 };
const moved = new Set();
export function onCursor(f) { moved.add(f); return () => moved.delete(f); }
addEventListener('pointermove', (e) => { cursor.x = e.clientX; cursor.y = e.clientY; cursor.at = performance.now(); cursor.gen++; moved.forEach((f) => f()); }, { passive: true });
addEventListener('pointerdown', (e) => { cursor.x = e.clientX; cursor.y = e.clientY; cursor.at = performance.now(); cursor.gen++; moved.forEach((f) => f()); }, { passive: true });
// how bright the cursor light is: soft, never the key light
export const CURSOR_LIGHT = 0.9;

// ---- the flock, for the logo and the buttons: the Grumpl's own pile (grumpl-look.js flockTexture), cut down to
// what reads on a flat-on badge: the fibre tile mapped across the face, sunnier tips and deeper gaps, the tufts
// tipping the normal so the light catches the grain, and the pale satin edge where the surface turns away.
// uFlockAmt 0..1 blends it in and out, so a finish change can sweep across.
// scale: tiles per object unit. Call from onBeforeCompile with the material's own uniform objects.
export function flockShader(sh, U, scale) {
  U.uFlockTex ??= { value: flockTexture() };
  Object.assign(sh.uniforms, { uFlockTex: U.uFlockTex, uFlockAmt: U.uFlockAmt });
  sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vFP;')
    .replace('#include <begin_vertex>', '#include <begin_vertex>\nvFP = position;');
  sh.fragmentShader = sh.fragmentShader
    .replace('#include <common>', `#include <common>
      uniform sampler2D uFlockTex; uniform float uFlockAmt; varying vec3 vFP; float fFleck = 0.5; vec2 fG = vec2(0.0);`)
    .replace('#include <color_fragment>', `#include <color_fragment>
      if (uFlockAmt > 0.001) {
        vec4 ft = texture2D(uFlockTex, vFP.xy * ${scale.toFixed(4)} + 0.71);
        fFleck = clamp(0.5 + (ft.b - 0.5) * 1.15, 0.0, 1.0); fG = ft.rg * 2.0 - 1.0;
        vec3 fc = diffuseColor.rgb;
        vec3 fl = mix(pow(fc, vec3(1.15)) * vec3(0.96, 0.98, 1.0), pow(fc, vec3(0.78)) * vec3(1.06, 1.03, 0.91), fFleck);
        diffuseColor.rgb = mix(fc, fl, uFlockAmt);
      }`)
    .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
      vec3 fN0 = normal;
      if (uFlockAmt > 0.001) normal = normalize(normal - uFlockAmt * 1.1 * (vec3(fG, 0.0) - dot(vec3(fG, 0.0), normal) * normal));`)
    .replace('#include <lights_fragment_end>', `#include <lights_fragment_end>
      if (uFlockAmt > 0.001) {
        float fNV = saturate(dot(fN0, normalize(vViewPosition)));
        float side = pow(1.0 - fNV, 2.2) * mix(0.75, 1.25, fFleck);
        vec3 lift = vec3(1.0) + side * 0.6 * vec3(1.35, 1.12, 1.0);
        vec3 satin = pow(material.diffuseColor, vec3(0.55)) * vec3(1.15, 1.08, 0.85) * side * mix(0.2, 1.8, fFleck) * 0.5;
        reflectedLight.directDiffuse *= mix(vec3(1.0), lift * 0.8, uFlockAmt);
        reflectedLight.indirectDiffuse = mix(reflectedLight.indirectDiffuse, reflectedLight.indirectDiffuse * lift * 1.4 + satin, uFlockAmt);
      }`);
}
