import * as THREE from 'three';

function canvasTexture(
  draw: (ctx: CanvasRenderingContext2D, size: number) => void,
  repeat = 4,
): THREE.CanvasTexture {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  draw(ctx, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeat, repeat);
  tex.anisotropy = 8;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function noise(ctx: CanvasRenderingContext2D, size: number, alpha: number) {
  const img = ctx.getImageData(0, 0, size, size);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = 128 + (Math.random() - 0.5) * 90;
    img.data[i] = n;
    img.data[i + 1] = n;
    img.data[i + 2] = n;
    img.data[i + 3] = Math.floor(255 * alpha);
  }
  ctx.putImageData(img, 0, 0);
}

let warehouseFloorTex: THREE.CanvasTexture | null = null;
let warehouseAisleTex: THREE.CanvasTexture | null = null;
let asphaltTex: THREE.CanvasTexture | null = null;
let concreteTex: THREE.CanvasTexture | null = null;

/** Polished warehouse epoxy — subtle tile grid + wear. */
export function getWarehouseFloorTexture(): THREE.CanvasTexture {
  if (warehouseFloorTex) return warehouseFloorTex;
  warehouseFloorTex = canvasTexture((ctx, size) => {
    ctx.fillStyle = '#c8ccd2';
    ctx.fillRect(0, 0, size, size);
    const tile = size / 8;
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        const shade = 198 + ((x + y) % 2) * 8 + Math.random() * 6;
        ctx.fillStyle = `rgb(${shade}, ${shade + 2}, ${shade + 4})`;
        ctx.fillRect(x * tile + 1, y * tile + 1, tile - 2, tile - 2);
      }
    }
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 8; i++) {
      ctx.beginPath();
      ctx.moveTo(i * tile, 0);
      ctx.lineTo(i * tile, size);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i * tile);
      ctx.lineTo(size, i * tile);
      ctx.stroke();
    }
    ctx.globalAlpha = 0.08;
    noise(ctx, size, 1);
    ctx.globalAlpha = 1;
  }, 6);
  return warehouseFloorTex;
}

/** Warm aisle runner strip. */
export function getWarehouseAisleTexture(): THREE.CanvasTexture {
  if (warehouseAisleTex) return warehouseAisleTex;
  warehouseAisleTex = canvasTexture((ctx, size) => {
    ctx.fillStyle = '#e8e2d8';
    ctx.fillRect(0, 0, size, size);
    for (let i = 0; i < 40; i++) {
      ctx.fillStyle = `rgba(0,0,0,${0.015 + Math.random() * 0.02})`;
      ctx.fillRect(Math.random() * size, Math.random() * size, 2 + Math.random() * 8, 1);
    }
    ctx.globalAlpha = 0.06;
    noise(ctx, size, 1);
    ctx.globalAlpha = 1;
  }, 3);
  return warehouseAisleTex;
}

/** Parking lot asphalt with aggregate. */
export function getAsphaltTexture(): THREE.CanvasTexture {
  if (asphaltTex) return asphaltTex;
  asphaltTex = canvasTexture((ctx, size) => {
    ctx.fillStyle = '#4a4e54';
    ctx.fillRect(0, 0, size, size);
    for (let i = 0; i < 12000; i++) {
      const g = 55 + Math.random() * 45;
      ctx.fillStyle = `rgb(${g}, ${g + 1}, ${g + 2})`;
      ctx.fillRect(Math.random() * size, Math.random() * size, 1.2, 1.2);
    }
    ctx.globalAlpha = 0.04;
    noise(ctx, size, 1);
    ctx.globalAlpha = 1;
  }, 8);
  return asphaltTex;
}

/** Sidewalk / curb concrete. */
export function getConcreteTexture(): THREE.CanvasTexture {
  if (concreteTex) return concreteTex;
  concreteTex = canvasTexture((ctx, size) => {
    ctx.fillStyle = '#b8b4ac';
    ctx.fillRect(0, 0, size, size);
    ctx.globalAlpha = 0.12;
    noise(ctx, size, 1);
    ctx.globalAlpha = 1;
  }, 5);
  return concreteTex;
}

export function makeMappedMaterial(
  map: THREE.Texture,
  opts: { color?: string; roughness?: number; metalness?: number; envMapIntensity?: number } = {},
): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    map,
    color: opts.color ?? '#ffffff',
    roughness: opts.roughness ?? 0.72,
    metalness: opts.metalness ?? 0.08,
    envMapIntensity: opts.envMapIntensity ?? 1,
  });
}
