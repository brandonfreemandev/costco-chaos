import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useCartTransformStore } from '../../stores/cartTransformStore';
import { useGameStore } from '../../stores/gameStore';
import { NPC, type NPCConfig } from './NPC';
import { CROSSWALK } from './parkingLotLayout';

const DEFAULT_CULL_DISTANCE = 28;
const DEFAULT_WAKE_DISTANCE = 32;

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

  for (let i = 0; i < 14; i++) {
    seed += 17;
    const fromLeft = rnd(seed) > 0.5;
    const z = crossZ + jitter(seed + 1, 5);
    const midX = jitter(seed + 2, 3);
    const midZ = z + jitter(seed + 3, 2.5);
    const archetype = archetypes[Math.floor(rnd(seed + 4) * archetypes.length)];

    npcs.push({
      id: `gauntlet-x-${id++}`,
      archetype,
      baseSpeed: 0.7 + rnd(seed + 5) * 1.4,
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

  for (let i = 0; i < 12; i++) {
    seed += 23;
    const x = jitter(seed, 5.5);
    const zStart = -14 + rnd(seed + 1) * 10;
    const zEnd = -33 + rnd(seed + 2) * 4;
  const archetype = archetypes[Math.floor(rnd(seed + 3) * archetypes.length)];

    npcs.push({
      id: `gauntlet-z-${id++}`,
      archetype,
      baseSpeed: 0.55 + rnd(seed + 4) * 1.1,
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

  for (let i = 0; i < 10; i++) {
    seed += 31;
    const side = rnd(seed) > 0.5 ? 1 : -1;
    const laneX = side * (5.5 + rnd(seed + 1) * 2.5);
    const z = -8 - rnd(seed + 2) * 18;

    npcs.push({
      id: `gauntlet-lot-${id++}`,
      archetype: 'BLOCKER',
      baseSpeed: 0.5 + rnd(seed + 3) * 0.9,
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

  for (let i = 0; i < 6; i++) {
    seed += 37;
    const z = 6 - i * 3.5 + jitter(seed, 1.2);
    const x = jitter(seed + 1, 3.2);

    npcs.push({
      id: `gauntlet-approach-${id++}`,
      archetype: rnd(seed + 2) > 0.6 ? 'AGGRESSOR' : 'SAMPLE_HUNTER',
      baseSpeed: 0.6 + rnd(seed + 3) * 1.0,
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

export function generateWarehouseNPCs(aisleLength: number): NPCConfig[] {
  const npcs: NPCConfig[] = [];
  const colors = ['#b8a48c', '#9a9a9a', '#c4a882', '#8aa4c4', '#d46a6a', '#a89078', '#7a8a9a'];
  const archetypes = ['BLOCKER', 'BLOCKER', 'AGGRESSOR', 'SAMPLE_HUNTER'] as const;
  let id = 0;
  let seed = 99;

  for (let i = 0; i < 28; i++) {
    seed += 13;
    const laneX = (i % 2 === 0 ? -1 : 1) * (0.8 + rnd(seed) * 2.2);
    const zStart = -aisleLength / 2 + 3 + rnd(seed + 1) * (aisleLength - 8);
    const zEnd = zStart + 5 + rnd(seed + 2) * 10;
    const archetype = archetypes[Math.floor(rnd(seed + 3) * archetypes.length)];

    npcs.push({
      id: `wh-crowd-${id++}`,
      archetype,
      baseSpeed: 0.45 + rnd(seed + 4) * 0.85,
      obsessiveness: 10 + rnd(seed + 5) * 50,
      cartLoad: archetype === 'BLOCKER' ? 1.8 + rnd(seed + 6) * 1.2 : 0.8 + rnd(seed + 7) * 0.6,
      color: colors[i % colors.length],
      chaos: 0.35 + rnd(seed + 8) * 0.5,
      waypoints: [
        [laneX, 0.95, zStart],
        [laneX + jitter(seed + 9, 2.5), 0.95, (zStart + zEnd) / 2 + jitter(seed + 10, 2)],
        [laneX + jitter(seed + 11, 1.2), 0.95, zEnd],
      ],
    });
  }

  return npcs;
}

export function generateParkingNPCs(): NPCConfig[] {
  return [];
}
