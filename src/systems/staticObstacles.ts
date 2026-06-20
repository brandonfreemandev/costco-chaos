import {
  APPROACH_CART_OBSTACLES,
  BUILDING,
  generateParkedCars,
  LOT,
} from '../components/scene/parkingLotLayout';
import {
  buildRackCollisionObstacles,
  invalidateRackCollisionCache,
  RACK_COLLISION_DEPTH,
  WH_MAX_X,
  WH_MAX_Z,
  WH_MIN_X,
  WH_MIN_Z,
} from '../components/scene/warehouseLayout';
import { useCartTransformStore } from '../stores/cartTransformStore';
import { useGameStore } from '../stores/gameStore';
import type { GamePhase } from '../types/state';
import { SAMPLE_KIOSKS } from './sampleStations';
import { getActiveNpcRuntimes, type NpcPatrolAxis } from './npcRegistry';

export interface Aabb {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export { RACK_COLLISION_DEPTH };

export const CART_HALF_X = 0.55;
export const CART_HALF_Z = 0.95;

export function getNpcHalfExtents(cartLoad: number): { hx: number; hz: number } {
  const hasCart = cartLoad > 1.2;
  return { hx: hasCart ? 0.72 : 0.42, hz: hasCart ? 1.35 : 0.42 };
}

/** Cart long axis follows travel — row patrol swaps X/Z half extents. */
export function getNpcObstacleExtents(
  cartLoad: number,
  patrolAxis: NpcPatrolAxis = 'free',
): { hx: number; hz: number } {
  const { hx, hz } = getNpcHalfExtents(cartLoad);
  if (patrolAxis === 'row') return { hx: hz, hz: hx };
  return { hx, hz };
}

const SKIN = 0.05;
const SUBSTEP = 0.18;
/** Perimeter dept collision — thin strips on the wall plane, not wide blocks in the racetrack. */
const EAST_FACADE_X = WH_MAX_X - 0.42;
const WEST_FACADE_X = WH_MIN_X + 0.42;
const EAST_DEPT_STRIP_W = 0.7;
const WEST_COOLER_STRIP_W = 1.05;

function getPerimeterDeptObstacles(): Aabb[] {
  const eastCx = EAST_FACADE_X - EAST_DEPT_STRIP_W / 2;
  const westCx = WEST_FACADE_X + WEST_COOLER_STRIP_W / 2;

  return [
    blockAabb(eastCx, 13, EAST_DEPT_STRIP_W, 27),
    blockAabb(westCx, -18, WEST_COOLER_STRIP_W, 9.5),
    blockAabb(westCx, -4, WEST_COOLER_STRIP_W, 10.5),
    blockAabb(westCx, 12, WEST_COOLER_STRIP_W, 8.5),
  ];
}

function blockAabb(x: number, z: number, w: number, d: number): Aabb {
  return { minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2 };
}

function overlaps(x: number, z: number, hx: number, hz: number, box: Aabb): boolean {
  return x + hx > box.minX && x - hx < box.maxX && z + hz > box.minZ && z - hz < box.maxZ;
}

/** True when a cart hull overlaps rack pallet hitboxes (aisle corridors carved out). */
export function cartOverlapsRackObstacle(
  x: number,
  z: number,
  hx = CART_HALF_X,
  hz = CART_HALF_Z,
): boolean {
  for (const box of buildRackCollisionObstacles()) {
    if (overlaps(x, z, hx, hz, box)) return true;
  }
  return false;
}

let warehouseCache: Aabb[] | null = null;

export function invalidateWarehouseObstacleCache(): void {
  warehouseCache = null;
  invalidateRackCollisionCache();
}

let parkingCache: Aabb[] | null = null;

export function invalidateParkingObstacleCache(): void {
  parkingCache = null;
}

export function getWarehouseObstacles(): Aabb[] {
  if (warehouseCache) return warehouseCache;

  const boxes: Aabb[] = [...buildRackCollisionObstacles()];
  boxes.push(blockAabb(-11, WH_MIN_Z + 0.95, 6.5, 1.0));
  boxes.push(...getPerimeterDeptObstacles());
  boxes.push({ minX: WH_MIN_X, maxX: WH_MAX_X, minZ: WH_MIN_Z - 1, maxZ: WH_MIN_Z + 0.5 });
  boxes.push({ minX: WH_MIN_X, maxX: WH_MAX_X, minZ: WH_MAX_Z - 0.5, maxZ: WH_MAX_Z + 1 });
  boxes.push({ minX: WH_MIN_X - 1, maxX: WH_MIN_X + 0.5, minZ: WH_MIN_Z, maxZ: WH_MAX_Z });
  boxes.push({ minX: WH_MAX_X - 0.5, maxX: WH_MAX_X + 1, minZ: WH_MIN_Z, maxZ: WH_MAX_Z });

  warehouseCache = boxes;
  return boxes;
}

export function getParkingObstacles(): Aabb[] {
  if (parkingCache) return parkingCache;

  const boxes: Aabb[] = [];
  for (const car of generateParkedCars()) {
    boxes.push(blockAabb(car.x, car.z, 2, 3.8));
  }
  for (const cart of APPROACH_CART_OBSTACLES) {
    boxes.push(blockAabb(cart.x, cart.z, 0.65, 1.0));
  }
  boxes.push(blockAabb(0, BUILDING.centerZ, BUILDING.width, BUILDING.depth));
  boxes.push({ minX: LOT.minX - 1, maxX: LOT.maxX + 1, minZ: LOT.minZ - 1, maxZ: LOT.minZ + 0.5 });
  boxes.push({ minX: LOT.minX - 1, maxX: LOT.maxX + 1, minZ: LOT.maxZ - 0.5, maxZ: LOT.maxZ + 1 });
  boxes.push({ minX: LOT.minX - 1, maxX: LOT.minX + 0.5, minZ: LOT.minZ, maxZ: LOT.maxZ });
  boxes.push({ minX: LOT.maxX - 0.5, maxX: LOT.maxX + 1, minZ: LOT.minZ, maxZ: LOT.maxZ });
  boxes.push(blockAabb(-28, 0, 3, LOT.depth - 4));
  boxes.push(blockAabb(28, 0, 3, LOT.depth - 4));

  parkingCache = boxes;
  return boxes;
}

export function getNpcObstacles(): Aabb[] {
  const boxes: Aabb[] = [];
  for (const npc of getActiveNpcRuntimes()) {
    const { hx, hz } = getNpcHalfExtents(npc.meta.cartLoad);
    boxes.push({
      minX: npc.x - hx,
      maxX: npc.x + hx,
      minZ: npc.z - hz,
      maxZ: npc.z + hz,
    });
  }
  return boxes;
}

export function getPlayerObstacle(): Aabb | null {
  const phase = useGameStore.getState().phase;
  if (phase !== 'PARKING' && phase !== 'SHOPPING' && phase !== 'CHECKOUT') return null;

  const { position, speed } = useCartTransformStore.getState();
  if (speed < 0.18) return null;

  return {
    minX: position.x - CART_HALF_X,
    maxX: position.x + CART_HALF_X,
    minZ: position.z - CART_HALF_Z,
    maxZ: position.z + CART_HALF_Z,
  };
}

function getSampleKioskObstacles(): Aabb[] {
  return SAMPLE_KIOSKS.map((kiosk) => blockAabb(kiosk.x, kiosk.z, 1.75, 0.75));
}

export interface NpcMovementSelf {
  x: number;
  z: number;
  hx: number;
  hz: number;
  patrolAxis: NpcPatrolAxis;
}

/** Static + player + other shoppers (+ sample counters in warehouse). */
export function getNpcMovementObstacles(
  phase: GamePhase,
  excludeNpcId: string,
  self?: NpcMovementSelf,
): Aabb[] {
  const boxes =
    phase === 'PARKING' ? getParkingObstacles().slice() : getWarehouseObstacles().slice();

  if (phase === 'SHOPPING' || phase === 'CHECKOUT') {
    if (!excludeNpcId.startsWith('wh-sample')) {
      boxes.push(...getSampleKioskObstacles());
    }
  }

  const player = getPlayerObstacle();
  if (player) boxes.push(player);

  for (const npc of getActiveNpcRuntimes()) {
    if (npc.meta.npcId === excludeNpcId) continue;

    let { hx, hz } = getNpcHalfExtents(npc.meta.cartLoad);
    const otherAxis = npc.meta.patrolAxis ?? 'free';
    if (otherAxis === 'row') {
      ({ hx, hz } = { hx: hz, hz: hx });
    }

    if (self?.patrolAxis === 'column' && otherAxis === 'row') {
      // Row patrol fixed Z — yield right-of-way at every cross-aisle (not just center).
      if (Math.abs(npc.z - self.z) < hz + self.hz + 1.85) {
        continue;
      }
    } else if (self?.patrolAxis === 'row' && otherAxis === 'column') {
      if (Math.abs(npc.z - self.z) < hz + self.hz + 1.85) {
        continue;
      }
    } else if (self?.patrolAxis === 'column' && otherAxis === 'column') {
      if (Math.abs(npc.x - self.x) < 0.45 && Math.abs(npc.z - self.z) > hz + self.hz + 2.8) {
        continue;
      }
    } else if (npc.speed < 0.12) {
      continue;
    }

    boxes.push({
      minX: npc.x - hx,
      maxX: npc.x + hx,
      minZ: npc.z - hz,
      maxZ: npc.z + hz,
    });
  }

  return boxes;
}

function resolveAxis(
  start: number,
  delta: number,
  other: number,
  hx: number,
  hz: number,
  obstacles: Aabb[],
  axis: 'x' | 'z',
): { pos: number; blocked: boolean } {
  if (Math.abs(delta) < 1e-8) return { pos: start, blocked: false };

  let pos = start + delta;
  const forward = delta > 0;
  let blocked = false;

  for (const box of obstacles) {
    const hit = axis === 'x' ? overlaps(pos, other, hx, hz, box) : overlaps(other, pos, hx, hz, box);
    if (!hit) continue;
    blocked = true;
    if (axis === 'x') {
      pos = forward ? box.minX - hx - SKIN : box.maxX + hx + SKIN;
    } else {
      pos = forward ? box.minZ - hz - SKIN : box.maxZ + hz + SKIN;
    }
  }

  return { pos, blocked };
}

function depenetrate(x: number, z: number, hx: number, hz: number, obstacles: Aabb[]): { x: number; z: number } {
  let nx = x;
  let nz = z;

  for (let iter = 0; iter < 6; iter++) {
    let bestDepth = Infinity;
    let pushX = 0;
    let pushZ = 0;
    let found = false;

    for (const box of obstacles) {
      if (!overlaps(nx, nz, hx, hz, box)) continue;

      const pushLeft = nx + hx - box.minX;
      const pushRight = box.maxX - (nx - hx);
      const pushTop = nz + hz - box.minZ;
      const pushBottom = box.maxZ - (nz - hz);
      const min = Math.min(pushLeft, pushRight, pushTop, pushBottom);

      if (min < 0.08 || min >= bestDepth) continue;

      found = true;
      bestDepth = min;
      pushX = 0;
      pushZ = 0;
      if (min === pushLeft) pushX = -(pushLeft + SKIN);
      else if (min === pushRight) pushX = pushRight + SKIN;
      else if (min === pushTop) pushZ = -(pushTop + SKIN);
      else pushZ = pushBottom + SKIN;
    }

    if (!found) break;
    nx += pushX;
    nz += pushZ;
  }

  return { x: nx, z: nz };
}

export interface CartMoveResult {
  x: number;
  z: number;
  blockedX: boolean;
  blockedZ: boolean;
}

export function resolveCartMove(
  x: number,
  z: number,
  dx: number,
  dz: number,
  obstacles: Aabb[],
  hx = CART_HALF_X,
  hz = CART_HALF_Z,
): CartMoveResult {
  const dist = Math.hypot(dx, dz);
  const steps = Math.max(1, Math.ceil(dist / SUBSTEP));
  const sdx = dx / steps;
  const sdz = dz / steps;

  let nx = x;
  let nz = z;
  let blockedX = false;
  let blockedZ = false;

  for (let i = 0; i < steps; i++) {
    const rx = resolveAxis(nx, sdx, nz, hx, hz, obstacles, 'x');
    nx = rx.pos;
    blockedX ||= rx.blocked;

    const rz = resolveAxis(nz, sdz, nx, hx, hz, obstacles, 'z');
    nz = rz.pos;
    blockedZ ||= rz.blocked;
  }

  const pushed = depenetrate(nx, nz, hx, hz, obstacles);
  return { x: pushed.x, z: pushed.z, blockedX, blockedZ };
}
