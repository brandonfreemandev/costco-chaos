export const BASE_MASS = 40;
export const MAX_SPEED = 4.5;
export const ACCEL = 12;
export const REVERSE_ACCEL = 7.2;
export const LINEAR_DAMPING = 1.8;
export const ANGULAR_DAMPING = 2.5;
export const TURN_RATE = 1.4;

export interface CartInput {
  forward: boolean;
  backward: boolean;
  steer: number;
}

export function getCartMass(inventoryWeight: number): number {
  return BASE_MASS + inventoryWeight;
}
