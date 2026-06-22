import { WH_MAX_X, WH_MIN_X, WH_MIN_Z } from './warehouseLayout';
import {
  BUILDING_CLERESTORY_WINDOWS,
  BUILDING_EXIT_DOORS,
  BUILDING_VESTIBULE_DOORS,
  BUILDING_FACADE_LINTEL_Y,
  doorWallFillSegments,
} from './buildingFacadeLayout';

/**
 * Costco south-front checkout (entrance end, −Z):
 *   racetrack approach → registers → short belts → travel vestibule → receipt-check exit.
 * Fresh food stays on the north wall; this cap is only ~9 m deep from the south wall.
 */

export const MEZZANINE_FLOOR_Y = 0;

/** North limit of checkout floor — pallet rows begin just north of here. */
export const CHECKOUT_NORTH_EDGE_Z = -19;

/** South warehouse wall — receipt-check exit on the west end. */
export const CHECKOUT_EXIT_WALL_Z = WH_MIN_Z + 0.35;
/** Interior face of south exit wall (shoppers inside see this). */
export const CHECKOUT_FACADE_Z = CHECKOUT_EXIT_WALL_Z + 0.32;
export const CHECKOUT_WALL_THICK = 0.5;

/** Travel / kiosk vestibule between belt ends and exit doors. */
export const CHECKOUT_VESTIBULE_MIN_Z = CHECKOUT_EXIT_WALL_Z + 0.8;
export const CHECKOUT_VESTIBULE_DEPTH = 3;

export const CHECKOUT_MEZZANINE = {
  minX: WH_MIN_X + 2,
  maxX: WH_MAX_X - 2,
  minZ: CHECKOUT_VESTIBULE_MIN_Z,
  maxZ: CHECKOUT_NORTH_EDGE_Z,
  centerX: 0,
  centerZ: (CHECKOUT_VESTIBULE_MIN_Z + CHECKOUT_NORTH_EDGE_Z) / 2,
  floorY: MEZZANINE_FLOOR_Y,
} as const;

/** Transition strip north of lanes — re-enter from the racetrack after shopping. */
export const CHECKOUT_APPROACH = {
  minX: -6,
  maxX: 6,
  minZ: CHECKOUT_NORTH_EDGE_Z,
  maxZ: CHECKOUT_NORTH_EDGE_Z + 3.5,
} as const;

export const CHECKOUT_LANE_X = [-12.5, -7.5, -2.5, 2.5, 7.5, 12.5] as const;

export const CHECKOUT_DEV_SPAWN = {
  x: CHECKOUT_LANE_X[2],
  z: CHECKOUT_NORTH_EDGE_Z - 1.2,
  yaw: 0,
} as const;

export const CHECKOUT_LANE_IDS = ['1', '2', '3', '4', '5', '6'] as const;

export const LANE_HALF_WIDTH = 2.2;

/** @deprecated use CHECKOUT_EXIT_WALL_Z */
export const CHECKOUT_BACK_WALL_Z = CHECKOUT_EXIT_WALL_Z;

export const CHECKOUT_EXIT_DOORS = BUILDING_EXIT_DOORS;
/** Both south-wall openings (entrance + receipt-check exit) — mirrors the exterior. */
export const CHECKOUT_VESTIBULE_DOORS = BUILDING_VESTIBULE_DOORS;
export const CHECKOUT_WINDOW_COLS = BUILDING_CLERESTORY_WINDOWS;
export const CHECKOUT_FACADE_LINTEL_Y = BUILDING_FACADE_LINTEL_Y;

export function checkoutWallFillSegments(): { x: number; w: number }[] {
  return doorWallFillSegments(WH_MIN_X, WH_MAX_X, BUILDING_VESTIBULE_DOORS);
}

/** Short belts — carts roll south into the travel vestibule after scan. */
export const CHECKOUT_BELT_LENGTH = 2.5;
export const CHECKOUT_BELT_ORIGIN_Z = CHECKOUT_VESTIBULE_MIN_Z + CHECKOUT_VESTIBULE_DEPTH;
/** North end of belt — register / scanner. */
export const CHECKOUT_REGISTER_Z = CHECKOUT_BELT_ORIGIN_Z + CHECKOUT_BELT_LENGTH - 0.25;
export const LANE_QUEUE_FRONT_Z = CHECKOUT_REGISTER_Z + 2.4;
export const LANE_QUEUE_BACK_Z = CHECKOUT_NORTH_EDGE_Z - 0.5;
export const LANE_BELT_Z = CHECKOUT_REGISTER_Z;
export const LANE_REGISTER_Z = CHECKOUT_REGISTER_Z;

export const QUEUE_SLOT_SPACING = 1.4;
export const MAX_VISIBLE_QUEUE = 2;

export function queueSlotZ(slotsFromFront: number): number {
  return LANE_QUEUE_FRONT_Z + slotsFromFront * QUEUE_SLOT_SPACING;
}

export function isInCheckoutApproachStrip(x: number, z: number): boolean {
  return (
    x >= CHECKOUT_APPROACH.minX &&
    x <= CHECKOUT_APPROACH.maxX &&
    z >= CHECKOUT_APPROACH.minZ &&
    z <= CHECKOUT_APPROACH.maxZ
  );
}

export function isOnCheckoutMezzanine(x: number, z: number): boolean {
  return (
    x >= CHECKOUT_MEZZANINE.minX &&
    x <= CHECKOUT_MEZZANINE.maxX &&
    z >= CHECKOUT_MEZZANINE.minZ &&
    z <= CHECKOUT_MEZZANINE.maxZ
  );
}

export function isInFrontCourt(x: number, z: number): boolean {
  return z <= CHECKOUT_NORTH_EDGE_Z && z >= CHECKOUT_VESTIBULE_MIN_Z && x >= WH_MIN_X + 1 && x <= WH_MAX_X - 1;
}

export function isInCheckoutApproach(x: number, z: number): boolean {
  return isOnCheckoutMezzanine(x, z) || isInCheckoutApproachStrip(x, z);
}

export function getCheckoutFloorY(_x: number, _z: number): number {
  return 0;
}

export function getNearestLaneIndex(x: number): number {
  let best = 0;
  let bestDist = Math.abs(x - CHECKOUT_LANE_X[0]);
  for (let i = 1; i < CHECKOUT_LANE_X.length; i += 1) {
    const d = Math.abs(x - CHECKOUT_LANE_X[i]);
    if (d < bestDist) {
      best = i;
      bestDist = d;
    }
  }
  return best;
}

export function getLaneIdAt(x: number): string | null {
  const idx = getNearestLaneIndex(x);
  if (Math.abs(x - CHECKOUT_LANE_X[idx]) > LANE_HALF_WIDTH) return null;
  return CHECKOUT_LANE_IDS[idx];
}
