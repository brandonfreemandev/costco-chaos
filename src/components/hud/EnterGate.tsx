import { spatialAudio } from '../../audio/spatialAudioManager';
import { useGameStore } from '../../stores/gameStore';

function BriefingRow({ icon, term, detail }: { icon: string; term: string; detail: string }) {
  return (
    <div className="enter-stat-row">
      <span className="enter-row-icon" role="img" aria-hidden="true">{icon}</span>
      <div className="enter-stat-content">
        <span className="enter-stat-label">{term}</span>
        <p className="enter-stat-note">{detail}</p>
      </div>
    </div>
  );
}

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

        <div className="enter-eyebrow">MANDATORY MEMBER ORIENTATION</div>
        <h1 className="enter-title">Welcome to Costco.</h1>
        <p className="enter-subtitle">
          Please review all terms and conditions below.
          No one reviews the terms and conditions.
        </p>

        <div className="enter-divider"><span>WHAT YOU ARE AGREEING TO</span></div>

        <div className="enter-briefing">
          <BriefingRow
            icon="😤"
            term="THE OTHER SHOPPERS"
            detail="Oblivious. Territorial. Personally offended by your cart's existence."
          />
          <BriefingRow
            icon="🧠"
            term="YOUR MENTAL HEALTH"
            detail="Starts at 100. Each collision is a small, specific grief."
          />
          <BriefingRow
            icon="📋"
            term="THE SHOPPING LIST"
            detail="4 items. Should take 10 minutes. Costco has other plans."
          />
          <BriefingRow
            icon="🧀"
            term="FREE SAMPLES"
            detail="Technically free. Strategically essential. Emotionally complicated."
          />
          <BriefingRow
            icon="😰"
            term="CHECKOUT"
            detail="The final boss. It will open a new lane the moment you commit to this one."
          />
        </div>

        <button type="button" className="enter-button" onClick={() => void handleEnter()}>
          I Understand&ensp;<span className="enter-button-aside">(I Do Not Understand)</span>
        </button>

        <p className="enter-fine-print">
          By entering, you agree Costco is not responsible for emotional damage, cart-on-cart
          incidents, or the complete erosion of your will to live in the bulk goods aisle.
          Executive membership does not cover therapy.
        </p>

      </div>
    </div>
  );
}
