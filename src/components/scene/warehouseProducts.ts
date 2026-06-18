import type { ShoppingCategory } from '../../types/state';

export interface DecoyProduct {
  id: string;
  x: number;
  y: number;
  z: number;
  w: number;
  h: number;
  d: number;
  color: string;
  shelfSide: 'left' | 'right';
}

const DECOY_COLORS = [
  '#c0392b', '#2980b9', '#27ae60', '#f39c12', '#8e44ad',
  '#d35400', '#16a085', '#2c3e50', '#e74c3c', '#3498db',
  '#f1c40f', '#95a5a6', '#e67e22', '#1abc9c', '#9b59b6',
  '#ecf0f1', '#bdc3c7', '#7f8c8d', '#dfe6e9', '#636e72',
];

function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

const QUEST_EXCLUSIONS = [
  { x: -4.6, z: -14, r: 1.8 },
  { x: 4.6, z: -6, r: 1.8 },
  { x: -4.6, z: 6, r: 1.8 },
  { x: 4.6, z: 14, r: 1.8 },
];

function nearQuestItem(x: number, z: number): boolean {
  return QUEST_EXCLUSIONS.some((q) => Math.hypot(x - q.x, z - q.z) < q.r);
}

export function generateDecoyProducts(aisleLength: number): DecoyProduct[] {
  const products: DecoyProduct[] = [];
  const rand = seededRandom(42);
  const shelfXs = { left: -4.6, right: 4.6 };
  let id = 0;

  for (const side of ['left', 'right'] as const) {
    const baseX = shelfXs[side];
    const segments = Math.floor(aisleLength / 2.8);

    for (let seg = 0; seg < segments; seg++) {
      const baseZ = -aisleLength / 2 + seg * 2.8 + 1.4;
      const tiers = 3;

      for (let tier = 0; tier < tiers; tier++) {
        const boxesPerTier = 4 + Math.floor(rand() * 3);
        const baseY = 0.35 + tier * 0.85;

        for (let b = 0; b < boxesPerTier; b++) {
          const jitterX = (rand() - 0.5) * 0.35;
          const jitterZ = (rand() - 0.5) * 0.5;
          const px = baseX + jitterX;
          const pz = baseZ + jitterZ;
          if (nearQuestItem(px, pz)) continue;
          const w = 0.35 + rand() * 0.45;
          const h = 0.3 + rand() * 0.55;
          const d = 0.35 + rand() * 0.5;

          products.push({
            id: `decoy-${id++}`,
            x: px,
            y: baseY + h / 2,
            z: pz,
            w,
            h,
            d,
            color: DECOY_COLORS[Math.floor(rand() * DECOY_COLORS.length)],
            shelfSide: side,
          });
        }
      }
    }
  }

  return products;
}

export const QUEST_PRODUCT_VISUALS: Record<
  ShoppingCategory,
  { w: number; h: number; d: number; color: string }
> = {
  meat: { w: 0.9, h: 0.55, d: 0.7, color: '#f5c6a5' },
  bakery: { w: 0.75, h: 0.5, d: 0.75, color: '#d4a574' },
  electronics: { w: 1.1, h: 0.85, d: 0.25, color: '#1a1a22' },
  bulkPaper: { w: 0.85, h: 1.0, d: 0.85, color: '#f0ebe3' },
};
