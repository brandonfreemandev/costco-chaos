import * as THREE from 'three';

let cached: THREE.CanvasTexture | null = null;

/** Soft radial pool for fake light on the floor — no real lights. */
export function getFloorGlowTexture(): THREE.CanvasTexture {
  if (cached) return cached;

  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const cx = size / 2;
  const cy = size / 2;
  const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, size / 2);
  grad.addColorStop(0, 'rgba(255, 252, 235, 0.95)');
  grad.addColorStop(0.35, 'rgba(255, 248, 220, 0.35)');
  grad.addColorStop(0.7, 'rgba(255, 240, 200, 0.08)');
  grad.addColorStop(1, 'rgba(255, 240, 200, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  cached = tex;
  return tex;
}
