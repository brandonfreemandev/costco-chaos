import {
  APPROACH_CART_OBSTACLES,
  BUILDING,
  ENTRANCE_ALCOVE,
  generateParkedCars,
  LOT,
} from '../components/scene/parkingLotLayout';
import {
  buildRackSegments,
  SPINE_DEPTH,
  WH_MAX_X,
  WH_MAX_Z,
  WH_MIN_X,
  WH_MIN_Z,
} from '../components/scene/warehouseLayout';
import { useCartTransformStore } from '../stores/cartTransformStore';
import { useGameStore } from '../stores/gameStore';
import type { GamePhase } from '../types/state';
import { SAMPLE_KIOSKS } from './sampleStations';
import { getActiveNpcRuntimes } from './npcRegistry';

export interface Aabb {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export const CART_HALF_X = 0.55;
export const CART_HALF_Z = 0.95;

export function getNpcHalfExtents(cartLoad: number): { hx: number; hz: number } {
  const hasCart = cartLoad > 1.2;
  return { hx: hasCart ? 0.72 : 0.42, hz: hasCart ? 1.35 : 0.42 };
}

const SKIN = 0.05;
const SUBSTEP = 0.18;

function rackAabb(x: number, z0: number, z1: number): Aabb {
  const halfX = SPINE_DEPTH / 2;
  return { minX: x - halfX, maxX: x + halfX, minZ: z0, maxZ: z1 };
}

function blockAabb(x: number, z: number, w: number, d: number): Aabb {
  return { minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2 };
}

let warehouseCache: Aabb[] | null = null;

export function invalidateWarehouseObstacleCache(): void {
  warehouseCache = null;
}
let parkingCache: Aabb[] | null = null;

export function invalidateParkingObstacleCache(): void {
  parkingCache = null;
}

export function getWarehouseObstacles(): Aabb[] {
  if (warehouseCache) return warehouseCache;

  const boxes: Aabb[] = [];
  for (const seg of buildRackSegments()) {
    boxes.push(rackAabb(seg.x, seg.z0, seg.z1));
  }
  boxes.push(blockAabb(-11, -24, 9, 7));
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
  // Building shell — wings + back block; recessed entrance alcove stays walkable
  const bHalf = BUILDING.width / 2;
  const aHalf = ENTRANCE_ALCOVE.width / 2;
  const wingW = bHalf - aHalf;
  const wingX = aHalf + wingW / 2;
  boxes.push(blockAabb(-wingX, BUILDING.centerZ, wingW, BUILDING.depth));
  boxes.push(blockAabb(wingX, BUILDING.centerZ, wingW, BUILDING.depth));
  const backMinZ = BUILDING.centerZ - BUILDING.depth / 2;
  const backMaxZ = ENTRANCE_ALCOVE.backZ - 0.5;
  boxes.push(blockAabb(0, (backMinZ + backMaxZ) / 2, BUILDING.width, backMaxZ - backMinZ));
  boxes.push({ minX: LOT.minX - 1, maxX: LOT.maxX + 1, minZ: LOT.minZ - 1, maxZ: LOT.minZ + 0.5 });
  boxes.push({ minX: LOT.minX - 1, maxX: LOT.maxX + 1, minZ: LOT.maxZ - 0.5, maxZ: LOT.maxZ + 1 });
  boxes.push({ minX: LOT.minX - 1, maxX: LOT.minX + 0.5, minZ: LOT.minZ, maxZ: LOT.maxZ });
  boxes.push({ minX: LOT.maxX - 0.5, maxX: LOT.maxX + 1, minZ: LOT.minZ, maxZ: LOT.maxZ });
  boxes.push(blockAabb(-28, 0, 3, LOT.depth - 4));
  boxes.push(blockAabb(28, 0, 3, LOT.depth - 4));

  parkingCache = boxes;
  return boxes;
}

/** Live shopper/cart boxes — kinematic player ignores Rapier, so these must be manual too. */
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

/** Player cart hull for NPC manual blocking (player uses manual motion too). */
export function getPlayerObstacle(): Aabb | null {
  const phase = useGameStore.getState().phase;
  if (phase !== 'PARKING' && phase !== 'SHOPPING' && phase !== 'CHECKOUT') return null;

  const { position } = useCartTransformStore.getState();
  return {
    minX: position.x - CART_HALF_X,
    maxX: position.x + CART_HALF_X,
    minZ: position.z - CART_HALF_Z,
    maxZ: position.z + CART_HALF_Z,
  };
}

/** Sample counter footprint — blocks NPCs, not the player (cart rolls through the ring). */
function getSampleKioskObstacles(): Aabb[] {
  return SAMPLE_KIOSKS.map((kiosk) => blockAabb(kiosk.x, kiosk.z, 1.75, 0.75));
}

/** Static + player + other shoppers (+ sample counters in warehouse). */
export function getNpcMovementObstacles(phase: GamePhase, excludeNpcId: string): Aabb[] {
  const boxes =
    phase === 'PARKING' ? getParkingObstacles().slice() : getWarehouseObstacles().slice();

  if (phase === 'SHOPPING' || phase === 'CHECKOUT') {
    boxes.push(...getSampleKioskObstacles());
  }

  const player = getPlayerObstacle();
  if (player) boxes.push(player);

  for (const npc of getActiveNpcRuntimes()) {
    if (npc.meta.npcId === excludeNpcId) continue;
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

function overlaps(x: number, z: number, hx: number, hz: number, box: Aabb): boolean {
  return x + hx > box.minX && x - hx < box.maxX && z + hz > box.minZ && z - hz < box.maxZ;
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

  for (let iter = 0; iter < 8; iter++) {
    let moved = false;
    for (const box of obstacles) {
      if (!overlaps(nx, nz, hx, hz, box)) continue;

      const pushLeft = nx + hx - box.minX;
      const pushRight = box.maxX - (nx - hx);
      const pushTop = nz + hz - box.minZ;
      const pushBottom = box.maxZ - (nz - hz);
      const min = Math.min(pushLeft, pushRight, pushTop, pushBottom);

      if (min === pushLeft) nx -= pushLeft + SKIN;
      else if (min === pushRight) nx += pushRight + SKIN;
      else if (min === pushTop) nz -= pushTop + SKIN;
      else nz += pushBottom + SKIN;

      moved = true;
    }
    if (!moved) break;
  }

  return { x: nx, z: nz };
}

export interface CartMoveResult {
  x: number;
  z: number;
  blockedX: boolean;
  blockedZ: boolean;
}

/** Substepped axis slide + depenetration — deterministic, no Rapier dependency. */
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
