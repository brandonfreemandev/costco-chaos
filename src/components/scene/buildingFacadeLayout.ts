/**
 * West member vestibule — entrance + receipt-check exit side-by-side (Costco layout).
 * All exterior/interior facade elements derive positions from these constants.
 */

/** West entrance (left) and exit (right) with ~1.5 m between openings. */
export const VESTIBULE_ENTRANCE = { x: -15, w: 3 } as const;
export const VESTIBULE_EXIT = { x: -10.5, w: 3 } as const;

/** @deprecated aliases */
export const BUILDING_ENTRANCE = VESTIBULE_ENTRANCE;
export const BUILDING_WEST_EXIT = VESTIBULE_EXIT;

export const BUILDING_ENTRANCE_DOORS = [VESTIBULE_ENTRANCE] as const;
/** Interior south wall + exterior parking lot — exit only on warehouse face. */
export const BUILDING_EXIT_DOORS = [VESTIBULE_EXIT] as const;
/** Both doors on the parking-lot shell (member entrance + receipt-check exit). */
export const BUILDING_VESTIBULE_DOORS = [VESTIBULE_ENTRANCE, VESTIBULE_EXIT] as const;

/** One window column above each vestibule door. */
export const BUILDING_CLERESTORY_WINDOWS = [VESTIBULE_ENTRANCE.x, VESTIBULE_EXIT.x] as const;
export const CLERESTORY_WINDOW_W = 2.45;
export const CLERESTORY_WINDOW_H = 1.35;

export const BUILDING_FACADE_LINTEL_Y = 3.05;

/** Shared door frame height — entrance and exit must match. */
export const VESTIBULE_DOOR_BASE_Y = 2.75;
export const VESTIBULE_DOOR_HEIGHT = 5.1;
export const VESTIBULE_DOOR_DEPTH = 0.18;
export const VESTIBULE_DOOR_TOP_Y = VESTIBULE_DOOR_BASE_Y + VESTIBULE_DOOR_HEIGHT / 2;
export const CLERESTORY_CENTER_Y = VESTIBULE_DOOR_TOP_Y + CLERESTORY_WINDOW_H / 2 + 0.45;

/** Barrier post between entrance and exit queues. */
export const VESTIBULE_BARRIER_X = (VESTIBULE_ENTRANCE.x + VESTIBULE_EXIT.x) / 2;

export const VESTIBULE_X_MIN = VESTIBULE_ENTRANCE.x - VESTIBULE_ENTRANCE.w / 2 - 0.35;
export const VESTIBULE_X_MAX = VESTIBULE_EXIT.x + VESTIBULE_EXIT.w / 2 + 0.35;

/** Solid wall spans between / beside door openings on a flat facade. */
export function doorWallFillSegments(
  minX: number,
  maxX: number,
  doors: readonly { x: number; w: number }[],
  inset = 0.25,
): { x: number; w: number }[] {
  const doorSpecs = [...doors].sort((a, b) => a.x - b.x);
  const segments: { x: number; w: number }[] = [];
  let cursor = minX + inset;
  for (const { x, w } of doorSpecs) {
    const gap0 = x - w / 2;
    const gap1 = x + w / 2;
    if (gap0 > cursor) segments.push({ x: (cursor + gap0) / 2, w: gap0 - cursor });
    cursor = gap1;
  }
  if (maxX - inset > cursor) {
    segments.push({ x: (cursor + maxX - inset) / 2, w: maxX - inset - cursor });
  }
  return segments;
}
