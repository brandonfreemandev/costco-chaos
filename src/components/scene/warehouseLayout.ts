/** Costco warehouse grid — solid rack spines between walkable aisles (1u ≈ 1m). */

export const WH_WIDTH = 34;
export const WH_DEPTH = 56;
export const WH_CEILING = 9;
export const RACK_HEIGHT = 5.4;
export const SPINE_DEPTH = 1.5;

export const WH_MIN_X = -WH_WIDTH / 2;
export const WH_MAX_X = WH_WIDTH / 2;
export const WH_MIN_Z = -WH_DEPTH / 2;
export const WH_MAX_Z = WH_DEPTH / 2;

/** Walkable aisle centers — six parallel runs like a real club store. */
export const AISLE_CENTERS_X = [-12.5, -7.5, -2.5, 2.5, 7.5, 12.5] as const;
export const AISLE_WIDTH = 3.1;

/** Solid double-sided pallet rack spines between aisles (+ perimeter walls). */
export const SPINE_CENTERS_X = [-14, -10, -5, 0, 5, 10, 14] as const;

export const CROSS_AISLES_Z = [16, 4, -8, -20] as const;
export const CROSS_AISLE_HALF = 2.2;

/** Open front court near exit — no pallet racks; checkout mezzanine lives here. */
export const FRONT_COURT_MIN_Z = 20.5;

export interface RackSegment {
  x: number;
  z0: number;
  z1: number;
  /** Which aisle side products face (+1 = east aisle, -1 = west). */
  faceSide: 1 | -1;
}

export interface MazeBlockSpec {
  x: number;
  z: number;
  w: number;
  d: number;
}

function getZIntervals(): { z0: number; z1: number }[] {
  const cuts = [WH_MIN_Z + 1, ...CROSS_AISLES_Z.flatMap((cz) => [cz - CROSS_AISLE_HALF, cz + CROSS_AISLE_HALF]), WH_MAX_Z - 1].sort(
    (a, b) => a - b,
  );
  const intervals: { z0: number; z1: number }[] = [];
  for (let i = 0; i < cuts.length - 1; i += 2) {
    const z0 = cuts[i];
    const z1 = cuts[i + 1];
    if (z1 - z0 > 2.8) intervals.push({ z0, z1 });
  }
  return intervals;
}

/** Continuous rack runs — broken only at cross-aisles so side aisles are visually separate. */
export function buildRackSegments(): RackSegment[] {
  const segments: RackSegment[] = [];
  const intervals = getZIntervals();

  for (const x of SPINE_CENTERS_X) {
    const faceSide: 1 | -1 = x <= 0 ? 1 : -1;
    for (const { z0, z1 } of intervals) {
      const rackZ1 = Math.min(z1, FRONT_COURT_MIN_Z);
      if (rackZ1 - z0 <= 2.8) continue;
      segments.push({ x, z0, z1: rackZ1, faceSide });
    }
  }

  return segments;
}

/** @deprecated Maze aisle blockers removed — racks + NPCs provide enough friction. */
export function buildMazeBlocks(): MazeBlockSpec[] {
  return [];
}

export const QUEST_SHELF_POSITIONS = [
  { x: -10, z: -19.5, aisle: -12.5 },
  { x: -6.5, z: 8, aisle: -7.5 },
  { x: 6.5, z: -5, aisle: 7.5 },
  { x: 11.5, z: -19, aisle: 12.5 },
] as const;

export function aisleCenterNear(x: number): number {
  let best: number = AISLE_CENTERS_X[0];
  let bestDist = Math.abs(x - best);
  for (const ax of AISLE_CENTERS_X) {
    const d = Math.abs(x - ax);
    if (d < bestDist) {
      best = ax;
      bestDist = d;
    }
  }
  return best;
}
