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
const endcapCache = new Map<CenterRackDept, THREE.CanvasTexture>();

/** Wallpaper columns on the 1024px canvas — must match createDeptTexture(). */
const FACADE_COLUMNS: Record<CenterRackDept, number> = {
  electronics: 3,
  seasonal: 4,
  grocery: 4,
  household: 4,
  bulkPaper: 4,
};

/**
 * Physical width (m) of a single SKU column on a rack face. Kept constant across
 * every chunk so columns never squish, and used with world-aligned UVs so carved
 * chunks (and gap fillers) flow continuously with no visible seam.
 */
export const SKU_COLUMN_WIDTH_M = 0.72;

/** Meters one full wallpaper canvas (FACADE_COLUMNS columns) spans along a face. */
export function facadeTileWidthM(dept: CenterRackDept): number {
  return FACADE_COLUMNS[dept] * SKU_COLUMN_WIDTH_M;
}

function pickColor(colors: string[], row: number, col: number): string {
  return colors[(row * 3 + col * 2) % colors.length];
}

function drawKirklandBand(ctx: CanvasRenderingContext2D, bx: number, by: number, bw: number, bh: number) {
  // Stop at 72% so the label strip (bottom 26%) stays clean
  ctx.fillStyle = '#005dab';
  ctx.fillRect(bx, by + bh * 0.60, bw, bh * 0.07);
  ctx.fillStyle = '#e11d48';
  ctx.fillRect(bx, by + bh * 0.67, bw, bh * 0.05);
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
  const tagW = bw * 0.5;
  const tagH = bh * 0.16;
  const tagX = bx;
  const tagY = by + bh * 0.07;
  ctx.fillStyle = '#dc2626';
  ctx.fillRect(tagX, tagY, tagW, tagH);
  // Scale the DEAL text to the tag so it stays legible on the 1024px canvas.
  const fs = Math.max(8, Math.floor(tagH * 0.6));
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold ${fs}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('DEAL', tagX + tagW / 2, tagY + tagH / 2);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
}

// Two lines only: name then price — keeps the label strip tight
const SKU_LABELS: Record<CenterRackDept, [string, string][]> = {
  electronics: [
    ['85" TV (Too Big)', '$1,299.99'], ['HDMI 48-Pack (Why)', '$34.99'], ['Laptop Sleeve (No Laptop)', '$49.99'],
    ['Smart Speaker (Listening)', '$79.99'], ['Charging Cable (Finally)', '$22.99'], ['Webcam (Judging You)', '$89.99'],
    ['BT Earbuds (3 Losers)', '$129.99'], ['Surge Protector (False Hope)', '$39.99'],
    ['Keyboard (Rage-Proof)', '$59.99'], ['Router (False Promises)', '$129.99'],
    ['Extension Cord (Trip Hazard)', '$19.99'], ['Monitor Arm (Hubris)', '$79.99'],
  ],
  seasonal: [
    ['Inflatable Santa (9ft Regret)', '$89.99'], ['Xmas Lights (Fire Hazard)', '$24.99'],
    ['Patio Set (One Summer)', '$499.99'], ['Leaf Blower (Neighbor War)', '$149.99'],
    ['Pool Float (False Optimism)', '$19.99'], ['Fire Pit (HOA Violation)', '$229.99'],
    ['Garden Hose (150ft Grudge)', '$59.99'], ['Patio Umbrella (It Will Fall)', '$179.99'],
    ['Inflatable Reindeer (Haunted)', '$39.99'], ['String Lights (Tangle Forever)', '$29.99'],
    ['Yard Stakes (Good Luck)', '$14.99'], ['Outdoor Rug (Mold Eventually)', '$89.99'],
  ],
  grocery: [
    ['KS Olive Oil (Hubris Qty)', '$19.99'], ['Pretzel Crisps (Gone Tonight)', '$8.99'],
    ['Mixed Nuts (Mostly Cashews Liar)', '$18.99'], ['Sparkling Water (Fancy Nothing)', '$22.99'],
    ['Granola Bars (Sadness Bricks)', '$14.99'], ['KS Coffee (Mortgage Blend)', '$22.99'],
    ['Mac & Cheese 18pk (Ambitions)', '$12.99'], ['Pasta Sauce (6 Jars of Denial)', '$11.99'],
    ['Protein Bars (Gym Guilt)', '$28.99'], ['KS Maple Syrup (Pancake Aspirations)', '$13.99'],
    ['Trail Mix (Optimism)', '$16.99'], ['Chicken Broth 6pk (Healing Era)', '$11.99'],
  ],
  household: [
    ['Dish Soap 4pk (Eternal)', '$12.99'], ['Laundry Pods (Do Not Eat)', '$24.99'],
    ['Paper Towels (Biblical Qty)', '$22.99'], ['Trash Bags (Life Metaphor)', '$19.99'],
    ['Ziploc (Every Size Somehow)', '$18.99'], ['Spray Cleaner (Optimism Mist)', '$13.99'],
    ['Sponges 24ct (You Will Lose)', '$9.99'], ['Aluminum Foil (Paranoia Kit)', '$24.99'],
    ['Dish Gloves (False Dignity)', '$8.99'], ['Air Freshener (Covering Crimes)', '$14.99'],
    ['Lint Roller (Dog Tax)', '$11.99'], ['Dryer Sheets (Static Anxiety)', '$16.99'],
  ],
  bulkPaper: [
    ['KS Bath Tissue (Prepare)', '$24.99'], ['Paper Plates (Commitment Issues)', '$19.99'],
    ['Napkins 1000ct (For Crying)', '$16.99'], ['Facial Tissue (Cry Cubes)', '$18.99'],
    ['KS Paper Towels (Accept It)', '$22.99'], ['Parchment Paper (Chef Delusion)', '$12.99'],
    ['Wax Paper (Retro Anxiety)', '$9.99'], ['Plastic Wrap (Sisyphean Task)', '$14.99'],
  ],
};

function drawSkuLabel(
  ctx: CanvasRenderingContext2D,
  bx: number, by: number, bw: number, lh: number,
  dept: CenterRackDept, row: number, col: number,
) {
  const labels = SKU_LABELS[dept];
  // Scramble so neighbouring cells rarely share a label
  const hash = (row * 31 + col * 17 + row * col * 7) % labels.length;
  const [name, price] = labels[hash];

  // Fit two lines inside lh: each line gets ~45% of strip height
  const fontSize = Math.max(4, Math.floor(lh * 0.4));
  const cx = bx + bw / 2;
  const line1Y = by + fontSize;
  const line2Y = by + lh - 2;

  const maxW = bw - 4;

  ctx.textAlign = 'center';
  ctx.font = `500 ${fontSize}px sans-serif`;
  ctx.fillStyle = 'rgba(0,0,0,0.78)';
  ctx.fillText(name, cx, line1Y, maxW);

  ctx.font = `bold ${fontSize}px sans-serif`;
  ctx.fillStyle = '#c00';
  ctx.fillText(price, cx, line2Y, maxW);

  ctx.textAlign = 'left';
}

function drawProductCell(
  ctx: CanvasRenderingContext2D,
  dept: CenterRackDept,
  row: number,
  col: number,
  bx: number,
  by: number,
  bw: number,
  bh: number,
): void {
  const { colors, gloss, kirkland, seasonal } = PALETTES[dept];

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

  const labelH = Math.max(10, Math.floor(bh * 0.26));
  const labelY = by + bh - labelH;
  ctx.fillStyle = '#e8e6e0';
  ctx.fillRect(bx, labelY, bw, labelH);
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.fillRect(bx, labelY, bw, 1.5);
  drawSkuLabel(ctx, bx, labelY + 2, bw, labelH - 2, dept, row, col);
}

function createDeptTexture(dept: CenterRackDept): THREE.CanvasTexture {
  const { bg, shelf } = PALETTES[dept];
  const size = 1024;
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

    // Fewer columns → wider cells → comedy names need less horizontal squishing.
    // Electronics (3) reads cleanest; keep the rest at 4.
    const cols = dept === 'electronics' ? 3 : 4;
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

      drawProductCell(ctx, dept, row, col, bx, by, bw, bh);
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  // High anisotropy keeps facade text legible at the grazing angles you see down an aisle.
  tex.anisotropy = 16;
  return tex;
}

/** Narrow end-of-aisle facing — one product column per shelf band. */
function createEndcapTexture(dept: CenterRackDept): THREE.CanvasTexture {
  const { bg, shelf } = PALETTES[dept];
  const width = 384;
  const height = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  const shelfBands = dept === 'bulkPaper' || dept === 'grocery' ? 5 : dept === 'household' ? 5 : 4;
  const bandH = height / shelfBands;
  const pad = 6;
  const innerW = width - pad * 2;
  const halfW = innerW / 2;
  const leftX = pad;
  const rightX = pad + halfW;
  const cols = FACADE_COLUMNS[dept];
  const edgeColMinX = 0;
  const edgeColMaxX = cols - 1;

  for (let row = 0; row < shelfBands; row++) {
    const y0 = row * bandH;
    ctx.fillStyle = shelf;
    ctx.fillRect(0, y0 + bandH - 5, width, 5);

    const by = y0 + pad + 2;
    const bh =
      dept === 'bulkPaper' || dept === 'grocery' || dept === 'household'
        ? bandH - pad * 2 - 6
        : bandH - pad * 2 - 8;

    /**
     * Endcap U=0 edge should visually continue one rack-row corner, and U=1 the
     * opposite corner. Long facades end on max-X column at one corner and min-X
     * column at the other, so map those two edge columns across endcap width.
     */
    drawProductCell(ctx, dept, row, edgeColMaxX, leftX, by, halfW, bh);
    drawProductCell(ctx, dept, row, edgeColMinX, rightX, by, halfW, bh);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 16;
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

export function getDeptEndcapTexture(dept: CenterRackDept): THREE.CanvasTexture {
  let tex = endcapCache.get(dept);
  if (!tex) {
    tex = createEndcapTexture(dept);
    endcapCache.set(dept, tex);
  }
  return tex;
}
