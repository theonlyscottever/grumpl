// The cloud the sticky header hangs from (Scott 2026-10-16: the flat SVG read as clip art). It is rendered in 3D
// the way the logo's cloud badge is: soft white vinyl in the site's room, bright on its own (a white glow, a sky
// light and a key from the upper left) and lavender only underneath. A few big, smooth, uneven billows instead
// of many small bumps. Rendered once per width into a plain canvas, then the WebGL context is let go.
import * as THREE from 'three';
import { ROOM, roomEnv, NEUTRAL_TM } from './room.js';

export async function drawTopCloud(host, W, top) {
  const phone = W < 700, dpr = Math.min(devicePixelRatio || 1, 2);
  let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  // the billows: centres along a gently sagging line, larger in the middle under the logo
  const base = (x) => top + (phone ? 30 : 34) + (phone ? 14 : 22) * Math.exp(-(((x - W / 2) / (phone ? 120 : 210)) ** 2));
  const puffs = [];
  for (let x = -40 + rnd() * 30; x < W + 80;) {
    const r = (phone ? 34 : 46) + rnd() * (phone ? 26 : 40);
    puffs.push([x, base(x) - r * (0.62 + rnd() * 0.18), r * (1.25 + rnd() * 0.35), r]);   // x, y, rx, ry
    x += r * (1.5 + rnd() * 0.7);
  }
  const H = Math.ceil(Math.max(...puffs.map(([, y, , ry]) => y + ry))) + 6;

  const canvas = document.createElement('canvas');
  const R = new THREE.WebGLRenderer({ antialias: true, alpha: true, premultipliedAlpha: false });
  R.setPixelRatio(dpr); R.setSize(W, H, false); R.setClearColor(0x000000, 0);
  R.toneMapping = NEUTRAL_TM; R.toneMappingExposure = ROOM.exposure;
  const scene = new THREE.Scene();
  scene.environment = await roomEnv(R);
  scene.add(new THREE.HemisphereLight(0xffffff, 0xd3d5f3, 1.1));
  const key = new THREE.DirectionalLight(0xffffff, 0.9); key.position.set(-3, 5, 7); scene.add(key);
  const mat = new THREE.MeshPhysicalMaterial({ color: '#ffffff', roughness: 0.55, sheen: 0.6, sheenColor: new THREE.Color('#ffffff'), sheenRoughness: 0.5,
    clearcoat: 0.15, clearcoatRoughness: 0.3, emissive: new THREE.Color('#ffffff'), emissiveIntensity: 0.55, envMapIntensity: 0.45 });
  const ball = new THREE.SphereGeometry(1, 48, 24);
  // the body: a long flat bar across the top that the billows hang from
  const bar = new THREE.Mesh(ball, mat); bar.scale.set(W * 0.75, top + (phone ? 26 : 30), 30); bar.position.set(W / 2, -2, -40); scene.add(bar);
  for (const [x, y, rx, ry] of puffs) {
    const m = new THREE.Mesh(ball, mat);
    m.scale.set(rx, ry, Math.min(rx, ry) * 0.7); m.position.set(x, -y, -ry * 0.2); scene.add(m);
  }
  const cam = new THREE.OrthographicCamera(0, W, 0, -H, 1, 2000); cam.position.z = 600;
  R.render(scene, cam);
  canvas.width = R.domElement.width; canvas.height = R.domElement.height;
  Object.assign(canvas.style, { width: `${W}px`, height: `${H}px`, display: 'block' });
  canvas.getContext('2d').drawImage(R.domElement, 0, 0);
  ball.dispose(); mat.dispose(); R.dispose(); R.forceContextLoss();
  host.replaceChildren(canvas);
}
