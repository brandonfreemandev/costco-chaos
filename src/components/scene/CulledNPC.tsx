import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useCartTransformStore } from '../../stores/cartTransformStore';
import { useGameStore } from '../../stores/gameStore';
import { NPC, type NPCConfig } from './NPC';
import { CROSSWALK } from './parkingLotLayout';
import { isNearWarehouseEntry } from './warehouseLayout';
import { buildWalkabilityGraph, type WalkGraphNode } from '../../systems/WalkabilityGraph';

const DEFAULT_CULL_DISTANCE = 28;
const DEFAULT_WAKE_DISTANCE = 32;
/** Global walk-speed multiplier for all shoppers. */
const NPC_SPEED_MUL = 1.85;

interface CulledNPCProps {
  config: NPCConfig;
  cullDistance?: number;
  wakeDistance?: number;
  alwaysActiveInGauntlet?: boolean;
}

export function CulledNPC({
  config,
  cullDistance = DEFAULT_CULL_DISTANCE,
  wakeDistance = DEFAULT_WAKE_DISTANCE,
  alwaysActiveInGauntlet = false,
}: CulledNPCProps) {
  const [active, setActive] = useState(alwaysActiveInGauntlet);
  const lastCheck = useRef(0);
  const anchor = useRef(new THREE.Vector3(...config.waypoints[0]));
  const phase = useGameStore((s) => s.phase);

  useFrame(() => {
    if (phase !== 'PARKING' && phase !== 'SHOPPING') return;

    if (alwaysActiveInGauntlet && phase === 'PARKING') {
      if (!active) setActive(true);
      return;
    }

    const now = performance.now();
    if (now - lastCheck.current < 120) return;
    lastCheck.current = now;

    const playerPos = useCartTransformStore.getState().position;
    const dist = playerPos.distanceTo(anchor.current);
    const shouldBeActive = active ? dist < wakeDistance : dist < cullDistance;

    if (shouldBeActive !== active) {
      setActive(shouldBeActive);
    }
  });

  if (!active) return null;

  return <NPC config={config} />;
}

function rnd(seed: number): number {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

function jitter(seed: number, amp: number): number {
  return (rnd(seed) - 0.5) * amp;
}

/** Chaotic Costco crowd — staggered paths, pauses, and diagonal cuts. */
export function generateGauntletNPCs(): NPCConfig[] {
  const npcs: NPCConfig[] = [];
  const colors = ['#b8a48c', '#9a9a9a', '#c47a7a', '#8aa4c4', '#d4c4a8', '#a89078', '#7a8a9a'];
  const archetypes = ['BLOCKER', 'BLOCKER', 'AGGRESSOR', 'SAMPLE_HUNTER'] as const;
  let id = 0;
  let seed = 42;

  const crossZ = CROSSWALK.z;

  for (let i = 0; i < 5; i++) {
    seed += 17;
    const fromLeft = rnd(seed) > 0.5;
    const z = crossZ + jitter(seed + 1, 5);
    const midX = jitter(seed + 2, 3);
    const midZ = z + jitter(seed + 3, 2.5);
    const archetype = archetypes[Math.floor(rnd(seed + 4) * archetypes.length)];

    npcs.push({
      id: `gauntlet-x-${id++}`,
      archetype,
      baseSpeed: (0.85 + rnd(seed + 5) * 1.6) * NPC_SPEED_MUL,
      obsessiveness: 20 + rnd(seed + 6) * 60,
      cartLoad: 0.9 + rnd(seed + 7) * 2.2,
      color: colors[Math.floor(rnd(seed + 8) * colors.length)],
      chaos: 0.35 + rnd(seed + 9) * 0.55,
      waypoints: fromLeft
        ? [
            [-8 + jitter(seed + 10, 2), 0.95, z],
            [midX, 0.95, midZ],
            [8 + jitter(seed + 11, 2), 0.95, z + jitter(seed + 12, 1.5)],
          ]
        : [
            [8 + jitter(seed + 10, 2), 0.95, z + jitter(seed + 11, 2)],
            [midX, 0.95, midZ],
            [-8 + jitter(seed + 12, 2), 0.95, z],
          ],
    });
  }

  for (let i = 0; i < 4; i++) {
    seed += 23;
    const x = jitter(seed, 5.5);
    const zStart = -14 + rnd(seed + 1) * 10;
    const zEnd = -33 + rnd(seed + 2) * 4;
    const archetype = archetypes[Math.floor(rnd(seed + 3) * archetypes.length)];

    npcs.push({
      id: `gauntlet-z-${id++}`,
      archetype,
      baseSpeed: (0.75 + rnd(seed + 4) * 1.3) * NPC_SPEED_MUL,
      obsessiveness: 30 + rnd(seed + 5) * 50,
      cartLoad: 1.2 + rnd(seed + 6) * 1.8,
      color: colors[Math.floor(rnd(seed + 7) * colors.length)],
      chaos: 0.4 + rnd(seed + 8) * 0.5,
      waypoints: [
        [x, 0.95, zStart],
        [x + jitter(seed + 9, 2.8), 0.95, (zStart + zEnd) / 2 + jitter(seed + 10, 3)],
        [x + jitter(seed + 11, 1.5), 0.95, zEnd],
      ],
    });
  }

  for (let i = 0; i < 3; i++) {
    seed += 31;
    const side = rnd(seed) > 0.5 ? 1 : -1;
    const laneX = side * (5.5 + rnd(seed + 1) * 2.5);
    const z = -8 - rnd(seed + 2) * 18;

    npcs.push({
      id: `gauntlet-lot-${id++}`,
      archetype: 'BLOCKER',
      baseSpeed: (0.7 + rnd(seed + 3) * 1.1) * NPC_SPEED_MUL,
      obsessiveness: 15 + rnd(seed + 4) * 40,
      cartLoad: 1.4 + rnd(seed + 5) * 1.2,
      color: colors[Math.floor(rnd(seed + 6) * colors.length)],
      chaos: 0.5 + rnd(seed + 7) * 0.45,
      waypoints: [
        [laneX, 0.95, z],
        [laneX + side * jitter(seed + 8, 3), 0.95, z - 4 - rnd(seed + 9) * 8],
        [laneX - side * jitter(seed + 10, 2), 0.95, z - 8 - rnd(seed + 11) * 6],
      ],
    });
  }

  for (let i = 0; i < 2; i++) {
    seed += 37;
    const z = 6 - i * 3.5 + jitter(seed, 1.2);
    const x = jitter(seed + 1, 3.2);

    npcs.push({
      id: `gauntlet-approach-${id++}`,
      archetype: rnd(seed + 2) > 0.6 ? 'AGGRESSOR' : 'SAMPLE_HUNTER',
      baseSpeed: (0.8 + rnd(seed + 3) * 1.2) * NPC_SPEED_MUL,
      obsessiveness: 25,
      cartLoad: 1.0 + rnd(seed + 4) * 1.5,
      color: colors[Math.floor(rnd(seed + 5) * colors.length)],
      chaos: 0.55 + rnd(seed + 6) * 0.4,
      waypoints: [
        [x - 2, 0.95, z],
        [x + jitter(seed + 7, 2), 0.95, z - 2],
        [x + 2.5, 0.95, z - 1 + jitter(seed + 8, 2)],
        [x, 0.95, z + 1],
      ],
    });
  }

  return npcs.map((n) => ({ ...n, outdoor: true }));
}

const WAREHOUSE_NPC_COUNT = 14;
const WAREHOUSE_NPC_MIN_SPACING = 4.2;
const WAREHOUSE_ARCHETYPES = ['BLOCKER', 'BLOCKER', 'AGGRESSOR', 'SAMPLE_HUNTER'] as const;
const WAREHOUSE_COLORS = [
  '#b8a48c',
  '#9a9a9a',
  '#c4a882',
  '#8aa4c4',
  '#d46a6a',
  '#a89078',
  '#7a8a9a',
];

/**
 * Warehouse shoppers spawn directly on WalkabilityGraph nodes and navigate the
 * graph at runtime (see GraphNavAgent). No hand-tuned waypoint routes, no
 * rack/kiosk collision solving — the graph already guarantees every node and
 * edge is clear, so there is nothing to reject and nothing to get stuck on.
 */
export function generateWarehouseNPCs(): NPCConfig[] {
  const graph = buildWalkabilityGraph();
  const nodes = graph.nodes.filter(
    (n) =>
      n.kind === 'patrol' &&
      (graph.adjacency.get(n.id)?.length ?? 0) > 0 &&
      !isNearWarehouseEntry(n.x, n.z),
  );
  if (nodes.length === 0) return [];

  let s = 0x9e3779b1;
  const rng = () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
  const shuffle = (arr: WalkGraphNode[]): WalkGraphNode[] => {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  };

  // Fill the interior aisles first (most of the crowd, and where carts belong),
  // then top up with the perimeter loop — so shoppers don't all pile onto the
  // cart-light outer ring.
  const interior = shuffle(nodes.filter((n) => Math.abs(n.x) <= 11));
  const perimeter = shuffle(nodes.filter((n) => Math.abs(n.x) > 11));
  const order = [...interior, ...perimeter];

  const picked: WalkGraphNode[] = [];
  for (const node of order) {
    if (picked.length >= WAREHOUSE_NPC_COUNT) break;
    if (picked.some((p) => Math.hypot(p.x - node.x, p.z - node.z) < WAREHOUSE_NPC_MIN_SPACING)) {
      continue;
    }
    picked.push(node);
  }
  // Top up if spacing left us short of the target count.
  for (const node of order) {
    if (picked.length >= WAREHOUSE_NPC_COUNT) break;
    if (!picked.includes(node)) picked.push(node);
  }

  return picked.map((node, i) => {
    const neighborId = graph.adjacency.get(node.id)?.[0] ?? node.id;
    const neighbor = graph.nodeById.get(neighborId) ?? node;
    const archetype = WAREHOUSE_ARCHETYPES[i % WAREHOUSE_ARCHETYPES.length];
    const hunter = archetype === 'SAMPLE_HUNTER';
    // Most shoppers push carts. The narrow racetrack perimeter gets somewhat
    // fewer (long carts clip those tight lanes) — but not zero, or the outer
    // loop reads as empty.
    const onNarrowPerimeter = Math.abs(node.x) > 11;
    const wantsCart = rng() < (onNarrowPerimeter ? 0.5 : 0.85);
    return {
      id: `wh-shopper-${i}`,
      archetype,
      baseSpeed: (0.72 + rng() * 0.7) * NPC_SPEED_MUL,
      obsessiveness: hunter ? 60 + rng() * 30 : 20 + rng() * 32,
      cartLoad: wantsCart ? 1.45 + rng() * 0.95 : 0.9 + rng() * 0.22,
      color: WAREHOUSE_COLORS[i % WAREHOUSE_COLORS.length],
      chaos: 0.3 + rng() * 0.5,
      waypoints: [
        [node.x, 0.95, node.z],
        [neighbor.x, 0.95, neighbor.z],
      ],
    };
  });
}

export function generateParkingNPCs(): NPCConfig[] {
  return [];
}
