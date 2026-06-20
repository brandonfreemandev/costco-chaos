#!/usr/bin/env npx tsx
/**
 * Unified ship gates — run via: npm run validate:routes
 * Graph connected, visual/collision parity, south loop, kiosks, NPC routes.
 */
import { generateWarehouseNPCs } from '../src/components/scene/CulledNPC';
import {
  buildRackCollisionObstacles,
  buildRackVisualChunks,
  isColumnPathWalkable,
  isInsideRackFootprint,
  rackRowGapCentersZ,
  westRacetrackPatrolX,
  eastRacetrackPatrolX,
} from '../src/components/scene/warehouseLayout';
import { SAMPLE_KIOSKS } from '../src/systems/sampleStations';
import {
  buildWalkabilityGraph,
  isInsideKioskCore,
  KIOSK_NO_GO_RADIUS,
  validateWalkabilityGraph,
} from '../src/systems/WalkabilityGraph';
import { detectSyntheticJitterLoop } from '../src/systems/chaosMonitor';
import { travelYawFromDirection, gridPatrolYaw } from '../src/systems/FacingConvention';

let failed = false;

function gate(name: string, pass: boolean, detail: string): void {
  console.log(`  ${name}: ${pass ? 'PASS' : 'FAIL'} — ${detail}`);
  if (!pass) failed = true;
}

console.log('Costco Chaos — ship gates\n');

const graph = buildWalkabilityGraph();
const graphResult = validateWalkabilityGraph(graph);
gate(
  'graph-connected',
  graphResult.passesPhaseAGate,
  `${graphResult.nodeCount} nodes, ${graphResult.edgeCount} edges, connected=${graphResult.connected}, orphans=${graphResult.orphanPatrolNodes.length}`,
);

const chunks = buildRackVisualChunks();
const collision = buildRackCollisionObstacles();
gate(
  'visual-collision-parity',
  chunks.length > 0 && collision.length > 0 && chunks.length === collision.length,
  `${chunks.length} visual chunks vs ${collision.length} collision boxes (must match)`,
);

const southZ = rackRowGapCentersZ()[0];
const westX = westRacetrackPatrolX();
const eastX = eastRacetrackPatrolX();
const southRowBlockedByKiosk = (() => {
  for (let i = 0; i <= 32; i++) {
    const t = i / 32;
    const x = westX + (eastX - westX) * t;
    if (isInsideKioskCore(x, southZ, KIOSK_NO_GO_RADIUS)) return true;
  }
  return false;
})();
const hasSouthPerimeterRow = graph.edges.some((e) => {
  const a = graph.nodeById.get(e.from);
  const b = graph.nodeById.get(e.to);
  if (!a || !b || e.axis !== 'row') return false;
  if (Math.abs(a.z - southZ) > 0.15) return false;
  const minX = Math.min(a.x, b.x);
  const maxX = Math.max(a.x, b.x);
  return minX <= westX + 0.2 && maxX >= eastX - 0.2;
});
gate(
  'south-racetrack-loop',
  !southRowBlockedByKiosk || hasSouthPerimeterRow,
  southRowBlockedByKiosk
    ? 'Kiosk blocks south row — graph must include full W→E south edge or relocate kiosk'
    : `South row Z=${southZ.toFixed(2)} clear for W→E patrol`,
);

const midKiosk = SAMPLE_KIOSKS.find((k) => k.id === 'sample-mid');
const centerColumnEdgesCrossMid = graph.edges.some((e) => {
  if (e.axis !== 'column') return false;
  const a = graph.nodeById.get(e.from);
  const b = graph.nodeById.get(e.to);
  if (!a || !b || Math.abs(a.x) > 0.1) return false;
  for (let i = 0; i <= 32; i++) {
    const t = i / 32;
    const x = a.x + (b.x - a.x) * t;
    const z = a.z + (b.z - a.z) * t;
    if (midKiosk && isInsideKioskCore(x, z, KIOSK_NO_GO_RADIUS)) return true;
  }
  return false;
});
gate(
  'center-column-sample-mid',
  !centerColumnEdgesCrossMid,
  centerColumnEdgesCrossMid
    ? 'Graph column edge at x=0 crosses sample-mid no-go core'
    : 'Center column graph edges avoid sample-mid core',
);

const npcs = generateWarehouseNPCs();
let routeFails = 0;
for (const npc of npcs) {
  if (npc.waypoints.length < 2) continue;
  const [a, b] = npc.waypoints;
  if (Math.abs(a[0] - b[0]) < 0.2) {
    if (!isColumnPathWalkable(a[0], a[2], b[2], npc.cartLoad)) routeFails++;
  }
}
gate('npc-route-walkability', routeFails === 0, `${npcs.length} NPCs, ${routeFails} blocked column routes`);

let npcRackFootprint = 0;
for (const npc of npcs) {
  if (npc.waypoints.length < 2) continue;
  const [a, b] = npc.waypoints;
  if (Math.abs(a[0] - b[0]) < 0.2) {
    for (let i = 1; i < 32; i++) {
      const t = i / 32;
      const z = a[2] + (b[2] - a[2]) * t;
      if (isInsideRackFootprint(a[0], z, 0.5)) npcRackFootprint++;
    }
  } else if (Math.abs(a[2] - b[2]) < 0.2) {
    for (let i = 1; i < 32; i++) {
      const t = i / 32;
      const x = a[0] + (b[0] - a[0]) * t;
      if (isInsideRackFootprint(x, a[2], 0.5)) npcRackFootprint++;
    }
  }
}
gate(
  'npc-route-rack-footprint',
  npcRackFootprint === 0,
  `${npcs.length} NPCs, ${npcRackFootprint} interior footprint samples on routes`,
);

let kioskInRack = 0;
for (const k of SAMPLE_KIOSKS) {
  if (isInsideRackFootprint(k.x, k.z, 1.0)) kioskInRack++;
}
gate('kiosk-footprint', kioskInRack === 0, `${SAMPLE_KIOSKS.length} kiosks, ${kioskInRack} in rack`);

let npcKioskCross = 0;
for (const npc of npcs) {
  if (npc.waypoints.length < 2) continue;
  const [a, b] = npc.waypoints;
  if (Math.abs(a[0] - b[0]) < 0.2) {
    if (pathCrossesKioskCoreColumn(a[0], a[2], b[2])) npcKioskCross++;
  } else if (Math.abs(a[2] - b[2]) < 0.2) {
    if (pathCrossesKioskCoreRow(Math.min(a[0], b[0]), Math.max(a[0], b[0]), a[2])) npcKioskCross++;
  }
}
gate(
  'npc-route-kiosk-core',
  npcKioskCross === 0,
  `${npcs.length} NPCs, ${npcKioskCross} routes cross kiosk no-go core`,
);

function pathCrossesKioskCoreColumn(x: number, z0: number, z1: number): boolean {
  for (let i = 1; i < 32; i++) {
    const t = i / 32;
    const z = z0 + (z1 - z0) * t;
    if (isInsideKioskCore(x, z, KIOSK_NO_GO_RADIUS)) return true;
  }
  return false;
}

function pathCrossesKioskCoreRow(x0: number, x1: number, z: number): boolean {
  for (let i = 1; i < 32; i++) {
    const t = i / 32;
    const x = x0 + (x1 - x0) * t;
    if (isInsideKioskCore(x, z, KIOSK_NO_GO_RADIUS)) return true;
  }
  return false;
}

const northYaw = travelYawFromDirection(0, 1);
const eastYaw = travelYawFromDirection(1, 0);
const columnPatrolYaw = gridPatrolYaw(
  { id: 'test', waypoints: [[0, 0, -5], [0, 0, 5]], archetype: 'BLOCKER', baseSpeed: 1, obsessiveness: 1, cartLoad: 1.5, color: '#fff' },
  0,
  1,
);
gate(
  'facing-convention',
  Math.abs(northYaw) < 0.01 && Math.abs(eastYaw - Math.PI / 2) < 0.01 && columnPatrolYaw === 0,
  `travelYaw N=${northYaw.toFixed(2)} E=${eastYaw.toFixed(2)} column=${columnPatrolYaw?.toFixed(2)}`,
);

const jitterNow = 10_000;
const jitterSamples: { x: number; z: number; at: number }[] = [];
for (let i = 0; i < 30; i++) {
  const t = jitterNow - 4000 + i * 130;
  jitterSamples.push({
    x: 0.05 * Math.sin(i * 1.7),
    z: -0.25 + 0.05 * Math.cos(i * 1.9),
    at: t,
  });
}
gate(
  'watchdog-jitter-synthetic',
  detectSyntheticJitterLoop(jitterSamples, jitterNow),
  'Synthetic kiosk jitter scenario flagged within 5s window',
);

console.log(`\nShip gates: ${failed ? 'FAIL' : 'PASS'}`);
process.exit(failed ? 1 : 0);
