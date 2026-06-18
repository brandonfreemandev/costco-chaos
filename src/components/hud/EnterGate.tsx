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
        <div className="enter-header">Costco Chaos</div>
        <p className="enter-body">
          Navigate the parking lot, enter the warehouse, and collect your manifest
          items before stress wins.
        </p>
        <button type="button" className="enter-button" onClick={() => void handleEnter()}>
          Start Shift
        </button>
        <p className="enter-fine-print">
          W/↑ forward · S/↓ back · A/← left · D/→ right · Follow glowing products on shelves
        </p>
      </div>
    </div>
  );
}
