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
          You grabbed a cart in the parking lot. Survive the crowd, make it inside,
          and collect everything on your list before your mental health runs out.
        </p>
        <button type="button" className="enter-button" onClick={() => void handleEnter()}>
          Start Shopping
        </button>
        <p className="enter-fine-print">
          Bump into other shoppers and your mental health drops. Keep the cart moving.
        </p>
      </div>
    </div>
  );
}
