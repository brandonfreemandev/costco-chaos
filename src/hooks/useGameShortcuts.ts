import { useEffect } from 'react';
import * as THREE from 'three';
import { WAREHOUSE_INTERIOR_SPAWN } from '../components/scene/parkingLotLayout';
import { useCartTransformStore } from '../stores/cartTransformStore';
import { useGameStore } from '../stores/gameStore';
import { CART_HEIGHT } from '../systems/physicsController';

/** Press I during parking lot to skip straight into the warehouse. */
export function useGameShortcuts(): void {
  const phase = useGameStore((s) => s.phase);
  const secureParkingSpot = useGameStore((s) => s.secureParkingSpot);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code !== 'KeyI' || event.repeat) return;
      if (phase !== 'PARKING') return;

      event.preventDefault();
      useCartTransformStore.getState().setTransform(
        new THREE.Vector3(WAREHOUSE_INTERIOR_SPAWN.x, CART_HEIGHT, WAREHOUSE_INTERIOR_SPAWN.z),
        WAREHOUSE_INTERIOR_SPAWN.yaw,
        0,
      );
      secureParkingSpot();
      console.log('[Shortcut] I — skipped to warehouse interior');
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [phase, secureParkingSpot]);
}
