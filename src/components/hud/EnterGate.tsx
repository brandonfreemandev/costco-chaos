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
          Use W/A/S/D or arrow keys to push cart. Secure the green parking spot without
          losing all Compliance Index.
        </p>
      </div>
    </div>
  );
}
