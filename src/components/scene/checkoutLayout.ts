import { FRONT_COURT_MIN_Z, WH_MAX_X, WH_MAX_Z, WH_MIN_X } from './warehouseLayout';

/** Checkout lanes sit on the front-court floor — no raised deck blocking carts. */

export const MEZZANINE_FLOOR_Y = 0;

/** Register lane area — rack-free front court near exit. */
export const CHECKOUT_MEZZANINE = {
  minX: WH_MIN_X + 2,
  maxX: WH_MAX_X - 2,
  minZ: FRONT_COURT_MIN_Z,
  maxZ: WH_MAX_Z - 0.8,
  centerX: 0,
  centerZ: (FRONT_COURT_MIN_Z + WH_MAX_Z - 0.8) / 2,
  floorY: MEZZANINE_FLOOR_Y,
} as const;

/** Transition strip south of lanes — signage only, not a physical ramp. */
export const CHECKOUT_APPROACH = {
  minX: -6,
  maxX: 6,
  minZ: FRONT_COURT_MIN_Z - 3,
  maxZ: FRONT_COURT_MIN_Z,
} as const;

export const CHECKOUT_LANE_X = [-12.5, -7.5, -2.5, 2.5, 7.5, 12.5] as const;
export const CHECKOUT_LANE_IDS = ['1', '2', '3', '4', '5', '6'] as const;

export const LANE_HALF_WIDTH = 2.2;
export const CHECKOUT_BACK_WALL_Z = WH_MAX_Z - 0.35;
/** South face of exit wall — the side shoppers see from checkout. */
export const CHECKOUT_FACADE_Z = CHECKOUT_BACK_WALL_Z - 0.32;
/** Belt runs north toward exit wall; queue slots step south along the west side. */
export const CHECKOUT_BELT_ORIGIN_Z = FRONT_COURT_MIN_Z + 0.35;
export const CHECKOUT_BELT_LENGTH = CHECKOUT_BACK_WALL_Z - CHECKOUT_BELT_ORIGIN_Z - 0.55;
export const LANE_QUEUE_FRONT_Z = CHECKOUT_BACK_WALL_Z - 1.35;
export const LANE_QUEUE_BACK_Z = CHECKOUT_MEZZANINE.minZ + 0.6;
/** @deprecated alias */
export const LANE_BELT_Z = CHECKOUT_BACK_WALL_Z - 0.72;
/** @deprecated alias */
export const LANE_REGISTER_Z = LANE_BELT_Z;
export const QUEUE_SLOT_SPACING = 1.45;
export const MAX_VISIBLE_QUEUE = 4;

export function queueSlotZ(slotsFromFront: number): number {
  return LANE_QUEUE_FRONT_Z - slotsFromFront * QUEUE_SLOT_SPACING;
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
  return z >= FRONT_COURT_MIN_Z && x >= WH_MIN_X + 1 && x <= WH_MAX_X - 1;
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
