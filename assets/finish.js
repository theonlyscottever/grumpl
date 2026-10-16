// The selected Grumpl's surface, for everything that isn't him: the logo and every button wear it.
// Scott (2026-10-16): chrome Grumpl, chrome logo and buttons; flocked Grumpl, flocked; vinyl (blue now, pure white
// later), vinyl. All lit by the one forest room (room.js), plus a soft light that follows the cursor or finger.
import * as THREE from 'three';

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
    clearcoatRoughness: 0.25, sheen: 0.5, sheenRoughness: 0.5, envMapIntensity: 0.6, opacity: 0.9, edgeAmt: 0.6, fuzz: 0 };
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
