import { useEffect } from 'react';
import { useGameStore } from '../../stores/gameStore';
import { useCartTransformStore } from '../../stores/cartTransformStore';
import { isAtEntranceDoor } from './parkingLotLayout';

export function EntranceSensor() {
  const enterWarehouse = useGameStore((s) => s.secureParkingSpot);
  const parkingSpotSecured = useGameStore((s) => s.parkingSpotSecured);
  const phase = useGameStore((s) => s.phase);

  useEffect(() => {
    if (phase !== 'PARKING' || parkingSpotSecured) return;

    const interval = window.setInterval(() => {
      const position = useCartTransformStore.getState().position;
      const speed = useCartTransformStore.getState().speed;

      const atFrontDoors = isAtEntranceDoor(position.x, position.z, speed);

      if (atFrontDoors) {
        enterWarehouse();
      }
    }, 200);

    return () => window.clearInterval(interval);
  }, [phase, parkingSpotSecured, enterWarehouse]);

  return null;
}
