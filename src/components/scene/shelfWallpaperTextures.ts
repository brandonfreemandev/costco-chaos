import * as THREE from 'three';

type DeptKey = 'bakery' | 'electronics' | 'bulkPaper' | 'sample' | 'frozen' | 'dairy' | 'grocery';

/** Fixed palettes — bulk case packs, Kirkland cues, cooler-adjacent zones. */
const PALETTES: Record<
  DeptKey,
  { bg: string; shelf: string; colors: string[]; gloss?: boolean; kirkland?: boolean }
> = {
  frozen: {
    bg: '#dbeafe',
    shelf: '#64748b',
    colors: ['#ffffff', '#f0f9ff', '#bfdbfe', '#93c5fd', '#e0f2fe'],
    gloss: true,
  },
  dairy: {
    bg: '#f0f9ff',
    shelf: '#64748b',
    colors: ['#ffffff', '#fef08a', '#fde68a', '#e0f2fe', '#fafafa'],
  },
  sample: {
    bg: '#f0ebe3',
    shelf: '#6b6560',
    colors: ['#dc2626', '#ea580c', '#ca8a04', '#16a34a', '#db2777'],
  },
  bulkPaper: {
    bg: '#ebe8e2',
    shelf: '#8a857c',
    colors: ['#fafafa', '#f0ede8', '#ddd8cf', '#e8e4dc', '#cfc9be'],
    kirkland: true,
  },
  grocery: {
    bg: '#f5f0e8',
    shelf: '#7a756c',
    colors: ['#e11d48', '#005dab', '#fbbf24', '#16a34a', '#1e293b', '#fafafa'],
    kirkland: true,
  },
  electronics: {
    bg: '#d8dee6',
    shelf: '#5c6672',
    colors: ['#111827', '#1f2937', '#2563eb', '#374151', '#0ea5e9'],
    gloss: true,
  },
  bakery: {
    bg: '#f2e8da',
    shelf: '#7a6248',
    colors: ['#c9924a', '#a86b32', '#e8c9a0', '#8b5a2b', '#f0d4a8'],
  },
};

const cache = new Map<DeptKey, THREE.CanvasTexture>();

function pickColor(colors: string[], row: number, col: number): string {
  return colors[(row * 3 + col * 2) % colors.length];
}

function drawKirklandBand(ctx: CanvasRenderingContext2D, bx: number, by: number, bw: number, bh: number) {
  ctx.fillStyle = '#005dab';
  ctx.fillRect(bx, by + bh * 0.62, bw, bh * 0.14);
  ctx.fillStyle = '#e11d48';
  ctx.fillRect(bx, by + bh * 0.76, bw, bh * 0.1);
}

function createDeptTexture(dept: DeptKey): THREE.CanvasTexture {
  const { bg, shelf, colors, gloss, kirkland } = PALETTES[dept];
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, size, size);

  const shelfBands = dept === 'bulkPaper' || dept === 'grocery' ? 5 : dept === 'frozen' ? 5 : 4;
  const bandH = size / shelfBands;

  for (let row = 0; row < shelfBands; row++) {
    const y0 = row * bandH;
    ctx.fillStyle = shelf;
    ctx.fillRect(0, y0 + bandH - 5, size, 5);

    const cols = dept === 'bulkPaper' ? 4 : dept === 'grocery' ? 5 : 5 + (row % 2);
    const cellW = size / cols;

    for (let col = 0; col < cols; col++) {
      const pad = dept === 'bulkPaper' || dept === 'grocery' ? 2 : 3 + ((row + col) % 3);
      const bx = col * cellW + pad;
      const by = y0 + pad + 2;
      const bw = cellW - pad * 2;
      const bh =
        dept === 'bulkPaper' || dept === 'grocery'
          ? bandH - pad * 2 - 6
          : bandH - pad * 2 - 8;

      ctx.fillStyle = pickColor(colors, row, col);
      ctx.fillRect(bx, by, bw, bh);
      ctx.strokeStyle = 'rgba(0,0,0,0.15)';
      ctx.lineWidth = 1;
      ctx.strokeRect(bx + 0.5, by + 0.5, bw - 1, bh - 1);

      if (kirkland && (row + col) % 3 === 0) {
        drawKirklandBand(ctx, bx, by, bw, bh);
      }

      if (gloss && (row + col) % 2 === 0) {
        ctx.fillStyle = 'rgba(255,255,255,0.28)';
        ctx.fillRect(bx + 2, by + 2, bw * 0.55, bh * 0.22);
      }

      if (dept === 'frozen' && (row + col) % 4 === 0) {
        ctx.fillStyle = 'rgba(255,255,255,0.45)';
        for (let f = 0; f < 3; f++) {
          ctx.fillRect(bx + f * (bw / 4), by + f * 4, 3, 3);
        }
      }
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

export function getDeptWallpaperTexture(dept: DeptKey): THREE.CanvasTexture {
  let tex = cache.get(dept);
  if (!tex) {
    tex = createDeptTexture(dept);
    cache.set(dept, tex);
  }
  return tex;
}

export type { DeptKey };
