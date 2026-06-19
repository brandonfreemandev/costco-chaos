import { useEffect } from 'react';
import { useGameStore } from '../stores/gameStore';
import { useCheckoutStore } from '../stores/checkoutStore';
import { CHECKOUT_LANE_IDS } from '../components/scene/checkoutLayout';

/** Press 1–6 during checkout to switch lanes. */
export function useCheckoutInput(): void {
  const phase = useGameStore((s) => s.phase);

  useEffect(() => {
    if (phase !== 'CHECKOUT') return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.repeat) return;
      const idx = CHECKOUT_LANE_IDS.indexOf(event.key as (typeof CHECKOUT_LANE_IDS)[number]);
      if (idx === -1) return;
      event.preventDefault();
      useCheckoutStore.getState().switchToLane(CHECKOUT_LANE_IDS[idx]);
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [phase]);
}
