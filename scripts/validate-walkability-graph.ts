#!/usr/bin/env npx tsx
/**
 * Phase A gate check — run via: npx tsx scripts/validate-walkability-graph.ts
 */
import {
  buildWalkabilityGraph,
  patrolColumnXs,
  patrolRowZs,
  validateWalkabilityGraph,
} from '../src/systems/WalkabilityGraph';

const graph = buildWalkabilityGraph();
const result = validateWalkabilityGraph(graph);

console.log('WalkabilityGraph Phase A validation');
console.log('  column X:', patrolColumnXs().map((x) => x.toFixed(2)).join(', '));
console.log('  row Z:', patrolRowZs().map((z) => z.toFixed(2)).join(', '));
console.log(`  nodes: ${result.nodeCount}`);
console.log(`  edges: ${result.edgeCount}`);
console.log(`  rejected edges: ${result.rejectedEdgeCount}`);
console.log(`  connected: ${result.connected}`);
console.log(`  orphan patrol nodes: ${result.orphanPatrolNodes.length}`);

if (result.orphanPatrolNodes.length > 0) {
  console.log('  orphans:', result.orphanPatrolNodes.join(', '));
}

console.log(`  Phase A gate: ${result.passesPhaseAGate ? 'PASS' : 'FAIL'}`);
process.exit(result.passesPhaseAGate ? 0 : 1);
