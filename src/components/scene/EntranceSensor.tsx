import { useEffect } from 'react';
import { useGameStore } from '../../stores/gameStore';
import { useCartTransformStore } from '../../stores/cartTransformStore';
import { CROSSWALK, ENTRANCE_ZONE } from './parkingLotLayout';

export function EntranceSensor() {
  const enterWarehouse = useGameStore((s) => s.secureParkingSpot);
  const parkingSpotSecured = useGameStore((s) => s.parkingSpotSecured);
  const phase = useGameStore((s) => s.phase);

  useEffect(() => {
    if (phase !== 'PARKING' || parkingSpotSecured) return;

    const interval = window.setInterval(() => {
      const position = useCartTransformStore.getState().position;
      const speed = useCartTransformStore.getState().speed;

      const crossedCrosswalk = position.z <= CROSSWALK.z + 1.5;
      const inEntrance =
        position.x >= ENTRANCE_ZONE.minX &&
        position.x <= ENTRANCE_ZONE.maxX &&
        position.z >= ENTRANCE_ZONE.minZ &&
        position.z <= ENTRANCE_ZONE.maxZ &&
        speed <= ENTRANCE_ZONE.maxSpeed;

      if (crossedCrosswalk && inEntrance) {
        enterWarehouse();
      }
    }, 200);

    return () => window.clearInterval(interval);
  }, [phase, parkingSpotSecured, enterWarehouse]);

  return null;
}
