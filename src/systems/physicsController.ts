export const BASE_MASS = 40;
export const MAX_SPEED = 4.5;
export const ACCEL = 14;
export const REVERSE_ACCEL = 9;
export const LINEAR_DAMPING = 3.2;
export const ANGULAR_DAMPING = 4;
export const TURN_RATE = 2.2;
export const CART_HEIGHT = 0.9;

export function getCartMass(inventoryWeight: number): number {
  return BASE_MASS + inventoryWeight;
}
