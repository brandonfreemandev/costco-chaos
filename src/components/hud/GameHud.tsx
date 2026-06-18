import { useGameStore } from '../../stores/gameStore';

/** Lightweight viewport overlays — sidebar holds the main HUD. */
export function GameHud() {
  const phase = useGameStore((s) => s.phase);
  const parkingSpotSecured = useGameStore((s) => s.parkingSpotSecured);

  if (phase === 'MENU') return null;

  return (
    <div className="viewport-hud">
      {parkingSpotSecured && phase === 'SHOPPING' && (
        <div className="toast-banner toast-success">
          Follow the glowing products on the shelves.
        </div>
      )}

      {phase === 'PARKING' && !parkingSpotSecured && (
        <div className="toast-banner toast-objective">
          Walk to the crosswalk — dodge carts and shoppers to reach the doors.
        </div>
      )}
    </div>
  );
}
