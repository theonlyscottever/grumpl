// One cloud (Scott 2026-10-17): a single solid cloud across the bottom of the hero. It blankets the bottoms of
// the rotating platforms, holds the logo, and its underside is the header you see once you scroll. One surface,
// so the light rolls over all of it the same way and nothing is cropped or laid over anything else.
// Built as a metaball field (soft blobs that melt into each other, so there are no creases or points where two
// meet) and turned into a mesh with marching cubes.
import * as THREE from 'three';
import { MarchingCubes } from 'three/addons/objects/MarchingCubes.js';

// blob falloff: smooth and exactly zero past twice the radius, so nothing is truncated into a seam
const ISO = 0.42;                      // (1 - 1/4)^3: a lone blob's surface is its own ellipsoid
function field(blobs, x, y, z) {
  let f = 0;
  for (const b of blobs) {
    const dx = (x - b.x) / b.rx, dy = (y - b.y) / b.ry, dz = (z - b.z) / b.rz, d = dx * dx + dy * dy + dz * dz;
    if (d < 4) { const t = 1 - d / 4; f += t * t * t; }
  }
  return f;
}

// blobs: [{x, y, z, rx, ry, rz}], box: {x0, x1, y0, y1, z0, z1}, all in the same units as the result
export function buildCloud(blobs, box, R) {
  const mc = new MarchingCubes(R, new THREE.MeshBasicMaterial(), false, false, 400000);
  mc.isolation = ISO;
  const F = mc.field, cx = (box.x0 + box.x1) / 2, cy = (box.y0 + box.y1) / 2, cz = (box.z0 + box.z1) / 2;
  const sx = (box.x1 - box.x0) / 2, sy = (box.y1 - box.y0) / 2, sz = (box.z1 - box.z0) / 2;
  const idx = (v, c, s) => (v - c) / s * (R / 2) + R / 2;            // world to cell
  for (const b of blobs) {
    const lo = (v, r, c, s) => Math.max(0, Math.floor(idx(v - 2 * r, c, s))), hi = (v, r, c, s) => Math.min(R - 1, Math.ceil(idx(v + 2 * r, c, s)));
    const x0 = lo(b.x, b.rx, cx, sx), x1 = hi(b.x, b.rx, cx, sx), y0 = lo(b.y, b.ry, cy, sy), y1 = hi(b.y, b.ry, cy, sy);
    const z0 = lo(b.z, b.rz, cz, sz), z1 = hi(b.z, b.rz, cz, sz);
    for (let k = z0; k <= z1; k++) {
      const dz = ((k - R / 2) / (R / 2) * sz + cz - b.z) / b.rz, dz2 = dz * dz;
      for (let j = y0; j <= y1; j++) {
        const dy = ((j - R / 2) / (R / 2) * sy + cy - b.y) / b.ry, dyz = dy * dy + dz2;
        if (dyz >= 4) continue;
        const row = k * R * R + j * R;
        for (let i = x0; i <= x1; i++) {
          const dx = ((i - R / 2) / (R / 2) * sx + cx - b.x) / b.rx, d = dx * dx + dyz;
          if (d < 4) { const t = 1 - d / 4; F[row + i] += t * t * t; }
        }
      }
    }
  }
  mc.update();
  const n = mc.count, P = mc.positionArray, N = mc.normalArray;
  const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), col = new Float32Array(n * 3);
  // marching cubes works in a -1..1 cube: stretch it back to the box (normals by the inverse)
  const rAvg = blobs.reduce((a, b) => a + b.ry, 0) / blobs.length;
  for (let v = 0; v < n; v++) {
    const o = v * 3;
    const x = P[o] * sx + cx, y = P[o + 1] * sy + cy, z = P[o + 2] * sz + cz;
    let nx = N[o] / sx, ny = N[o + 1] / sy, nz = N[o + 2] / sz;
    const l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l;
    pos[o] = x; pos[o + 1] = y; pos[o + 2] = z;
    nor[o] = nx; nor[o + 1] = ny; nor[o + 2] = nz;
    // soft shade in the folds: a little way out along the normal, how much cloud is still around
    const f = field(blobs, x + nx * rAvg * 0.45, y + ny * rAvg * 0.45, z + nz * rAvg * 0.45);
    const ao = 1 - THREE.MathUtils.smoothstep(f, ISO * 0.35, ISO * 1.1) * 0.85;
    col[o] = col[o + 1] = col[o + 2] = ao;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.computeBoundingSphere();
  mc.geometry.dispose();
  return geo;
}
