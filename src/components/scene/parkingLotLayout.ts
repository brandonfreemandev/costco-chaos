/** Costco-style lot layout (scaled ~1 unit = 1 meter). */

export const LOT = {
  minX: -32,
  maxX: 32,
  minZ: -42,
  maxZ: 38,
  width: 64,
  depth: 80,
} as const;

export const BUILDING = {
  width: 54,
  height: 13,
  depth: 20,
  /** Front facade faces +Z (player approaches from +Z). */
  frontZ: -34,
  centerY: 6.5,
  centerZ: -44,
  entranceWidth: 7,
} as const;

export const CROSSWALK = {
  z: -27,
  width: 10,
  depth: 2.4,
} as const;

export const SIDEWALK = {
  z: -23,
  width: 14,
  depth: 3,
} as const;

export const MAIN_DRIVE = {
  minX: -4.5,
  maxX: 4.5,
} as const;

export const PLAYER_SPAWN = { x: 0, z: 32, yaw: 0 } as const;

export const WAREHOUSE_INTERIOR_SPAWN = { x: 0, z: 16, yaw: 0 } as const;

/** Door threshold — crossing this enters the warehouse. */
export const ENTRANCE_ZONE = {
  minX: -3.2,
  maxX: 3.2,
  minZ: -36.5,
  maxZ: -33.5,
  maxSpeed: 2.8,
} as const;

export const CAR_COLORS = [
  '#2a2d32',
  '#4a4f57',
  '#5c3d2e',
  '#2e4a62',
  '#6a6a6a',
  '#8b1a1a',
  '#d8d4cc',
  '#1e3d2a',
] as const;

export interface ParkedCarSpec {
  id: string;
  x: number;
  z: number;
  rotation: number;
  color: string;
}

/** Perpendicular rows flanking the main drive aisle; gaps for player routing. */
export function generateParkedCars(): ParkedCarSpec[] {
  const cars: ParkedCarSpec[] = [];
  let id = 0;

  const addIfClear = (x: number, z: number, rotation: number, color: string) => {
    if (z > 35 || z < -8) return;
    if (x > MAIN_DRIVE.minX && x < MAIN_DRIVE.maxX && z > -18) return;
    if (Math.abs(x) < 5 && z > 24 && z < 36) return;
    cars.push({ id: `car-${id++}`, x, z, rotation, color });
  };

  const leftRows = [-24, -17.5, -11];
  const rightRows = [11, 17.5, 24];

  for (const x of leftRows) {
    for (let i = 0; i < 6; i++) {
      const z = 4 + i * 5.8;
      addIfClear(x, z, 0, CAR_COLORS[(id + i) % CAR_COLORS.length]);
    }
  }

  for (const x of rightRows) {
    for (let i = 0; i < 6; i++) {
      const z = 4 + i * 5.8;
      addIfClear(x, z, 0, CAR_COLORS[(id + i + 2) % CAR_COLORS.length]);
    }
  }

  for (const x of [-24, -17.5, 11, 17.5]) {
    for (let i = 0; i < 4; i++) {
      const z = -2 - i * 5.8;
      addIfClear(x, z, Math.PI, CAR_COLORS[(id + i + 4) % CAR_COLORS.length]);
    }
  }

  return cars;
}
