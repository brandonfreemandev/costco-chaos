import { AISLE_CENTERS_X, WH_CEILING, WH_MAX_Z, WH_MIN_Z } from './warehouseLayout';

/** Fluorescent troffer positions — shared by fixtures, floor pools, and IBL lightformers. */
export interface CeilingLightSpec {
  x: number;
  y: number;
  z: number;
}

const ROW_STEP = 11;
const rowZ: number[] = [];
for (let z = WH_MIN_Z + 6; z <= WH_MAX_Z - 6; z += ROW_STEP) {
  rowZ.push(z);
}

export const WAREHOUSE_CEILING_LIGHTS: CeilingLightSpec[] = AISLE_CENTERS_X.flatMap((x) =>
  rowZ.map((z) => ({ x, y: WH_CEILING - 0.28, z })),
);

export const TROFFER_WIDTH = 2.6;
export const TROFFER_DEPTH = 1.05;
