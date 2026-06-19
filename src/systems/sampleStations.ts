import { AISLE_CENTERS_X, CROSS_AISLES_Z } from '../components/scene/warehouseLayout';

export interface SampleKioskSpec {
  id: string;
  x: number;
  z: number;
  sampleName: string;
}

/** Open aisle / cross-aisle spots — no collision boxes, cart rolls through the ring. */
export const SAMPLE_KIOSKS: SampleKioskSpec[] = [
  { id: 'sample-north', x: 0, z: CROSS_AISLES_Z[0], sampleName: 'Pizza Pinwheel' },
  { id: 'sample-mid', x: AISLE_CENTERS_X[1], z: CROSS_AISLES_Z[1], sampleName: 'Mystery Protein Cube' },
  { id: 'sample-south', x: AISLE_CENTERS_X[4], z: CROSS_AISLES_Z[2], sampleName: 'Chicken Bite (Allegedly)' },
];

export const SAMPLE_TAKE_RADIUS = 4.5;
export const SAMPLE_TAKE_RADIUS_SQ = SAMPLE_TAKE_RADIUS * SAMPLE_TAKE_RADIUS;
export const SAMPLE_SWARM_RADIUS = 22;
export const SAMPLE_MH_RESTORE = 18;

export const SAMPLE_LINES = [
  'Free sample. Unlimited regret.',
  'One bite restores dignity. Briefly.',
  'Sample acquired. Witnesses remain.',
  'You ate before paying. Costco blesses you.',
  'Tastes like hope. Smells like crowds.',
] as const;

export function pickSampleLine(): string {
  return SAMPLE_LINES[Math.floor(Math.random() * SAMPLE_LINES.length)];
}

export function nearestKiosk(px: number, pz: number): { kiosk: SampleKioskSpec; distSq: number } | null {
  let best: { kiosk: SampleKioskSpec; distSq: number } | null = null;
  for (const kiosk of SAMPLE_KIOSKS) {
    const dx = px - kiosk.x;
    const dz = pz - kiosk.z;
    const distSq = dx * dx + dz * dz;
    if (!best || distSq < best.distSq) best = { kiosk, distSq };
  }
  return best;
}
