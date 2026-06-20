import { AISLE_SPECS, CROSS_AISLES_Z, isInsideRackFootprint, sanitizeWarehouseWaypoint, snapCrossAisleZ } from '../components/scene/warehouseLayout';

export interface SampleKioskSpec {
  id: string;
  x: number;
  z: number;
  sampleName: string;
}

/**
 * Cross-aisle sample counters — center drive lane or east side aisle, clear of rack rows.
 * sample-mid shares the bakery cross-aisle (z=0.5) but sits in the wide center aisle.
 */
export const SAMPLE_KIOSKS: SampleKioskSpec[] = [
  { id: 'sample-north', x: 0, z: snapCrossAisleZ(CROSS_AISLES_Z[0]), sampleName: 'Pizza Pinwheel' },
  { id: 'sample-mid', x: 0, z: snapCrossAisleZ(CROSS_AISLES_Z[1]), sampleName: 'Mystery Protein Cube' },
  { id: 'sample-south', x: AISLE_SPECS[2].x, z: snapCrossAisleZ(CROSS_AISLES_Z[2]), sampleName: 'Chicken Bite (Allegedly)' },
];

if (import.meta.env?.DEV) {
  for (const kiosk of SAMPLE_KIOSKS) {
    if (isInsideRackFootprint(kiosk.x, kiosk.z, 1.0)) {
      console.error(`[layout] Sample "${kiosk.id}" overlaps racks at (${kiosk.x}, ${kiosk.z})`);
    }
  }
}

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

/** Ring slot outside the green sample ring — keeps swarmers off the counter. */
export function sampleApproachPoint(kioskX: number, kioskZ: number, npcId: string): { x: number; z: number } {
  let h = 0;
  for (let i = 0; i < npcId.length; i++) {
    h = (h * 31 + npcId.charCodeAt(i)) | 0;
  }
  const angle = (Math.abs(h) % 360) * (Math.PI / 180);
  const radius = 2.35;
  const raw = {
    x: kioskX + Math.cos(angle) * radius,
    z: kioskZ + Math.sin(angle) * radius,
  };
  const [sx, , sz] = sanitizeWarehouseWaypoint(raw.x, 0, raw.z);
  return { x: sx, z: sz };
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
