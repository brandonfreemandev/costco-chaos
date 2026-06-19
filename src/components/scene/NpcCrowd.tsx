import { useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useCartTransformStore } from '../../stores/cartTransformStore';
import { NPC, type NPCConfig } from './NPC';

const CHECK_MS = 180;
const playerProbe = new THREE.Vector3();

interface NpcCrowdProps {
  configs: NPCConfig[];
  cullDistance?: number;
  wakeDistance?: number;
  enabled?: boolean;
}

/** Single distance pass for an entire NPC crowd — only mounts sims near the player. */
export function NpcCrowd({
  configs,
  cullDistance = 22,
  wakeDistance = 26,
  enabled = true,
}: NpcCrowdProps) {
  const configMap = useMemo(() => new Map(configs.map((c) => [c.id, c])), [configs]);
  const anchors = useMemo(
    () => configs.map((c) => ({ id: c.id, pos: new THREE.Vector3(c.waypoints[0][0], c.waypoints[0][1], c.waypoints[0][2]) })),
    [configs],
  );
  const activeRef = useRef(new Set<string>());
  const [activeIds, setActiveIds] = useState<string[]>([]);
  const lastCheck = useRef(0);

  useFrame(() => {
    if (!enabled) {
      if (activeRef.current.size > 0) {
        activeRef.current.clear();
        setActiveIds([]);
      }
      return;
    }

    const now = performance.now();
    if (now - lastCheck.current < CHECK_MS) return;
    lastCheck.current = now;

    const playerPos = useCartTransformStore.getState().position;
    playerProbe.set(playerPos.x, playerPos.y, playerPos.z);

    const next = new Set<string>();
    for (const { id, pos } of anchors) {
      const wasActive = activeRef.current.has(id);
      const limit = wasActive ? wakeDistance : cullDistance;
      if (playerProbe.distanceTo(pos) <= limit) next.add(id);
    }

    if (next.size === activeRef.current.size) {
      let same = true;
      for (const id of next) {
        if (!activeRef.current.has(id)) {
          same = false;
          break;
        }
      }
      if (same) return;
    }

    activeRef.current = next;
    setActiveIds([...next]);
  });

  return (
    <>
      {activeIds.map((id) => {
        const config = configMap.get(id);
        return config ? <NPC key={id} config={config} /> : null;
      })}
    </>
  );
}
