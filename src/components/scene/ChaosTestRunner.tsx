import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useChaosTestStore } from '../../stores/chaosTestStore';
import { runChaosMonitor } from '../../systems/chaosMonitor';

/** Dev-only: throttled watchdog while you play normally. No robot driver. */
export function ChaosTestRunner() {
  const monitorAcc = useRef(0);

  useFrame((_, delta) => {
    if (!useChaosTestStore.getState().monitorOn) {
      monitorAcc.current = 0;
      return;
    }

    monitorAcc.current += delta;
    if (monitorAcc.current >= 0.5) {
      monitorAcc.current = 0;
      runChaosMonitor();
    }
  });

  return null;
}
