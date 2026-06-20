import {
  AISLE_CENTERS_X,
  eastRacetrackPatrolX,
  isColumnPathWalkable,
  isInsideRackFootprint,
  rackRowGapCentersZ,
  warehousePatrolLaneZs,
  westRacetrackPatrolX,
  WAREHOUSE_NPC_BOUNDS,
} from '../components/scene/warehouseLayout';
import { SAMPLE_KIOSKS } from './sampleStations';

/** Kiosk core — graph edges may approach orbit ring but never pass through. */
export const KIOSK_NO_GO_RADIUS = 2.2;

export type GraphNodeKind = 'patrol' | 'orbit';

export interface WalkGraphNode {
  id: string;
  x: number;
  z: number;
  kind: GraphNodeKind;
}

export interface WalkGraphEdge {
  id: string;
  from: string;
  to: string;
  axis: 'column' | 'row';
}

export interface WalkGraph {
  nodes: WalkGraphNode[];
  edges: WalkGraphEdge[];
  nodeById: Map<string, WalkGraphNode>;
  adjacency: Map<string, string[]>;
  rejectedEdgeCount: number;
}

export interface WalkGraphValidation {
  connected: boolean;
  orphanPatrolNodes: string[];
  rejectedEdgeCount: number;
  nodeCount: number;
  edgeCount: number;
  passesPhaseAGate: boolean;
}

const NODE_MARGIN = 0.55;
const PATH_SAMPLES = 32;

function fmtCoord(v: number): string {
  return v.toFixed(2);
}

function nodeId(x: number, z: number): string {
  return `${fmtCoord(x)}@${fmtCoord(z)}`;
}

export function patrolColumnXs(): number[] {
  return [...AISLE_CENTERS_X, westRacetrackPatrolX(), eastRacetrackPatrolX()];
}

export function patrolRowZs(): number[] {
  const seen = new Set<string>();
  const zs: number[] = [];
  for (const z of [...rackRowGapCentersZ(), ...warehousePatrolLaneZs()]) {
    const key = fmtCoord(z);
    if (seen.has(key)) continue;
    seen.add(key);
    zs.push(z);
  }
  return zs.sort((a, b) => a - b);
}

export function isInsideKioskCore(x: number, z: number, radius = KIOSK_NO_GO_RADIUS): boolean {
  for (const kiosk of SAMPLE_KIOSKS) {
    if (Math.hypot(x - kiosk.x, z - kiosk.z) < radius) return true;
  }
  return false;
}

function inPatrolBounds(x: number, z: number): boolean {
  return (
    x >= WAREHOUSE_NPC_BOUNDS.minX - 0.01 &&
    x <= WAREHOUSE_NPC_BOUNDS.maxX + 0.01 &&
    z >= WAREHOUSE_NPC_BOUNDS.minZ - 0.01 &&
    z <= WAREHOUSE_NPC_BOUNDS.maxZ + 0.01
  );
}

function isValidPatrolNode(x: number, z: number): boolean {
  if (!inPatrolBounds(x, z)) return false;
  if (isInsideRackFootprint(x, z, NODE_MARGIN)) return false;
  if (isInsideKioskCore(x, z)) return false;
  return true;
}

function segmentIntersectsKioskCore(
  x0: number,
  z0: number,
  x1: number,
  z1: number,
  radius = KIOSK_NO_GO_RADIUS,
): boolean {
  for (let i = 0; i <= PATH_SAMPLES; i++) {
    const t = i / PATH_SAMPLES;
    const x = x0 + (x1 - x0) * t;
    const z = z0 + (z1 - z0) * t;
    if (isInsideKioskCore(x, z, radius)) return true;
  }
  return false;
}

function segmentIntersectsRack(x0: number, z0: number, x1: number, z1: number): boolean {
  for (let i = 0; i <= PATH_SAMPLES; i++) {
    const t = i / PATH_SAMPLES;
    const x = x0 + (x1 - x0) * t;
    const z = z0 + (z1 - z0) * t;
    if (isInsideRackFootprint(x, z, NODE_MARGIN)) return true;
  }
  return false;
}

function isColumnEdgeWalkable(x: number, z0: number, z1: number): boolean {
  if (segmentIntersectsKioskCore(x, z0, x, z1)) return false;
  return isColumnPathWalkable(x, z0, z1);
}

function isInteriorRowEdgeWalkable(x0: number, z: number, x1: number): boolean {
  return !segmentIntersectsKioskCore(x0, z, x1, z);
}

function isPerimeterRowEdgeWalkable(x0: number, z: number, x1: number): boolean {
  if (segmentIntersectsKioskCore(x0, z, x1, z)) return false;
  if (segmentIntersectsRack(x0, z, x1, z)) return false;
  return true;
}

function buildAdjacency(edges: WalkGraphEdge[]): Map<string, string[]> {
  const adj = new Map<string, string[]>();
  const link = (a: string, b: string) => {
    if (a === b) return;
    if (!adj.has(a)) adj.set(a, []);
    if (!adj.has(b)) adj.set(b, []);
    const listA = adj.get(a)!;
    const listB = adj.get(b)!;
    if (!listA.includes(b)) listA.push(b);
    if (!listB.includes(a)) listB.push(a);
  };
  for (const edge of edges) link(edge.from, edge.to);
  return adj;
}

let graphCache: WalkGraph | null = null;

export function buildWalkabilityGraph(): WalkGraph {
  if (graphCache) return graphCache;

  const columnXs = patrolColumnXs();
  const rowZs = patrolRowZs();
  const nodes: WalkGraphNode[] = [];
  const nodeById = new Map<string, WalkGraphNode>();

  for (const x of columnXs) {
    for (const z of rowZs) {
      if (!isValidPatrolNode(x, z)) continue;
      const id = nodeId(x, z);
      const node: WalkGraphNode = { id, x, z, kind: 'patrol' };
      nodes.push(node);
      nodeById.set(id, node);
    }
  }

  const edges: WalkGraphEdge[] = [];
  let rejected = 0;

  for (const x of columnXs) {
    for (let i = 0; i < rowZs.length - 1; i++) {
      const z0 = rowZs[i];
      const fromId = nodeId(x, z0);
      if (!nodeById.has(fromId)) continue;

      for (let j = i + 1; j < rowZs.length; j++) {
        const z1 = rowZs[j];
        const toId = nodeId(x, z1);
        if (!nodeById.has(toId)) continue;
        if (!isColumnEdgeWalkable(x, z0, z1)) {
          if (j === i + 1) rejected++;
          continue;
        }
        edges.push({
          id: `${fromId}->${toId}`,
          from: fromId,
          to: toId,
          axis: 'column',
        });
        break;
      }
    }
  }

  const aisleXs = [...AISLE_CENTERS_X];
  const extraPerimeterZs = warehousePatrolLaneZs().filter(
    (z) => !rackRowGapCentersZ().some((g) => fmtCoord(g) === fmtCoord(z)),
  );
  const southPerimeterZ = extraPerimeterZs.length > 0 ? fmtCoord(Math.min(...extraPerimeterZs)) : '';

  for (const z of rowZs) {
    const zKey = fmtCoord(z);
    const isSouthPerimeterRow = zKey === southPerimeterZ;
    const rowXs = (isSouthPerimeterRow ? columnXs : aisleXs).slice().sort((a, b) => a - b);
    if (rowXs.length < 2) continue;

    for (let i = 0; i < rowXs.length - 1; i++) {
      const x0 = rowXs[i];
      const x1 = rowXs[i + 1];
      const fromId = nodeId(x0, z);
      const toId = nodeId(x1, z);
      if (!nodeById.has(fromId) || !nodeById.has(toId)) continue;
      const rowWalkable = isSouthPerimeterRow
        ? isPerimeterRowEdgeWalkable(x0, z, x1)
        : isInteriorRowEdgeWalkable(x0, z, x1);
      if (!rowWalkable) {
        rejected++;
        continue;
      }
      edges.push({
        id: `${fromId}->${toId}`,
        from: fromId,
        to: toId,
        axis: 'row',
      });
    }
  }

  const adjacency = buildAdjacency(edges);
  graphCache = { nodes, edges, nodeById, adjacency, rejectedEdgeCount: rejected };
  return graphCache;
}

function connectedComponent(startId: string, adjacency: Map<string, string[]>): Set<string> {
  const seen = new Set<string>();
  const queue = [startId];
  while (queue.length > 0) {
    const id = queue.pop()!;
    if (seen.has(id)) continue;
    seen.add(id);
    for (const next of adjacency.get(id) ?? []) {
      if (!seen.has(next)) queue.push(next);
    }
  }
  return seen;
}

export function validateWalkabilityGraph(graph = buildWalkabilityGraph()): WalkGraphValidation {
  const patrolNodes = graph.nodes.filter((n) => n.kind === 'patrol');
  const rejectedEdgeCount = graph.rejectedEdgeCount;

  if (patrolNodes.length === 0) {
    return {
      connected: false,
      orphanPatrolNodes: [],
      rejectedEdgeCount,
      nodeCount: 0,
      edgeCount: graph.edges.length,
      passesPhaseAGate: false,
    };
  }

  const start = patrolNodes[0].id;
  const component = connectedComponent(start, graph.adjacency);
  const orphanPatrolNodes = patrolNodes
    .filter((n) => !component.has(n.id) || (graph.adjacency.get(n.id)?.length ?? 0) === 0)
    .map((n) => n.id);

  const connected = patrolNodes.every((n) => component.has(n.id));
  const passesPhaseAGate = connected && orphanPatrolNodes.length === 0;

  return {
    connected,
    orphanPatrolNodes,
    rejectedEdgeCount,
    nodeCount: graph.nodes.length,
    edgeCount: graph.edges.length,
    passesPhaseAGate,
  };
}

export function invalidateWalkabilityGraphCache(): void {
  graphCache = null;
}

if (import.meta.env?.DEV) {
  const graph = buildWalkabilityGraph();
  const validation = validateWalkabilityGraph(graph);
  const tag = validation.passesPhaseAGate ? 'PASS' : 'FAIL';
  console.info(
    `[WalkabilityGraph] Phase A gate ${tag}: ${validation.nodeCount} nodes, ${validation.edgeCount} edges, ` +
      `${validation.rejectedEdgeCount} rejected, orphans=${validation.orphanPatrolNodes.length}`,
  );
  if (!validation.passesPhaseAGate) {
    console.warn('[WalkabilityGraph] Orphan patrol nodes:', validation.orphanPatrolNodes);
  }
}
