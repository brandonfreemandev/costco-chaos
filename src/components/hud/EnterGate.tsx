import { spatialAudio } from '../../audio/spatialAudioManager';
import { useGameStore } from '../../stores/gameStore';

export function EnterGate() {
  const phase = useGameStore((s) => s.phase);
  const unlockAudio = useGameStore((s) => s.unlockAudio);

  if (phase !== 'MENU') return null;

  const handleEnter = async () => {
    await spatialAudio.init();
    unlockAudio();
  };

  return (
    <div className="enter-gate">
      <div className="enter-panel">
        <div className="enter-header">COSTCO CHAOS — EMPLOYEE INTRANET</div>
        <p className="enter-body">
          Authorized personnel only. By clicking below you acknowledge that parking lot
          navigation is a privilege, not a right.
        </p>
        <button type="button" className="enter-button" onClick={() => void handleEnter()}>
          Click to Enter Warehouse
        </button>
        <p className="enter-fine-print">
          ↑↓ or W/S to push cart. ←→ or A/D to steer. Cross the crosswalk and enter
          the warehouse doors ahead. You should hear a chime and cart squeak when moving.
        </p>
      </div>
    </div>
  );
}
