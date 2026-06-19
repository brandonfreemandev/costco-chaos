import { useEffect } from 'react';
import * as THREE from 'three';
import { CHECKOUT_DEV_SPAWN, CHECKOUT_LANE_X, queueSlotZ } from '../components/scene/checkoutLayout';
import { WAREHOUSE_INTERIOR_SPAWN } from '../components/scene/parkingLotLayout';
import { useCartTransformStore } from '../stores/cartTransformStore';
import { useCheckoutStore } from '../stores/checkoutStore';
import { useGameStore } from '../stores/gameStore';
import { useUIStore } from '../stores/uiStore';
import { CART_HEIGHT } from '../systems/physicsController';

/** Dev shortcuts: I = skip parking, O = skip shopping → checkout (test queue, no perks). */
export function useGameShortcuts(): void {
  const phase = useGameStore((s) => s.phase);
  const secureParkingSpot = useGameStore((s) => s.secureParkingSpot);
  const skipToCheckout = useGameStore((s) => s.skipToCheckout);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.repeat) return;

      if (event.code === 'KeyI' && phase === 'PARKING') {
        event.preventDefault();
        useCartTransformStore.getState().setTransform(
          new THREE.Vector3(WAREHOUSE_INTERIOR_SPAWN.x, CART_HEIGHT, WAREHOUSE_INTERIOR_SPAWN.z),
          WAREHOUSE_INTERIOR_SPAWN.yaw,
          0,
        );
        secureParkingSpot();
        console.log('[Shortcut] I — skipped to warehouse interior');
        return;
      }

      if (event.code === 'KeyO' && phase === 'SHOPPING') {
        event.preventDefault();
        skipToCheckout();
        const { slotsFromFront } = useCheckoutStore.getState();
        const laneX = CHECKOUT_LANE_X[2];
        useCartTransformStore.getState().setTransform(
          new THREE.Vector3(laneX, CART_HEIGHT, queueSlotZ(slotsFromFront)),
          CHECKOUT_DEV_SPAWN.yaw,
          0,
        );
        useUIStore.setState({
          lastCollisionMessage: `Dev skip — lane 3, ${slotsFromFront} carts ahead. MH unchanged.`,
        });
        console.log('[Shortcut] O — test checkout queue');
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [phase, secureParkingSpot, skipToCheckout]);
}
