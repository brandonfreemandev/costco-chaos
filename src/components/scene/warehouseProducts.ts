import type { ShoppingCategory } from '../../types/state';
import type { RackSegment } from './warehouseLayout';
import { QUEST_SHELF_POSITIONS, segmentLength } from './warehouseLayout';

export type ProductKind = 'pallet' | 'bulkBox' | 'shrinkPack' | 'appliance';

export interface DecoyProduct {
  id: string;
  kind: ProductKind;
  x: number;
  y: number;
  z: number;
  w: number;
  h: number;
  d: number;
  color: string;
  label: string;
  rotationY: number;
}

const LABELS = [
  'KIRKLAND', 'KS', 'ORGANIC', '24-PACK', 'BULK', 'VALUE', 'FAMILY',
  '2-PACK', 'GLuten Free', 'PREMIUM', 'WHOLESALE', 'CLUB SIZE',
];

const BOX_COLORS = ['#c4a574', '#d8cfc0', '#a8b8c8', '#e8dcc8', '#b0a898', '#98a8b0'];

function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function nearQuest(x: number, z: number): boolean {
  return QUEST_SHELF_POSITIONS.some((q) => Math.hypot(x - q.x, z - q.z) < 3);
}

function pickKind(rand: () => number): ProductKind {
  const r = rand();
  if (r < 0.35) return 'bulkBox';
  if (r < 0.6) return 'shrinkPack';
  if (r < 0.82) return 'pallet';
  return 'appliance';
}

/** Warehouse-style products on rack faces facing each aisle. */
export function generateDecoyProducts(rackSegments: RackSegment[]): DecoyProduct[] {
  const products: DecoyProduct[] = [];
  const rand = seededRandom(91);
  let id = 0;

  for (const seg of rackSegments) {
    const length = segmentLength(seg);
    const count = Math.max(1, Math.floor(length / 3.5));
    const faceZ = seg.z + seg.faceSide * (0.85 + 0.15);

    for (let i = 0; i < count; i++) {
      if (rand() > 0.7) continue;

      const px = seg.x0 + 1.2 + (i + rand() * 0.4) * (length / count);
      const tier = Math.floor(rand() * 3);
      const kind = pickKind(rand);
      const color = BOX_COLORS[Math.floor(rand() * BOX_COLORS.length)];

      let w = 0.55 + rand() * 0.35;
      let h = 0.35 + rand() * 0.4;
      let d = 0.45 + rand() * 0.35;
      if (kind === 'pallet') {
        w = 0.9 + rand() * 0.3;
        h = 0.55 + rand() * 0.25;
        d = 0.9 + rand() * 0.3;
      } else if (kind === 'appliance') {
        w = 1.0;
        h = 0.95;
        d = 0.35;
      }

      const pz = faceZ + seg.faceSide * (kind === 'pallet' ? 0.35 : 0.2);
      if (nearQuest(px, pz)) continue;

      products.push({
        id: `decoy-${id++}`,
        kind,
        x: px,
        y: 0.45 + tier * 1.05 + h / 2,
        z: pz,
        w,
        h,
        d,
        color,
        label: LABELS[Math.floor(rand() * LABELS.length)],
        rotationY: seg.faceSide > 0 ? 0 : Math.PI,
      });
    }
  }

  return products;
}

export const QUEST_PRODUCT_VISUALS: Record<
  ShoppingCategory,
  { kind: ProductKind; w: number; h: number; d: number; color: string; label: string }
> = {
  meat: { kind: 'shrinkPack', w: 0.95, h: 0.5, d: 0.75, color: '#f5c6a5', label: 'CHICKEN 12LB' },
  bakery: { kind: 'bulkBox', w: 0.8, h: 0.55, d: 0.8, color: '#d4a574', label: 'MUFFINS 24CT' },
  electronics: { kind: 'appliance', w: 1.15, h: 0.9, d: 0.3, color: '#1a1a22', label: '65" TV' },
  bulkPaper: { kind: 'pallet', w: 0.95, h: 1.05, d: 0.95, color: '#f0ebe3', label: 'TISSUE 30RL' },
  bonus: { kind: 'bulkBox', w: 0.7, h: 0.4, d: 0.6, color: '#c0c0c0', label: 'BONUS ITEM' },
};

export const SHELF_INSET_X = 3.2;
