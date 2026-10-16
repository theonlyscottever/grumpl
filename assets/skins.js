// Which elements wear the 3D skin (skin3d.js), and their shapes. Colors come from CSS (--skin, --skin-edge in
// skins.css), so hierarchy stays in the stylesheet: the buy button in the flavor's color, the rest white, lemon or ink.
// Elements that appear later (popups, the menu, artist bios) are picked up as they are added.
import { skin } from './skin3d.js';

const RULES = [
  ['#Cta .go', {}],
  ['#Cta .pop form button', {}],
  ['#Cta .close', { shape: 'x' }],
  ['.sound-btn, #Foot [data-sound]', {}],
  ['#Tilt', {}],
  ['#Info .more', {}],
  ['#Dock', { depth: 0.35 }],
  ['#Dock .ds button', { shape: 'round' }],
  ['#Dock .arw', { shape: 'round' }],
  ['#Jump', {}],
  ['#DropClose', { shape: 'x' }],
  ['#A-Close', { shape: 'x' }],
  ['#Menu .menu-x', { shape: 'x' }],
  [':is(#Drops, #DropOverlays) .remind button.go', {}],
  [':is(#Drops, #DropOverlays) .tilt', {}],
];

function scan(root = document) {
  for (const [sel, opts] of RULES) {
    if (root.matches?.(sel)) skin(root, opts);
    root.querySelectorAll?.(sel).forEach((el) => skin(el, opts));
  }
}
export function initSkins() {
  if (!window.WebGLRenderingContext) return;
  scan();
  new MutationObserver((list) => {
    for (const m of list) for (const n of m.addedNodes) if (n.nodeType === 1 && !n.classList.contains('skin3d')) scan(n);
  }).observe(document.body, { childList: true, subtree: true });
}
