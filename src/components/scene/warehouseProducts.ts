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
}

const DECOY_COLORS = [
  '#c0392b', '#2980b9', '#27ae60', '#f39c12', '#8e44ad',
  '#d35400', '#16a085', '#2c3e50', '#e74c3c', '#3498db',
  '#f1c40f', '#95a5a6', '#e67e22', '#1abc9c', '#9b59b6',
  '#ecf0f1', '#bdc3c7', '#7f8c8d',
];

function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

const QUEST_POSITIONS = [
  { x: -2.6, z: -18 },
  { x: 2.6, z: -10 },
  { x: -2.6, z: 4 },
  { x: 2.6, z: 14 },
];

function nearQuest(x: number, z: number): boolean {
  return QUEST_POSITIONS.some((q) => Math.hypot(x - q.x, z - q.z) < 2);
}

/** Products stacked on shelf bays facing the aisle. */
export function generateDecoyProducts(
  aisleLength: number,
  shelfInsetX: number,
): DecoyProduct[] {
  const products: DecoyProduct[] = [];
  const rand = seededRandom(77);
  let id = 0;

  for (const side of [-1, 1] as const) {
    const faceX = side * shelfInsetX;
    const bays = Math.floor(aisleLength / 2.4);

    for (let bay = 0; bay < bays; bay++) {
      const baseZ = -aisleLength / 2 + bay * 2.4 + 1.2;

      for (let tier = 0; tier < 4; tier++) {
        const baseY = 0.25 + tier * 0.72;
        const count = 3 + Math.floor(rand() * 3);

        for (let b = 0; b < count; b++) {
          const px = faceX + side * (0.15 + rand() * 0.25);
          const pz = baseZ + (b - count / 2) * 0.42 + (rand() - 0.5) * 0.15;
          if (nearQuest(px, pz)) continue;

          const w = 0.38 + rand() * 0.35;
          const h = 0.28 + rand() * 0.45;
          const d = 0.32 + rand() * 0.4;

          products.push({
            id: `decoy-${id++}`,
            x: px,
            y: baseY + h / 2,
            z: pz,
            w,
            h,
            d,
            color: DECOY_COLORS[Math.floor(rand() * DECOY_COLORS.length)],
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

export const SHELF_INSET_X = 3.2;
