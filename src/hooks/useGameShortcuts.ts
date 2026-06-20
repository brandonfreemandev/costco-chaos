import { useEffect } from 'react';
import {
  CHECKOUT_DEV_SPAWN,
  CHECKOUT_LANE_IDS,
  CHECKOUT_LANE_X,
  queueSlotZ,
} from '../components/scene/checkoutLayout';
import { WAREHOUSE_INTERIOR_SPAWN } from '../components/scene/parkingLotLayout';
import { useCartTransformStore } from '../stores/cartTransformStore';
import { useCheckoutStore } from '../stores/checkoutStore';
import { useGameStore } from '../stores/gameStore';
import { useUIStore } from '../stores/uiStore';
import { useChaosTestStore } from '../stores/chaosTestStore';
import { resetChaosMonitorTracking } from '../systems/chaosMonitor';

/** Dev shortcuts: I = skip parking, O = skip checkout, T = layout watchdog on/off. */
export function useGameShortcuts(): void {
  const phase = useGameStore((s) => s.phase);
  const secureParkingSpot = useGameStore((s) => s.secureParkingSpot);
  const skipToCheckout = useGameStore((s) => s.skipToCheckout);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.repeat) return;

      if (event.code === 'KeyI' && phase === 'PARKING') {
        event.preventDefault();
        useCartTransformStore.getState().requestTeleport(
          WAREHOUSE_INTERIOR_SPAWN.x,
          WAREHOUSE_INTERIOR_SPAWN.z,
          WAREHOUSE_INTERIOR_SPAWN.yaw,
        );
        secureParkingSpot();
        console.log('[Shortcut] I — skipped to warehouse interior');
        return;
      }

      if (event.code === 'KeyO' && phase === 'SHOPPING') {
        event.preventDefault();
        skipToCheckout();
        const { playerLaneId, slotsFromFront } = useCheckoutStore.getState();
        const laneIdx = playerLaneId
          ? CHECKOUT_LANE_IDS.indexOf(playerLaneId as (typeof CHECKOUT_LANE_IDS)[number])
          : 2;
        const laneX = CHECKOUT_LANE_X[laneIdx >= 0 ? laneIdx : 2];
        useCartTransformStore.getState().requestTeleport(
          laneX,
          queueSlotZ(slotsFromFront),
          CHECKOUT_DEV_SPAWN.yaw,
        );
        useUIStore.setState({
          lastCollisionMessage: `Dev skip — lane ${playerLaneId ?? '?'}, ${slotsFromFront} carts ahead.`,
        });
        console.log('[Shortcut] O — test checkout queue');
        return;
      }

      if (import.meta.env.DEV && event.code === 'KeyT') {
        event.preventDefault();
        const store = useChaosTestStore.getState();
        const turningOn = !store.monitorOn;
        if (turningOn) {
          resetChaosMonitorTracking();
          store.clearViolations();
          store.setMonitor(true);
          console.log('[Shortcut] T — watchdog ON (play normally, issues log below)');
        } else {
          store.setMonitor(false);
          console.log('[Shortcut] T — watchdog OFF');
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [phase, secureParkingSpot, skipToCheckout]);
}
