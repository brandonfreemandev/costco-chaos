/**
 * Costco-style lot (1 unit ≈ 1 m).
 *
 * Rows run EAST–WEST (parallel to the building). Each row has many stalls
 * side-by-side along X at a fixed Z — NOT the same X repeated at many Z values
 * (which reads as bumper-to-bumper when you look down the main drive).
 */

import {
  BUILDING_ENTRANCE,
  BUILDING_ENTRANCE_DOORS,
  VESTIBULE_BARRIER_X,
  VESTIBULE_ENTRANCE,
} from './buildingFacadeLayout';
import { BUILDING_FRONT_Z, YAW_NORTH, YAW_SOUTH } from './worldLayout';

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
  frontZ: BUILDING_FRONT_Z,
  centerY: 6.5,
  centerZ: -44,
} as const;

/** Centered on the member vestibule so pedestrians cross straight to the doors. */
export const CROSSWALK = { x: VESTIBULE_BARRIER_X, z: -27, width: 8, depth: 2.4 } as const;
export const SIDEWALK = { z: -23, width: 14, depth: 3 } as const;

/** North–south fire lane / main drive. */
export const MAIN_DRIVE = { minX: -5, maxX: 5 } as const;

export const STALL = {
  width: 2.75,
  depth: 5.5,
  pitchX: 5.75,
  rowGap: 7,
} as const;

export const PLAYER_SPAWN = { x: 0, z: 18, yaw: YAW_SOUTH } as const;

export const APPROACH_CART_OBSTACLES = [
  { x: -2.4, z: 2 },
  { x: 2.6, z: -1 },
  { x: -1.6, z: -6 },
  { x: 2.2, z: -11 },
  { x: -2.8, z: -15 },
] as const;

/**
 * Just inside the (now centered) member-entrance door on the south wall,
 * facing north (+Z) into the store. yaw = PI → forwardZ = -cos(PI) = +1 (north).
 * z clears the south wall + door frame + travel-vestibule kiosks.
 */
export const WAREHOUSE_INTERIOR_SPAWN = { x: VESTIBULE_ENTRANCE.x, z: -26, yaw: YAW_NORTH } as const;

export const ENTRANCE_Z_BAND = {
  minZ: BUILDING.frontZ - 0.8,
  maxZ: BUILDING.frontZ + 2.2,
  maxSpeed: 3.5,
} as const;

export function isAtEntranceDoor(x: number, z: number, speed: number): boolean {
  if (z < ENTRANCE_Z_BAND.minZ || z > ENTRANCE_Z_BAND.maxZ || speed > ENTRANCE_Z_BAND.maxSpeed) return false;
  return BUILDING_ENTRANCE_DOORS.some(
    (door) => x >= door.x - door.w / 2 - 0.4 && x <= door.x + door.w / 2 + 0.4,
  );
}

/** Green entry mat at the west member entrance. */
export const ENTRANCE_MARKERS = [
  {
    id: 'entrance-west',
    x: BUILDING_ENTRANCE.x,
    z: BUILDING.frontZ + 1.1,
    width: BUILDING_ENTRANCE.w,
    depth: 2.4,
  },
] as const;

/** @deprecated use isAtEntranceDoor */
export const ENTRANCE_ZONE = ENTRANCE_Z_BAND;

/** @deprecated use ENTRANCE_MARKERS */
export const ENTRANCE_MARKER = ENTRANCE_MARKERS[0];

export const CAR_COLORS = [
  '#2b2f36', // graphite
  '#4b5563', // slate
  '#7b8794', // steel blue-gray
  '#d7d7d2', // pearl silver
  '#f5f5f3', // white
  '#1f3a5f', // navy
  '#335f7d', // desaturated blue
  '#4f5b66', // gunmetal
  '#6f7a85', // cool gray
  '#7a3e2b', // muted copper
  '#5d4336', // walnut brown
  '#6b2a2a', // deep maroon
] as const;

/** Five stalls per side — each band uses a slightly different X set so columns don't stack in Z. */
export interface RowPairModule {
  id: string;
  zNorth: number;
  zSouth: number;
  xSlots: readonly number[];
}

/** Only three Z bands — staggered X so one X position doesn't repeat at six Z depths. */
export const ROW_PAIR_MODULES: RowPairModule[] = [
  { id: 'w-front', zNorth: -4, zSouth: 3, xSlots: [-29, -24, -19, -14, -9.5] },
  { id: 'w-mid', zNorth: 10, zSouth: 17, xSlots: [-28, -22.5, -17, -11.5, -8.5] },
  { id: 'w-back', zNorth: 26, zSouth: 33, xSlots: [-30, -25, -20, -15, -10.5] },
  { id: 'e-front', zNorth: -4, zSouth: 3, xSlots: [9.5, 14, 19, 24, 29] },
  { id: 'e-mid', zNorth: 10, zSouth: 17, xSlots: [8.5, 11.5, 17, 22.5, 28] },
  { id: 'e-back', zNorth: 26, zSouth: 33, xSlots: [10.5, 15, 20, 25, 30] },
];

/** Wide E–W traffic lanes between row-pair bands. */
export const EW_DRIVE_Z = [6.5, 21.5] as const;

export interface CartCorralSpec {
  id: string;
  x: number;
  z: number;
  rotation: number;
  cartCount: number;
}

export const CART_CORRALS: CartCorralSpec[] = [
  { id: 'corral-entrance-l', x: -9, z: -21.5, rotation: 0, cartCount: 5 },
  { id: 'corral-entrance-r', x: 9, z: -21.5, rotation: 0, cartCount: 4 },
  { id: 'corral-south-l', x: -22, z: 32, rotation: Math.PI / 2, cartCount: 6 },
  { id: 'corral-south-r', x: 22, z: 30, rotation: -Math.PI / 2, cartCount: 5 },
];

export interface ParkingStallSpec {
  id: string;
  x: number;
  z: number;
  rotation: number;
  moduleId: string;
}

export interface ParkedCarSpec {
  id: string;
  x: number;
  z: number;
  rotation: number;
  color: string;
  stallId: string;
}

export interface CrossAisleSpec {
  z: number;
  x0: number;
  x1: number;
}

export interface EwDriveSpec {
  z: number;
  x0: number;
  x1: number;
}

const ROT_NORTH_ROW = 0;
const ROT_SOUTH_ROW = Math.PI;

function hash01(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return (Math.abs(h) % 1000) / 1000;
}

function stallBlocked(x: number, z: number): boolean {
  if (z > 35 || z < -8) return true;
  if (x > MAIN_DRIVE.minX && x < MAIN_DRIVE.maxX && z > -14) return true;
  if (Math.abs(x) < 6 && z > -10 && z < 8) return true;
  for (const corral of CART_CORRALS) {
    if (Math.hypot(x - corral.x, z - corral.z) < 4.5) return true;
  }
  return false;
}

function stallsForModule(mod: RowPairModule): ParkingStallSpec[] {
  const stalls: ParkingStallSpec[] = [];

  for (const x of mod.xSlots) {
    for (const [z, rotation, band] of [
      [mod.zNorth, ROT_NORTH_ROW, 'n'],
      [mod.zSouth, ROT_SOUTH_ROW, 's'],
    ] as const) {
      if (stallBlocked(x, z)) continue;
      stalls.push({
        id: `${mod.id}-${band}-${x}`,
        x,
        z,
        rotation,
        moduleId: mod.id,
      });
    }
  }

  return stalls;
}

export function generateParkingStalls(): ParkingStallSpec[] {
  return ROW_PAIR_MODULES.flatMap(stallsForModule);
}

export function getCrossAisles(): CrossAisleSpec[] {
  return ROW_PAIR_MODULES.map((mod) => ({
    z: (mod.zNorth + mod.zSouth) / 2,
    x0: mod.xSlots[0] - 3.5,
    x1: mod.xSlots[mod.xSlots.length - 1] + 3.5,
  }));
}

export function getEwDriveAisles(): EwDriveSpec[] {
  return [
    { z: EW_DRIVE_Z[0], x0: LOT.minX + 2, x1: LOT.maxX - 2 },
    { z: EW_DRIVE_Z[1], x0: LOT.minX + 2, x1: LOT.maxX - 2 },
  ];
}

export function generateParkedCars(): ParkedCarSpec[] {
  const stalls = generateParkingStalls();
  const cars: ParkedCarSpec[] = [];
  let carId = 0;

  for (const stall of stalls) {
    if (hash01(stall.id) > 0.72) continue;

    const jitterX = (hash01(`${stall.id}-x`) - 0.5) * 0.1;
    const jitterZ = (hash01(`${stall.id}-z`) - 0.5) * 0.12;
    const yawJitter = (hash01(`${stall.id}-yaw`) - 0.5) * 0.05;

    cars.push({
      id: `car-${carId++}`,
      stallId: stall.id,
      x: stall.x + jitterX,
      z: stall.z + jitterZ,
      rotation: stall.rotation + yawJitter,
      color: CAR_COLORS[Math.floor(hash01(`${stall.id}-c`) * CAR_COLORS.length)],
    });
  }

  return cars;
}

export function getDriveLaneMarkings(): { x: number; z0: number; z1: number }[] {
  return [
    { x: MAIN_DRIVE.minX, z0: LOT.minZ + 4, z1: LOT.maxZ - 4 },
    { x: MAIN_DRIVE.maxX, z0: LOT.minZ + 4, z1: LOT.maxZ - 4 },
  ];
}
