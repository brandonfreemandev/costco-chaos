import { CART_HALF_X, CART_HALF_Z, getNpcHalfExtents } from './staticObstacles';
import { getActiveNpcRuntimes } from './npcRegistry';
import { tryNpcProximityBump } from './handleCollision';

/** How far past “touching” we still count a bump (manual separation keeps hulls ~0.05 apart). */
const TOUCH_SLACK = 0.38;

/** <= 0 means overlapping; small positive = separated by less than slack. */
export function npcSeparationGap(
  px: number,
  pz: number,
  nx: number,
  nz: number,
  nhx: number,
  nhz: number,
): number {
  const gapX = Math.abs(px - nx) - (CART_HALF_X + nhx);
  const gapZ = Math.abs(pz - nz) - (CART_HALF_Z + nhz);
  return Math.max(gapX, gapZ);
}

export function isNpcTouching(px: number, pz: number, nx: number, nz: number, cartLoad: number): boolean {
  const { hx, hz } = getNpcHalfExtents(cartLoad);
  return npcSeparationGap(px, pz, nx, nz, hx, hz) <= TOUCH_SLACK;
}

/** Run once per frame after the cart moves — single source of truth for shopper bumps. */
export function applyNpcBumps(px: number, pz: number, playerSpeed: number): void {
  for (const npc of getActiveNpcRuntimes()) {
    if (!isNpcTouching(px, pz, npc.x, npc.z, npc.meta.cartLoad)) continue;
    tryNpcProximityBump(npc.meta.npcId, playerSpeed, npc.speed, npc.meta.cartLoad);
  }
}
