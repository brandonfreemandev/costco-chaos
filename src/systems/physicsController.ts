export const BASE_MASS = 40;
export const MAX_SPEED = 4.5;
export const ACCEL = 14;
export const REVERSE_ACCEL = 9;
export const LINEAR_DAMPING = 3.2;
export const ANGULAR_DAMPING = 4;
export const TURN_RATE = 2.2;
export const CART_HEIGHT = 0.9;

/** Rigid-body Y so collider bottom sits on floor (half-height = 0.45). */
export const CART_BODY_CENTER_Y = CART_HEIGHT / 2;

export const WALK_MAX_SPEED = 2.4;
export const WALK_ACCEL = 20;
export const WALK_REVERSE_ACCEL = 14;
export const WALK_DAMPING = 4.5;
export const WALK_TURN_RATE = 2.8;
export const PEDESTRIAN_HEIGHT = 0.9;

export function getCartMass(inventoryWeight: number): number {
  return BASE_MASS + inventoryWeight;
}
