import * as THREE from 'three';
import type { CenterRackDept } from './warehouseLayout';

/**
 * Center-court steel facings — Costco racetrack hardlines only.
 * (Fresh/coolers use perimeterDeptTextures on wall facades.)
 */
const PALETTES: Record<
  CenterRackDept,
  { bg: string; shelf: string; colors: string[]; gloss?: boolean; kirkland?: boolean; seasonal?: boolean }
> = {
  electronics: {
    bg: '#c8ced6',
    shelf: '#4b5563',
    colors: ['#0f172a', '#1e293b', '#2563eb', '#111827', '#334155'],
    gloss: true,
  },
  seasonal: {
    bg: '#e8e4dc',
    shelf: '#6b6560',
    colors: ['#b45309', '#0369a1', '#15803d', '#7c2d12', '#4c1d95', '#fafafa'],
    seasonal: true,
  },
  grocery: {
    bg: '#f5f0e8',
    shelf: '#7a756c',
    colors: ['#e11d48', '#005dab', '#fbbf24', '#16a34a', '#1e293b', '#fafafa'],
    kirkland: true,
  },
  household: {
    bg: '#e8eef4',
    shelf: '#64748b',
    colors: ['#0284c7', '#0ea5e9', '#f59e0b', '#ffffff', '#16a34a', '#6366f1'],
  },
  bulkPaper: {
    bg: '#ebe8e2',
    shelf: '#8a857c',
    colors: ['#fafafa', '#f0ede8', '#ddd8cf', '#e8e4dc', '#cfc9be'],
    kirkland: true,
  },
};

const cache = new Map<CenterRackDept, THREE.CanvasTexture>();

function pickColor(colors: string[], row: number, col: number): string {
  return colors[(row * 3 + col * 2) % colors.length];
}

function drawKirklandBand(ctx: CanvasRenderingContext2D, bx: number, by: number, bw: number, bh: number) {
  ctx.fillStyle = '#005dab';
  ctx.fillRect(bx, by + bh * 0.62, bw, bh * 0.14);
  ctx.fillStyle = '#e11d48';
  ctx.fillRect(bx, by + bh * 0.76, bw, bh * 0.1);
}

function drawTvSilhouette(ctx: CanvasRenderingContext2D, bx: number, by: number, bw: number, bh: number) {
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(bx + bw * 0.08, by + bh * 0.12, bw * 0.84, bh * 0.62);
  ctx.fillStyle = '#1e3a5f';
  ctx.fillRect(bx + bw * 0.12, by + bh * 0.16, bw * 0.76, bh * 0.52);
  ctx.fillStyle = '#334155';
  ctx.fillRect(bx + bw * 0.38, by + bh * 0.78, bw * 0.24, bh * 0.08);
}

function drawSeasonalTag(ctx: CanvasRenderingContext2D, bx: number, by: number, bw: number, bh: number) {
  ctx.fillStyle = '#dc2626';
  ctx.fillRect(bx, by + bh * 0.08, bw * 0.55, bh * 0.18);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 9px sans-serif';
  ctx.fillText('DEAL', bx + bw * 0.06, by + bh * 0.2);
}

const SKU_LABELS: Record<CenterRackDept, string[]> = {
  electronics: [
    'TV 85" 4K\n$1,299.99', 'HDMI 48-Pack\n$34.99', 'Laptop Sleeve\n(No Laptop)\n$49.99',
    'Smart Speaker\nListening\n$79.99', 'Charging Cable\n6-Pack\n$22.99', 'Webcam\nJudging You\n$89.99',
    'Bluetooth\nEarbuds 3-Pack\n$129.99', 'Surge Protector\n12-Outlet\n$39.99',
  ],
  seasonal: [
    'Inflatable\nSanta 9ft\n$89.99', 'Emergency\nXmas Lights\n$24.99', 'Patio Set\n(Wrong Season)\n$499.99',
    'Leaf Blower\n(Good Luck)\n$149.99', 'Pool Float\nNov–Jan\n$19.99', 'Fire Pit\nAssembly\nRequired\n$229.99',
    'Garden Hose\n150ft\n$59.99', 'Umbrella\n11ft\n$179.99',
  ],
  grocery: [
    'Kirkland\nOlive Oil\n2.4L\n$19.99', 'Pretzel Crisps\n3.5 lb\n$8.99', 'Mixed Nuts\n40 oz\n$18.99',
    'Sparkling\nWater 48-Pack\n$22.99', 'Granola Bars\n64-Count\n$14.99', 'Kirkland\nCoffee\n3 lb\n$22.99',
    'Mac & Cheese\n18-Pack\n$12.99', 'Pasta Sauce\n6-Jars\n$11.99', 'Protein Bars\n30-Count\n$28.99',
  ],
  household: [
    'Dish Soap\n4-Pack\n$12.99', 'Laundry Pods\n152-Count\n$24.99', 'Paper Towels\n12 Mega\n$22.99',
    'Trash Bags\n200-Count\n$19.99', 'Ziploc Bags\nEvery Size\n$18.99', 'Spray Cleaner\n3-Pack\n$13.99',
    'Sponges\n24-Count\n$9.99', 'Aluminum Foil\n1,000 sq ft\n$24.99',
  ],
  bulkPaper: [
    'Kirkland\nBath Tissue\n30 Rolls\n$24.99', 'Paper Plates\n500-Count\n$19.99',
    'Napkins\n1,000-Count\n$16.99', 'Facial Tissue\n12 Boxes\n$18.99',
    'Kirkland\nPaper Towels\n160 Sheets\n$22.99', 'Parchment\nPaper 205ft\n$12.99',
  ],
};

function drawSkuLabel(
  ctx: CanvasRenderingContext2D,
  bx: number, by: number, bw: number, bh: number,
  dept: CenterRackDept, row: number, col: number,
) {
  const labels = SKU_LABELS[dept];
  const label = labels[(row * 7 + col * 3) % labels.length];
  const lines = label.split('\n');

  const fontSize = Math.max(6, Math.floor(bw / 7));
  ctx.font = `bold ${fontSize}px sans-serif`;
  ctx.textAlign = 'center';

  const lineH = fontSize * 1.25;
  const totalH = lines.length * lineH;
  let ty = by + (bh - totalH) / 2 + fontSize * 0.85;

  for (let i = 0; i < lines.length; i++) {
    const isPrice = lines[i].startsWith('$');
    ctx.fillStyle = isPrice ? '#c00' : 'rgba(0,0,0,0.82)';
    if (isPrice) ctx.font = `bold ${fontSize + 1}px sans-serif`;
    else ctx.font = `${i === 0 ? 'bold' : 'normal'} ${fontSize}px sans-serif`;
    ctx.fillText(lines[i], bx + bw / 2, ty + i * lineH);
  }
  ctx.textAlign = 'left';
}

function createDeptTexture(dept: CenterRackDept): THREE.CanvasTexture {
  const { bg, shelf, colors, gloss, kirkland, seasonal } = PALETTES[dept];
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, size, size);

  const shelfBands = dept === 'bulkPaper' || dept === 'grocery' ? 5 : dept === 'household' ? 5 : 4;
  const bandH = size / shelfBands;

  for (let row = 0; row < shelfBands; row++) {
    const y0 = row * bandH;
    ctx.fillStyle = shelf;
    ctx.fillRect(0, y0 + bandH - 5, size, 5);

    const cols =
      dept === 'bulkPaper' ? 4 : dept === 'grocery' || dept === 'household' ? 5 : dept === 'electronics' ? 3 : 5;
    const cellW = size / cols;

    for (let col = 0; col < cols; col++) {
      const pad = dept === 'bulkPaper' || dept === 'grocery' ? 2 : 3 + ((row + col) % 3);
      const bx = col * cellW + pad;
      const by = y0 + pad + 2;
      const bw = cellW - pad * 2;
      const bh =
        dept === 'bulkPaper' || dept === 'grocery' || dept === 'household'
          ? bandH - pad * 2 - 6
          : bandH - pad * 2 - 8;

      ctx.fillStyle = pickColor(colors, row, col);
      ctx.fillRect(bx, by, bw, bh);
      ctx.strokeStyle = 'rgba(0,0,0,0.15)';
      ctx.lineWidth = 1;
      ctx.strokeRect(bx + 0.5, by + 0.5, bw - 1, bh - 1);

      if (dept === 'electronics' && (row + col) % 2 === 0) {
        drawTvSilhouette(ctx, bx, by, bw, bh);
      }

      if (kirkland && (row + col) % 3 === 0) {
        drawKirklandBand(ctx, bx, by, bw, bh);
      }

      if (seasonal && (row + col) % 4 === 0) {
        drawSeasonalTag(ctx, bx, by, bw, bh);
      }

      if (gloss && (row + col) % 2 === 0) {
        ctx.fillStyle = 'rgba(255,255,255,0.28)';
        ctx.fillRect(bx + 2, by + 2, bw * 0.55, bh * 0.22);
      }

      if (dept === 'household' && (row + col) % 3 === 1) {
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.fillRect(bx + bw * 0.15, by + bh * 0.1, bw * 0.35, bh * 0.75);
      }

      // White label strip at bottom of each cell
      const labelH = Math.max(10, bh * 0.32);
      ctx.fillStyle = 'rgba(255,255,255,0.88)';
      ctx.fillRect(bx, by + bh - labelH, bw, labelH);
      drawSkuLabel(ctx, bx, by + bh - labelH, bw, labelH, dept, row, col);
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

export function getDeptWallpaperTexture(dept: CenterRackDept): THREE.CanvasTexture {
  let tex = cache.get(dept);
  if (!tex) {
    tex = createDeptTexture(dept);
    cache.set(dept, tex);
  }
  return tex;
}
