import { WAREHOUSE_INTERIOR_SPAWN } from './parkingLotLayout';

/**
 * Costco racetrack layout (1u ≈ 1m):
 * - Perimeter loop; entrance + checkout at north (+Z)
 * - N–S aisles: side aisles + wide center aisle
 * - E–W pallet rows in back-to-back pairs (no gap inside a pair)
 */

export const WH_WIDTH = 34;
export const WH_DEPTH = 56;
export const WH_CEILING = 9;
export const RACK_HEIGHT = 5.4;
export const SPINE_DEPTH = 1.5;

export const WH_MIN_X = -WH_WIDTH / 2;
export const WH_MAX_X = WH_WIDTH / 2;
export const WH_MIN_Z = -WH_DEPTH / 2;
export const WH_MAX_Z = WH_DEPTH / 2;

export const PERIMETER_X_INSET = 5.2;
export const PERIMETER_Z_MARGIN = 6.5;

export const CENTER_MIN_X = WH_MIN_X + PERIMETER_X_INSET;
export const CENTER_MAX_X = WH_MAX_X - PERIMETER_X_INSET;

export const FRONT_COURT_MIN_Z = 20.5;
/** Keep pallet rows away from checkout mezzanine. */
export const CHECKOUT_RACK_GAP = 4.5;
export const RACK_Z_MAX = FRONT_COURT_MIN_Z - CHECKOUT_RACK_GAP;
export const RACK_Z_MIN = WH_MIN_Z + PERIMETER_Z_MARGIN;

export const SIDE_AISLE_WIDTH = 3.1;
export const CENTER_AISLE_WIDTH = 5.4;
export const CENTER_AISLE_HALF = CENTER_AISLE_WIDTH / 2;

/** Side N–S aisles + wide center drive aisle. */
export const AISLE_SPECS = [
  { x: -7.5, width: SIDE_AISLE_WIDTH },
  { x: 0, width: CENTER_AISLE_WIDTH },
  { x: 7.5, width: SIDE_AISLE_WIDTH },
] as const;

export const AISLE_CENTERS_X = AISLE_SPECS.map((a) => a.x);
export const AISLE_WIDTH = SIDE_AISLE_WIDTH;

/** West / east rack blocks — single wide center gap (paired rows touch within block). */
export const RACK_X_BLOCKS = [
  { x0: CENTER_MIN_X, x1: -CENTER_AISLE_HALF },
  { x0: CENTER_AISLE_HALF, x1: CENTER_MAX_X },
] as const;

/**
 * Back-to-back pair centers (Z). Each pair = two E–W rows touching (no aisle between).
 * Evenly compressed between back wall and checkout buffer.
 */
export const RACK_PAIR_CENTERS_Z = [-14, -8.5, -3, 2.5, 8, 13.5] as const;

export interface RackSegment {
  z: number;
  x0: number;
  x1: number;
  /** Product face toward +Z (north) or −Z (south). */
  faceSide: 1 | -1;
}

/**
 * Center-court steel departments by block (indices match RACK_PAIR_CENTERS_Z south → north).
 *
 * Costco racetrack (entrance north): west block = general merchandise — TVs & luxe
 * at the front-left as you walk in; east block = food / grocery. Perimeter walls
 * still own fresh coolers.
 */
export type CenterRackDept = 'electronics' | 'seasonal' | 'grocery' | 'household' | 'bulkPaper';

export const RACK_PAIR_WEST_DEPARTMENTS: CenterRackDept[] = [
  'household', // −14  back hardlines
  'bulkPaper', // −8.5 outside-track staples (TP, towels)
  'household', // −3   cleaning / paper goods
  'seasonal', // 2.5  center-court treasure-hunt
  'seasonal', // 8    home / lifestyle
  'electronics', // 13.5 front luxe — TVs west as you enter
];

export const RACK_PAIR_EAST_DEPARTMENTS: CenterRackDept[] = [
  'grocery', // −14  back dry grocery / pantry
  'grocery', // −8.5 snacks & beverages
  'grocery', // −3   center-court food
  'grocery', // 2.5  Kirkland dry grocery
  'grocery', // 8    food toward front
  'grocery', // 13.5 front food — not TVs
];

export function isWestRackBlock(seg: RackSegment): boolean {
  return (seg.x0 + seg.x1) / 2 < 0;
}

function pairIndexForSegmentZ(z: number): number {
  const half = SPINE_DEPTH / 2;
  for (let i = 0; i < RACK_PAIR_CENTERS_Z.length; i++) {
    const cz = RACK_PAIR_CENTERS_Z[i];
    if (z >= cz - half - 0.01 && z <= cz + half + 0.01) return i;
  }
  let bestIdx = 0;
  let bestDist = Infinity;
  for (let i = 0; i < RACK_PAIR_CENTERS_Z.length; i++) {
    const d = Math.abs(z - RACK_PAIR_CENTERS_Z[i]);
    if (d < bestDist) {
      bestDist = d;
      bestIdx = i;
    }
  }
  return bestIdx;
}

/** N–S band + west/east block — GM west, food east (Costco entrance layout). */
export function departmentForRackSegment(seg: RackSegment): CenterRackDept {
  const idx = pairIndexForSegmentZ(seg.z);
  return isWestRackBlock(seg) ? RACK_PAIR_WEST_DEPARTMENTS[idx] : RACK_PAIR_EAST_DEPARTMENTS[idx];
}

export function rackPairDepartment(pairIndex: number, west: boolean): CenterRackDept {
  const table = west ? RACK_PAIR_WEST_DEPARTMENTS : RACK_PAIR_EAST_DEPARTMENTS;
  return table[pairIndex] ?? table[table.length - 1];
}

export const CROSS_AISLES_Z = [11, 0.5, -10.5, -18] as const;
export const CROSS_AISLE_HALF = 2.2;

export interface MazeBlockSpec {
  x: number;
  z: number;
  w: number;
  d: number;
}

const halfDepth = SPINE_DEPTH / 2;

/** E–W rows: back-to-back pairs × west/east blocks. */
export function buildRackSegments(): RackSegment[] {
  const segments: RackSegment[] = [];

  for (const centerZ of RACK_PAIR_CENTERS_Z) {
    const zSouth = centerZ - halfDepth;
    const zNorth = centerZ + halfDepth;

    for (const { x0, x1 } of RACK_X_BLOCKS) {
      segments.push({ z: zSouth, x0, x1, faceSide: 1 });
      segments.push({ z: zNorth, x0, x1, faceSide: -1 });
    }
  }

  return segments;
}

export const RACK_COLLISION_DEPTH = 1.05;
const RACETRACK_RACK_INSET = 0.42;

export interface RackCollisionBox {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

function rackBlockAabb(x: number, z: number, w: number, d: number): RackCollisionBox {
  return { minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2 };
}

/** Rack pallet hitboxes — N–S aisle corridors carved out (matches NPC/cart motion). */
function rackCollisionBoxesForSegment(seg: RackSegment): RackCollisionBox[] {
  let x0 = seg.x0;
  let x1 = seg.x1;
  const westBlock = (seg.x0 + seg.x1) / 2 < 0;
  if (westBlock) {
    x0 += RACETRACK_RACK_INSET;
  } else {
    x1 -= RACETRACK_RACK_INSET;
  }

  const carveouts: { minX: number; maxX: number }[] = [];
  for (const spec of AISLE_SPECS) {
    const half = spec.width / 2;
    const aMin = spec.x - half;
    const aMax = spec.x + half;
    if (aMax <= x0 || aMin >= x1) continue;
    carveouts.push({ minX: Math.max(x0, aMin), maxX: Math.min(x1, aMax) });
  }

  if (carveouts.length === 0) {
    const lenX = Math.max(1.5, x1 - x0);
    return [rackBlockAabb((x0 + x1) / 2, seg.z, lenX, RACK_COLLISION_DEPTH)];
  }

  carveouts.sort((a, b) => a.minX - b.minX);
  const boxes: RackCollisionBox[] = [];
  let cursor = x0;
  for (const cut of carveouts) {
    if (cut.minX - cursor > 0.35) {
      boxes.push(rackBlockAabb((cursor + cut.minX) / 2, seg.z, cut.minX - cursor, RACK_COLLISION_DEPTH));
    }
    cursor = Math.max(cursor, cut.maxX);
  }
  if (x1 - cursor > 0.35) {
    boxes.push(rackBlockAabb((cursor + x1) / 2, seg.z, x1 - cursor, RACK_COLLISION_DEPTH));
  }
  return boxes;
}

/** Visual rack instances — X chunks match collision carve-outs (aisles stay open). */
export interface RackVisualChunk {
  x: number;
  z: number;
  w: number;
  faceSide: 1 | -1;
  dept: CenterRackDept;
}

export function buildRackVisualChunks(): RackVisualChunk[] {
  const chunks: RackVisualChunk[] = [];
  for (const seg of buildRackSegments()) {
    const dept = departmentForRackSegment(seg);
    const boxes = rackCollisionBoxesForSegment(seg);
    if (boxes.length === 0) {
      chunks.push({
        x: segmentCenterX(seg),
        z: seg.z,
        w: segmentLength(seg),
        faceSide: seg.faceSide,
        dept,
      });
      continue;
    }
    for (const box of boxes) {
      const w = box.maxX - box.minX;
      if (w < 0.35) continue;
      chunks.push({
        x: (box.minX + box.maxX) / 2,
        z: seg.z,
        w,
        faceSide: seg.faceSide,
        dept,
      });
    }
  }
  return chunks;
}

/** Full column path clear for a cart hull (every step, not just endpoints). */
export function isColumnPathWalkable(
  x: number,
  z0: number,
  z1: number,
  cartLoad = 1.8,
): boolean {
  const { hx, hz } = getNpcHalfExtentsForPath(cartLoad);
  const [, , pz0] = clampWarehouseWaypoint(x, 0, z0);
  const [, , pz1] = clampWarehouseWaypoint(x, 0, z1);
  const steps = 32;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const z = pz0 + (pz1 - pz0) * t;
    const [px] = clampWarehouseWaypoint(x, 0, z);
    if (isInsideRackFootprint(px, z, Math.max(hx, hz) * 0.35)) return false;
  }
  return true;
}

function getNpcHalfExtentsForPath(cartLoad: number): { hx: number; hz: number } {
  const hasCart = cartLoad > 1.2;
  return { hx: hasCart ? 0.72 : 0.42, hz: hasCart ? 1.35 : 0.42 };
}

let rackCollisionCache: RackCollisionBox[] | null = null;

export function buildRackCollisionObstacles(): RackCollisionBox[] {
  if (rackCollisionCache) return rackCollisionCache;
  const boxes: RackCollisionBox[] = [];
  for (const seg of buildRackSegments()) {
    boxes.push(...rackCollisionBoxesForSegment(seg));
  }
  rackCollisionCache = boxes;
  return boxes;
}

export function invalidateRackCollisionCache(): void {
  rackCollisionCache = null;
}

export function buildMazeBlocks(): MazeBlockSpec[] {
  return [];
}

export function segmentLength(seg: RackSegment): number {
  return seg.x1 - seg.x0;
}

export function segmentCenterX(seg: RackSegment): number {
  return (seg.x0 + seg.x1) / 2;
}

/** Walkable row-gap centers between back-to-back rack pairs (never on pair centers). */
export function rackRowGapCentersZ(): number[] {
  const gaps: number[] = [];
  for (let i = 0; i < RACK_PAIR_CENTERS_Z.length - 1; i++) {
    const northMax = RACK_PAIR_CENTERS_Z[i] + SPINE_DEPTH;
    const southMin = RACK_PAIR_CENTERS_Z[i + 1] - SPINE_DEPTH;
    gaps.push((northMax + southMin) / 2);
  }
  return gaps;
}

/** True when a floor point overlaps rack collision (aisle corridors carved out). */
export function isInsideRackFootprint(x: number, z: number, margin = 0): boolean {
  const hx = 0.55 + margin;
  const hz = 0.95 + margin;
  for (const box of buildRackCollisionObstacles()) {
    if (x + hx > box.minX && x - hx < box.maxX && z + hz > box.minZ && z - hz < box.maxZ) {
      return true;
    }
  }
  return false;
}

export interface QuestShelfSlot {
  id: string;
  x: number;
  z: number;
  aisle: number;
  y: number;
}

/**
 * Quest pickups live in N–S aisle × cross-aisle gaps — never on RACK_PAIR_CENTERS_Z.
 * Kept in sync with aisle signs / sample kiosks (≥5m from sample counters).
 */
export const QUEST_SHELF_POSITIONS: QuestShelfSlot[] = [
  { id: 'item-meat', x: 7.5, z: rackRowGapCentersZ()[0], aisle: 7.5, y: 1.1 },
  { id: 'item-bakery', x: 7.5, z: rackRowGapCentersZ()[2], aisle: 7.5, y: 0.95 },
  { id: 'item-electronics', x: -7.5, z: rackRowGapCentersZ()[4], aisle: -7.5, y: 1.5 },
  { id: 'item-paper', x: 0, z: rackRowGapCentersZ()[0], aisle: 0, y: 1.35 },
];

export function questShelfById(itemId: string): QuestShelfSlot {
  const slot = QUEST_SHELF_POSITIONS.find((q) => q.id === itemId);
  if (!slot) throw new Error(`Unknown quest item slot: ${itemId}`);
  return slot;
}

function assertWalkablePlacements(): void {
  for (const q of QUEST_SHELF_POSITIONS) {
    if (isInsideRackFootprint(q.x, q.z)) {
      console.error(`[layout] Quest "${q.id}" overlaps racks at (${q.x}, ${q.z})`);
    }
  }
}

if (import.meta.env?.DEV) {
  assertWalkablePlacements();
}

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

/** West perimeter cooler strip — matches `getPerimeterDeptObstacles` in staticObstacles. */
const PERIMETER_DEPT_STRIP = 2.4;
const PERIMETER_DEPT_INSET = 0.25;
/** Blocker-cart half-width + slide skin — corridor must fit widest shoppers. */
const NPC_PATROL_HALF_X = 0.72;
const PATROL_X_SKIN = 0.15;

function westPerimeterDeptMaxX(): number {
  const westCenter = WH_MIN_X + PERIMETER_DEPT_STRIP / 2 + PERIMETER_DEPT_INSET;
  return westCenter + PERIMETER_DEPT_STRIP / 2;
}

function eastPerimeterDeptMinX(): number {
  const eastCenter = WH_MAX_X - PERIMETER_DEPT_STRIP / 2 - PERIMETER_DEPT_INSET;
  return eastCenter - PERIMETER_DEPT_STRIP / 2;
}

/** Walkable X band for west racetrack N–S patrol (cooler strip ↔ west rack face). */
export function westPatrolCorridor(hx = NPC_PATROL_HALF_X): { minX: number; maxX: number } {
  const minX = westPerimeterDeptMaxX() + hx + PATROL_X_SKIN;
  const maxX = CENTER_MIN_X - hx - PATROL_X_SKIN;
  return { minX, maxX };
}

/** Walkable X band for east racetrack N–S patrol (east rack face ↔ service-wall depts). */
export function eastPatrolCorridor(hx = NPC_PATROL_HALF_X): { minX: number; maxX: number } {
  const minX = CENTER_MAX_X + hx + PATROL_X_SKIN;
  const maxX = eastPerimeterDeptMinX() - hx - PATROL_X_SKIN;
  return { minX, maxX };
}

/** N–S patrol lane on west racetrack — centered in the narrow cooler↔rack corridor. */
export function westRacetrackPatrolX(): number {
  const { minX, maxX } = westPatrolCorridor();
  return (minX + maxX) / 2;
}

/** N–S patrol lane on east racetrack — centered in the rack↔dept corridor. */
export function eastRacetrackPatrolX(): number {
  const { minX, maxX } = eastPatrolCorridor();
  return (minX + maxX) / 2;
}

export function clampWestPatrolX(x: number, hx = NPC_PATROL_HALF_X): number {
  const { minX, maxX } = westPatrolCorridor(hx);
  return Math.max(minX, Math.min(maxX, x));
}

export function clampEastPatrolX(x: number, hx = NPC_PATROL_HALF_X): number {
  const { minX, maxX } = eastPatrolCorridor(hx);
  return Math.max(minX, Math.min(maxX, x));
}

/** True when X is on the west perimeter loop (not a center/side aisle). */
export function isWestRacetrackPatrolX(x: number): boolean {
  const west = westRacetrackPatrolX();
  return Math.abs(x - west) < 1.6 && Math.abs(x - aisleCenterNear(x)) > 1.2;
}

export function isEastRacetrackPatrolX(x: number): boolean {
  const east = eastRacetrackPatrolX();
  return Math.abs(x - east) < 1.6 && Math.abs(x - aisleCenterNear(x)) > 1.2;
}

/** Snap X to nearest valid patrol column: N–S aisles or racetrack perimeter lanes. */
export function nearestPatrolX(x: number): number {
  const candidates = [
    ...AISLE_CENTERS_X,
    westRacetrackPatrolX(),
    eastRacetrackPatrolX(),
  ];
  let best = candidates[0];
  let bestDist = Math.abs(x - best);
  for (const cx of candidates) {
    const d = Math.abs(x - cx);
    if (d < bestDist) {
      best = cx;
      bestDist = d;
    }
  }
  return best;
}

/** Keep shoppers off the south-west entry lane where the player spawns. */
export const WAREHOUSE_ENTRY_CLEAR_RADIUS = 9.5;

export function isNearWarehouseEntry(x: number, z: number, margin = WAREHOUSE_ENTRY_CLEAR_RADIUS): boolean {
  return Math.hypot(x - WAREHOUSE_INTERIOR_SPAWN.x, z - WAREHOUSE_INTERIOR_SPAWN.z) < margin;
}

export const RACETRACK_LOOP = {
  z0: RACK_Z_MIN - 0.5,
  z1: RACK_Z_MAX,
  westX0: WH_MIN_X + 0.8,
  westX1: CENTER_MIN_X - 0.15,
  eastX0: CENTER_MAX_X + 0.15,
  /** Inset from east service wall — racetrack lane, not inside Optical/Photo facades. */
  eastX1: WH_MAX_X - 1.85,
  southZ0: WH_MIN_Z + 0.5,
  southZ1: RACK_Z_MIN - 0.15,
} as const;

/** Valid NPC patrol volume — aisles + racetrack, never inside walls or dept facades. */
export const WAREHOUSE_NPC_BOUNDS = {
  minX: westRacetrackPatrolX() - 0.15,
  maxX: eastRacetrackPatrolX() + 0.15,
  minZ: RACETRACK_LOOP.z0 + 0.4,
  maxZ: RACETRACK_LOOP.z1 - 0.35,
} as const;

export function clampWarehouseNpcPoint(x: number, z: number): { x: number; z: number } {
  return {
    x: Math.max(WAREHOUSE_NPC_BOUNDS.minX, Math.min(WAREHOUSE_NPC_BOUNDS.maxX, x)),
    z: Math.max(WAREHOUSE_NPC_BOUNDS.minZ, Math.min(WAREHOUSE_NPC_BOUNDS.maxZ, z)),
  };
}

const NPC_RACK_CLEARANCE = 0.95;
export function warehousePatrolLaneZs(): number[] {
  const gaps = rackRowGapCentersZ();
  const northGap = RACK_Z_MAX - 1.1;
  const southGap = RACK_Z_MIN + 1.0;
  const candidates = [...gaps, northGap, southGap];
  return candidates.filter(
    (z) =>
      z >= WAREHOUSE_NPC_BOUNDS.minZ &&
      z <= WAREHOUSE_NPC_BOUNDS.maxZ &&
      !isInsideRackFootprint(0, z, NPC_RACK_CLEARANCE),
  );
}

/** Snap any cross-aisle Z to the nearest E–W row gap (never on rack row centers). */
export function snapCrossAisleZ(z: number): number {
  const gaps = rackRowGapCentersZ();
  let best = gaps[0] ?? z;
  let bestDist = Infinity;
  for (const g of gaps) {
    const d = Math.abs(g - z);
    if (d < bestDist) {
      best = g;
      bestDist = d;
    }
  }
  return best;
}

/** Z positions safe for E–W cross-aisle patrol. */
export function crossPatrolLaneZs(): number[] {
  return rackRowGapCentersZ().filter(
    (z) =>
      z >= WAREHOUSE_NPC_BOUNDS.minZ + 0.5 &&
      z <= WAREHOUSE_NPC_BOUNDS.maxZ - 0.5,
  );
}

/** Row-gap Z only — perimeter loop patrol avoids front/back pinch points. */
export function loopPatrolLaneZs(): number[] {
  return rackRowGapCentersZ().filter(
    (z) =>
      z >= WAREHOUSE_NPC_BOUNDS.minZ + 0.5 &&
      z <= WAREHOUSE_NPC_BOUNDS.maxZ - 0.5,
  );
}

/** Snap to patrol X + row-gap Z so NPCs never target shelf row endcaps. */
export function sanitizeWarehouseWaypoint(x: number, y: number, z: number): [number, number, number] {
  const lanes = warehousePatrolLaneZs();
  let px = nearestPatrolX(x);
  px = Math.max(WAREHOUSE_NPC_BOUNDS.minX, Math.min(WAREHOUSE_NPC_BOUNDS.maxX, px));
  let pz = Math.max(WAREHOUSE_NPC_BOUNDS.minZ, Math.min(WAREHOUSE_NPC_BOUNDS.maxZ, z));
  pz = snapCrossAisleZ(pz);

  if (!isInsideRackFootprint(px, pz, NPC_RACK_CLEARANCE)) {
    return [px, y, pz];
  }

  let bestZ = lanes[0] ?? pz;
  let bestDist = Infinity;
  for (const lz of lanes) {
    if (isInsideRackFootprint(px, lz, NPC_RACK_CLEARANCE)) continue;
    const d = Math.abs(lz - pz);
    if (d < bestDist) {
      bestDist = d;
      bestZ = lz;
    }
  }
  return [px, y, bestZ];
}

export function clampWarehouseWaypoint(x: number, y: number, z: number): [number, number, number] {
  return sanitizeWarehouseWaypoint(x, y, z);
}
