import * as THREE from 'three';

export type PerimeterDeptKey =
  | 'meat'
  | 'bakery'
  | 'produce'
  | 'dairy'
  | 'frozen'
  | 'pharmacy'
  | 'photo'
  | 'optical';

const cache = new Map<PerimeterDeptKey, THREE.CanvasTexture>();

function finish(tex: THREE.CanvasTexture): THREE.CanvasTexture {
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

/** Refrigerated case — packages behind glass, department-colored header band. */
function coolerTexture(
  bg: string,
  band: string,
  packages: string[],
  cols: number,
  rows: number,
): THREE.CanvasTexture {
  const w = 256;
  const h = 192;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  ctx.fillStyle = band;
  ctx.fillRect(0, 0, w, 22);

  const shelfRows = rows;
  const bandH = (h - 28) / shelfRows;
  for (let row = 0; row < shelfRows; row++) {
    const y0 = 26 + row * bandH;
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(0, y0 + bandH - 4, w, 3);

    for (let col = 0; col < cols; col++) {
      const cw = w / cols;
      const pad = 4;
      ctx.fillStyle = packages[(row + col) % packages.length];
      ctx.fillRect(col * cw + pad, y0 + 4, cw - pad * 2, bandH - 12);
      ctx.fillStyle = 'rgba(255,255,255,0.22)';
      ctx.fillRect(col * cw + pad + 2, y0 + 6, (cw - pad * 2) * 0.7, (bandH - 12) * 0.25);
    }
  }

  ctx.fillStyle = 'rgba(200,230,255,0.18)';
  ctx.fillRect(0, 22, w, h - 22);

  return finish(new THREE.CanvasTexture(canvas));
}

function serviceWallTexture(bg: string, accent: string, icon: string): THREE.CanvasTexture {
  const w = 256;
  const h = 192;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  ctx.fillStyle = accent;
  ctx.fillRect(0, 0, w, 36);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 22px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(icon, w / 2, 26);

  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      const bx = 18 + col * 78;
      const by = 52 + row * 44;
      ctx.fillStyle = row === 0 ? '#f8fafc' : '#e2e8f0';
      ctx.fillRect(bx, by, 68, 36);
      ctx.strokeStyle = 'rgba(0,0,0,0.08)';
      ctx.strokeRect(bx + 0.5, by + 0.5, 67, 35);
    }
  }

  return finish(new THREE.CanvasTexture(canvas));
}

function createTexture(key: PerimeterDeptKey): THREE.CanvasTexture {
  switch (key) {
    case 'meat':
      return coolerTexture('#eef2f7', '#b91c1c', ['#fecaca', '#fca5a5', '#f87171', '#dc2626', '#991b1b'], 5, 4);
    case 'bakery':
      return coolerTexture('#fef3c7', '#d97706', ['#fde68a', '#fcd34d', '#f59e0b', '#fef9c3', '#fff7ed'], 5, 3);
    case 'produce':
      return coolerTexture('#ecfdf5', '#15803d', ['#86efac', '#4ade80', '#fbbf24', '#ef4444', '#a3e635'], 6, 4);
    case 'dairy':
      return coolerTexture('#f0f9ff', '#0284c7', ['#ffffff', '#e0f2fe', '#bae6fd', '#fef08a', '#ffffff'], 5, 5);
    case 'frozen':
      return coolerTexture('#e0f2fe', '#0369a1', ['#ffffff', '#dbeafe', '#93c5fd', '#f0f9ff', '#bfdbfe'], 4, 5);
    case 'pharmacy':
      return serviceWallTexture('#f0fdf4', '#16a34a', 'PHARMACY');
    case 'photo':
      return serviceWallTexture('#faf5ff', '#7c3aed', 'PHOTO CENTER');
    case 'optical':
      return serviceWallTexture('#f8fafc', '#005dab', 'OPTICAL');
    default:
      return coolerTexture('#f1f5f9', '#64748b', ['#cbd5e1'], 3, 3);
  }
}

export function getPerimeterDeptTexture(key: PerimeterDeptKey): THREE.CanvasTexture {
  let tex = cache.get(key);
  if (!tex) {
    tex = createTexture(key);
    cache.set(key, tex);
  }
  return tex;
}
