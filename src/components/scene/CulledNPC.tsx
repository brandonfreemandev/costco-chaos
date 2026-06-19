import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useCartTransformStore } from '../../stores/cartTransformStore';
import { useGameStore } from '../../stores/gameStore';
import { NPC, type NPCConfig } from './NPC';
import { CROSSWALK } from './parkingLotLayout';
import { AISLE_CENTERS_X, CROSS_AISLES_Z, WH_DEPTH, WH_MAX_Z, WH_MIN_Z, QUEST_SHELF_POSITIONS } from './warehouseLayout';

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

  return npcs;
}

export function generateWarehouseNPCs(): NPCConfig[] {
  const npcs: NPCConfig[] = [];
  const colors = ['#b8a48c', '#9a9a9a', '#c4a882', '#8aa4c4', '#d46a6a', '#a89078', '#7a8a9a'];
  const archetypes = ['BLOCKER', 'BLOCKER', 'AGGRESSOR', 'SAMPLE_HUNTER'] as const;
  let id = 0;
  let seed = 99;

  for (let i = 0; i < 8; i++) {
    seed += 13;
    const useCross = rnd(seed) > 0.45;
    const archetype = archetypes[Math.floor(rnd(seed + 1) * archetypes.length)];

    if (useCross) {
      const crossZ = CROSS_AISLES_Z[Math.floor(rnd(seed + 2) * CROSS_AISLES_Z.length)];
      const xStart = -14 + rnd(seed + 3) * 28;
      const xEnd = xStart + (rnd(seed + 4) > 0.5 ? 1 : -1) * (6 + rnd(seed + 5) * 10);
      npcs.push({
        id: `wh-cross-${id++}`,
        archetype,
        baseSpeed: (0.65 + rnd(seed + 6) * 0.95) * NPC_SPEED_MUL,
        obsessiveness: 10 + rnd(seed + 7) * 50,
        cartLoad: archetype === 'BLOCKER' ? 1.6 + rnd(seed + 8) * 1.4 : 0.8 + rnd(seed + 9) * 0.7,
        color: colors[i % colors.length],
        chaos: 0.35 + rnd(seed + 10) * 0.5,
        waypoints: [
          [xStart, 0, crossZ + jitter(seed + 11, 1.2)],
          [xStart + jitter(seed + 12, 3), 0, crossZ + jitter(seed + 13, 0.8)],
          [xEnd, 0, crossZ + jitter(seed + 14, 1.2)],
        ],
      });
    } else {
      const laneX = AISLE_CENTERS_X[Math.floor(rnd(seed + 2) * AISLE_CENTERS_X.length)];
      const zStart = WH_MIN_Z + 4 + rnd(seed + 3) * (WH_DEPTH - 10);
      const zSpan = 6 + rnd(seed + 4) * 14;
      const zEnd = Math.max(WH_MIN_Z + 3, Math.min(WH_MAX_Z - 3, zStart + (rnd(seed + 5) > 0.5 ? zSpan : -zSpan)));
      npcs.push({
        id: `wh-aisle-${id++}`,
        archetype,
        baseSpeed: (0.7 + rnd(seed + 6) * 1.05) * NPC_SPEED_MUL,
        obsessiveness: 10 + rnd(seed + 7) * 50,
        cartLoad: archetype === 'BLOCKER' ? 1.8 + rnd(seed + 8) * 1.2 : 0.8 + rnd(seed + 9) * 0.6,
        color: colors[i % colors.length],
        chaos: 0.35 + rnd(seed + 10) * 0.5,
        waypoints: [
          [laneX + jitter(seed + 11, 1.2), 0, zStart],
          [laneX + jitter(seed + 12, 1.8), 0, (zStart + zEnd) / 2 + jitter(seed + 13, 2)],
          [laneX + jitter(seed + 14, 1.2), 0, zEnd],
        ],
      });
    }
  }

  // Patrol near quest shelves — extra friction without crowding every aisle
  for (let q = 0; q < QUEST_SHELF_POSITIONS.length; q++) {
    seed += 19;
    const shelf = QUEST_SHELF_POSITIONS[q];
    const laneX = shelf.aisle;
    const archetype = q % 2 === 0 ? 'BLOCKER' : 'SAMPLE_HUNTER';
    npcs.push({
      id: `wh-quest-${id++}`,
      archetype,
      baseSpeed: (0.55 + rnd(seed) * 0.75) * NPC_SPEED_MUL,
      obsessiveness: 35 + rnd(seed + 1) * 45,
      cartLoad: archetype === 'BLOCKER' ? 1.7 + rnd(seed + 2) * 1.1 : 0.9 + rnd(seed + 3) * 0.5,
      color: colors[(q + 3) % colors.length],
      chaos: 0.42 + rnd(seed + 4) * 0.38,
      waypoints: [
        [laneX + jitter(seed + 5, 1.4), 0, shelf.z + jitter(seed + 6, 2)],
        [shelf.x + jitter(seed + 7, 1.8), 0, shelf.z + jitter(seed + 8, 1.5)],
        [laneX - jitter(seed + 9, 1.2), 0, shelf.z - 3 + jitter(seed + 10, 2)],
      ],
    });
  }

  return npcs;
}

export function generateParkingNPCs(): NPCConfig[] {
  return [];
}
