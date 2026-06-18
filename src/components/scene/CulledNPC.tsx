import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useCartTransformStore } from '../../stores/cartTransformStore';
import { NPC, type NPCConfig } from './NPC';

const DEFAULT_CULL_DISTANCE = 30;
const DEFAULT_WAKE_DISTANCE = 34;

interface CulledNPCProps {
  config: NPCConfig;
  cullDistance?: number;
  wakeDistance?: number;
}

export function CulledNPC({
  config,
  cullDistance = DEFAULT_CULL_DISTANCE,
  wakeDistance = DEFAULT_WAKE_DISTANCE,
}: CulledNPCProps) {
  const [active, setActive] = useState(false);
  const lastCheck = useRef(0);
  const anchor = useRef(new THREE.Vector3(...config.waypoints[0]));

  useFrame(() => {
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

export function generateWarehouseNPCs(aisleLength: number): NPCConfig[] {
  const npcs: NPCConfig[] = [];
  const colors = ['#b8a48c', '#9a9a9a', '#c4a882', '#8aa4c4', '#d46a6a', '#a89078', '#7a8a9a'];
  const archetypes = ['BLOCKER', 'BLOCKER', 'AGGRESSOR', 'SAMPLE_HUNTER'] as const;
  let id = 0;

  for (let i = 0; i < 22; i++) {
    const laneX = (i % 2 === 0 ? -1 : 1) * (1.2 + (i % 4) * 0.9);
    const zStart = -aisleLength / 2 + 4 + (i % 7) * 6;
    const zEnd = Math.min(aisleLength / 2 - 3, zStart + 10 + (i % 3) * 4);
    const archetype = archetypes[i % archetypes.length];

    npcs.push({
      id: `wh-crowd-${id++}`,
      archetype,
      baseSpeed: 0.55 + (i % 5) * 0.22,
      obsessiveness: 10 + (i % 8) * 10,
      cartLoad: archetype === 'BLOCKER' ? 2.2 + (i % 3) * 0.4 : 1.0 + (i % 2) * 0.3,
      color: colors[i % colors.length],
      waypoints: [
        [laneX, 0.95, zStart],
        [laneX + (i % 3 === 0 ? 1.5 : -1.5), 0.95, (zStart + zEnd) / 2],
        [laneX, 0.95, zEnd],
      ],
    });
  }

  return npcs;
}

export function generateParkingNPCs(): NPCConfig[] {
  const npcs: NPCConfig[] = [];
  const colors = ['#b8a48c', '#9a9a9a', '#c47a7a', '#8aa4c4'];
  let id = 0;

  for (let i = 0; i < 10; i++) {
    const side = i % 2 === 0 ? -6.5 : 6.5;
    const zStart = 24 - (i % 5) * 8;
    const zEnd = zStart - 14;

    npcs.push({
      id: `lot-crowd-${id++}`,
      archetype: i % 4 === 0 ? 'AGGRESSOR' : 'BLOCKER',
      baseSpeed: 0.7 + (i % 3) * 0.35,
      obsessiveness: 15 + i * 5,
      cartLoad: 1.5 + (i % 3) * 0.6,
      color: colors[i % colors.length],
      waypoints: [
        [side, 0.95, zStart],
        [side, 0.95, zEnd],
      ],
    });
  }

  return npcs;
}
