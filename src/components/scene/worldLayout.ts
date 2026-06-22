/**
 * worldLayout.ts — THE coordinate contract + foundational world anchors.
 *
 * This module imports NOTHING from other layout files (it is the bottom of the
 * dependency graph). Everything spatial should trace back here. If you are an
 * agent or human about to reason about positions, read this contract FIRST and
 * do not re-derive axis meanings from screenshots.
 *
 * ┌─ COORDINATE CONTRACT (authoritative) ──────────────────────────────┐
 * │ Axis │ Direction │ Meaning                                          │
 * │ −Z   │ South     │ parking lot, building front, store ENTRANCE end  │
 * │ +Z   │ North     │ back of the warehouse (fresh food, coolers)      │
 * │ −X   │ West      │                                                  │
 * │ +X   │ East      │                                                  │
 * │  Y   │ Up        │                                                  │
 * └────────────────────────────────────────────────────────────────────┘
 *
 * CART YAW:  forwardZ = −cos(yaw),  so:
 *   yaw = 0   → faces −Z (SOUTH, toward parking / the exit doors)
 *   yaw = π   → faces +Z (NORTH, into the store)
 * Use the named YAW_* constants below instead of raw 0 / Math.PI.
 *
 * drei <Text>: a text plane faces +Z by default. Shoppers approaching a sign
 * from the NORTH (+Z) read it correctly at rotation [0,0,0]. A sign viewed from
 * the opposite side shows a MIRRORED backface — for free-standing labels (lane
 * numbers, sample tables) wrap them in <Billboard> so they always face camera.
 *
 * TWO SHELLS (historical architecture): the parking-lot BUILDING shell and the
 * warehouse interior are separate volumes ~SHELL_GAP metres apart in Z; entering
 * teleports the cart between them (see WAREHOUSE_INTERIOR_SPAWN). Entrance/exit
 * doors on BOTH shells derive from VESTIBULE_* in buildingFacadeLayout.ts.
 */

// ── Facing (yaw) — named so spawns/doors aren't magic numbers ──────────
export const YAW_SOUTH = 0;
export const YAW_NORTH = Math.PI;

// ── Warehouse interior box (the canonical world dimensions) ────────────
export const WH_WIDTH = 34;
export const WH_DEPTH = 56;
export const WH_CEILING = 9;

export const WH_MIN_X = -WH_WIDTH / 2;
export const WH_MAX_X = WH_WIDTH / 2;
export const WH_MIN_Z = -WH_DEPTH / 2;
export const WH_MAX_Z = WH_DEPTH / 2;

// ── Cross-shell anchors (define the parking↔warehouse relationship once) ─
/** Interior south wall — the entrance/exit wall the member doors sit on. */
export const WAREHOUSE_SOUTH_Z = WH_MIN_Z;
/** Parking-shell facade Z — its doors face north toward the lot. */
export const BUILDING_FRONT_Z = -34;
/** Empty Z between the parking shell and the warehouse south wall (~6 m). */
export const SHELL_GAP = WAREHOUSE_SOUTH_Z - BUILDING_FRONT_Z;
