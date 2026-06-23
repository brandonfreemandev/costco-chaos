import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useCartTransformStore } from '../stores/cartTransformStore';
import { useEncounterStore } from '../stores/encounterStore';

const probe = new THREE.Vector3();

/** Fire a one-shot persona encounter when the cart enters a radius. */
export function useEncounterProximityTrigger({
  personaId,
  x,
  z,
  radius,
  enabled = true,
}: {
  personaId: string;
  x: number;
  z: number;
  radius: number;
  enabled?: boolean;
}) {
  const fired = useRef(false);

  useFrame(() => {
    if (!enabled || fired.current) return;
    const p = useCartTransformStore.getState().position;
    probe.set(p.x - x, 0, p.z - z);
    if (probe.length() <= radius) {
      const store = useEncounterStore.getState();
      if (store.seen.has(personaId) || store.active) return;
      fired.current = true;
      store.trigger(personaId);
    }
  });
}
