import { AISLE_SPECS, RACK_Z_MIN, RACK_Z_MAX, WH_CEILING } from './warehouseLayout';

/** Fluorescent troffer positions — shared by fixtures, floor pools, and IBL lightformers. */
export interface CeilingLightSpec {
  x: number;
  y: number;
  z: number;
}

const ROW_STEP = 9;
const rowZ: number[] = [];
for (let z = RACK_Z_MIN + 5; z <= RACK_Z_MAX - 3; z += ROW_STEP) {
  rowZ.push(z);
}

export const WAREHOUSE_CEILING_LIGHTS: CeilingLightSpec[] = AISLE_SPECS.flatMap(({ x }) =>
  rowZ.map((z) => ({ x, y: WH_CEILING - 0.28, z })),
);

export const TROFFER_WIDTH = 2.6;
export const TROFFER_DEPTH = 1.05;
