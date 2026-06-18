import { useEffect, type MutableRefObject } from 'react';
import * as THREE from 'three';
import { usePlayerStore } from '../../stores/playerStore';
import { useGameStore } from '../../stores/gameStore';

interface ParkingSpotSensorProps {
  cartPosition: MutableRefObject<THREE.Vector3 | null>;
}

export function ParkingSpotSensor({ cartPosition }: ParkingSpotSensorProps) {
  const secureParkingSpot = useGameStore((s) => s.secureParkingSpot);
  const parkingSpotSecured = useGameStore((s) => s.parkingSpotSecured);

  useEffect(() => {
    const interval = window.setInterval(() => {
      if (parkingSpotSecured) return;
      const position = cartPosition.current;
      if (!position) return;

      const inSpot =
        Math.abs(position.x) < 2.2 &&
        Math.abs(position.z) < 3.5 &&
        Math.hypot(usePlayerStore.getState().cartPhysics.velocity.x, usePlayerStore.getState().cartPhysics.velocity.z) < 1.2;

      if (inSpot) {
        secureParkingSpot();
      }
    }, 200);

    return () => window.clearInterval(interval);
  }, [cartPosition, parkingSpotSecured, secureParkingSpot]);

  return null;
}
