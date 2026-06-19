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
          Welcome to Costco Chaos. Your cart awaits. Your mental health awaits its fate.
          Collect everything on your list before the crowd collects their vengeance.
        </p>
        <button type="button" className="enter-button" onClick={() => void handleEnter()}>
          Accept My Fate
        </button>
        <p className="enter-fine-print">
          Warning: Shoppers are territorial. Every collision hurts. Bulk purchases make enemies.
        </p>
      </div>
    </div>
  );
}
