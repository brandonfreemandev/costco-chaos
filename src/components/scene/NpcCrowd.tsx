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
  /** Parking gauntlet — sim every NPC regardless of player distance. */
  alwaysActive?: boolean;
}

/** Single distance pass for an entire NPC crowd — only mounts sims near the player. */
export function NpcCrowd({
  configs,
  cullDistance = 22,
  wakeDistance = 26,
  enabled = true,
  alwaysActive = false,
}: NpcCrowdProps) {
  const configMap = useMemo(() => new Map(configs.map((c) => [c.id, c])), [configs]);
  const anchors = useMemo(
    () =>
      configs.map((c) => {
        const wps = c.waypoints;
        const cx = wps.reduce((s, w) => s + w[0], 0) / wps.length;
        const cz = wps.reduce((s, w) => s + w[2], 0) / wps.length;
        return { id: c.id, pos: new THREE.Vector3(cx, wps[0][1], cz) };
      }),
    [configs],
  );
  const activeRef = useRef(
    alwaysActive ? new Set(configs.map((c) => c.id)) : new Set<string>(),
  );
  const [activeIds, setActiveIds] = useState<string[]>(() =>
    alwaysActive ? configs.map((c) => c.id) : [],
  );
  const lastCheck = useRef(0);

  useFrame(() => {
    if (!enabled) {
      if (activeRef.current.size > 0) {
        activeRef.current.clear();
        setActiveIds([]);
      }
      return;
    }

    if (alwaysActive) {
      const next = new Set(configs.map((c) => c.id));
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
