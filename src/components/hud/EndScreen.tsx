import { useGameStore } from '../../stores/gameStore';
import { usePlayerStore } from '../../stores/playerStore';
import { useCheckoutStore } from '../../stores/checkoutStore';
import { useSampleStationStore } from '../../stores/sampleStationStore';
import { useUIStore } from '../../stores/uiStore';

// ── Stat commentary ──────────────────────────────────────────────────────────

function bumpComment(n: number): string {
  if (n === 0) return 'You touched no one. Suspiciously efficient.';
  if (n <= 3) return 'Minimal casualties. A model citizen.';
  if (n <= 8) return 'Statistically normal Costco violence. Acceptable.';
  if (n <= 15) return 'You were the primary hazard.';
  return 'You were the Aggressor. Membership revoked.';
}

function mhComment(mh: number): string {
  if (mh >= 80) return "You're fine. Genuinely fine. This is unnatural.";
  if (mh >= 55) return 'Functional. Barely. A triumph of will.';
  if (mh >= 30) return 'Technically survived. Emotionally? A void.';
  if (mh >= 10) return 'You needed a sample. You needed several.';
  return 'You crossed the finish line on fumes and pure, unadulterated spite.';
}

function laneComment(n: number): string {
  if (n === 0) return 'You stayed put. Bold. Possibly delusional.';
  if (n <= 2) return `${n} switch${n > 1 ? 'es' : ''}. One regret. Manageable.`;
  if (n <= 4) return `${n} switches. Lane optimist. Adorable. Naive.`;
  return `${n} switches. You re-entered the queue more times than you checked items. A tragedy.`;
}

function sampleComment(n: number): string {
  if (n === 0) return 'You left free MH on the table. Rookie move. Shameful.';
  if (n === 1) return 'One sample. The bare minimum of self-care. Barely.';
  if (n === 2) return 'Strategic. The sample is free therapy. Efficient.';
  return 'You circled the store for samples. Understandable. We\'ve all been there.';
}

function membershipTier(mh: number, bumps: number): string {
  if (mh >= 70 && bumps <= 4) return 'Gold Star Survivor (Platinum Patience)';
  if (mh >= 50) return 'Executive Member (Barely Functional)';
  if (mh >= 25) return 'Standard Member (Emotionally Compromised)';
  if (mh >= 10) return 'Emotional Support Member (In Need of Support)';
  return 'The Cart Was Pushing You (Total Collapse)';
}

function loseVerdict(bumps: number, samples: number): string {
  if (bumps >= 12) return 'Aggravated cart-on-cart violence. A public hazard.';
  if (samples === 0) return 'Insufficient sample consumption. A waste of a trip.';
  if (bumps === 0) return 'Stood still. The line won. Total surrender.';
  return 'Overwhelmed by normal Costco conditions. Standard outcome.';
}

function receiptTotal(): string {
  const dollars = 600 + Math.floor(Math.random() * 400);
  const cents = Math.floor(Math.random() * 100).toString().padStart(2, '0');
  return `$${dollars}.${cents}`;
}

// ── Shared stat row ───────────────────────────────────────────────────────────

function StatRow({ label, value, note }: { label: string; value: string | number; note: string }) {
  return (
    <div className="end-stat-row">
      <div className="end-stat-header">
        <span className="end-stat-label">{label}</span>
        <span className="end-stat-value">{value}</span>
      </div>
      <p className="end-stat-note">{note}</p>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function EndScreen() {
  const nervousBreakdown = useGameStore((s) => s.nervousBreakdown);
  const checkoutWon = useGameStore((s) => s.checkoutWon);
  const bumpCount = useGameStore((s) => s.bumpCount);
  const resetGame = useGameStore((s) => s.reset);
  const mentalHealth = usePlayerStore((s) => s.mentalHealth);
  const resetPlayer = usePlayerStore((s) => s.reset);
  const laneSwitchCount = useCheckoutStore((s) => s.laneSwitchCount);
  const lastTakenAt = useSampleStationStore((s) => s.lastTakenAt);

  if (!nervousBreakdown && !checkoutWon) return null;

  const samplesConsumed = Object.keys(lastTakenAt).length;
  const isWin = checkoutWon;

  const handleReset = () => {
    resetGame();
    resetPlayer();
    useUIStore.setState({ visionBlur: 0, lastCollisionMessage: null, bumpFlash: 0 });
  };

  return (
    <div className={`end-screen ${isWin ? 'end-screen-win' : 'end-screen-lose'}`}>
      <div className="end-panel">

        {/* ── Hero graphic ── */}
        <div className="end-hero-graphic" role="img" aria-hidden="true">
          {isWin ? '🍗' : '🛒'}
        </div>

        {/* ── Header ── */}
        <div className="end-header">
          <div className="end-eyebrow">{isWin ? 'COSTCO CHAOS' : 'INCIDENT REPORT'}</div>
          <h1 className="end-title">
            {isWin ? 'Trip Complete.' : 'Nervous Breakdown.'}
          </h1>
          <p className="end-subtitle">
            {isWin
              ? 'You survived. Costco noted your resilience and does not care.'
              : "Your membership has been emotionally cancelled. Effective immediately."}
          </p>
          {isWin && (
            <div className="end-receipt">
              <span className="end-receipt-label">RECEIPT TOTAL</span>
              <span className="end-receipt-amount">{receiptTotal()}</span>
              <span className="end-receipt-note">4 items · bulk pricing · inexplicable surcharge</span>
            </div>
          )}
        </div>

        {/* ── Divider ── */}
        <div className="end-divider">
          <span>{isWin ? 'PERFORMANCE REVIEW' : 'OFFICIAL FINDINGS'}</span>
        </div>

        {/* ── Stats ── */}
        <div className="end-stats">
          <StatRow
            label="SHOPPERS BUMPED"
            value={bumpCount}
            note={bumpComment(bumpCount)}
          />
          {isWin ? (
            <StatRow
              label="MENTAL HEALTH REMAINING"
              value={`${Math.max(0, Math.round(mentalHealth))} / 100`}
              note={mhComment(mentalHealth)}
            />
          ) : (
            <StatRow
              label="MENTAL HEALTH LOST"
              value="100 / 100"
              note="All of it. Every last point."
            />
          )}
          <StatRow
            label="FREE SAMPLES CONSUMED"
            value={samplesConsumed}
            note={sampleComment(samplesConsumed)}
          />
          {isWin && (
            <StatRow
              label="LANE SWITCHES"
              value={laneSwitchCount}
              note={laneComment(laneSwitchCount)}
            />
          )}
          {isWin ? (
            <StatRow
              label="MEMBERSHIP TIER"
              value={membershipTier(mentalHealth, bumpCount)}
              note="Assigned by the Costco Emotional Audit Committee."
            />
          ) : (
            <StatRow
              label="OFFICIAL CAUSE"
              value="Costco"
              note={loseVerdict(bumpCount, samplesConsumed)}
            />
          )}
        </div>

        {/* ── Actions ── */}
        <div className="end-actions">
          <button type="button" className="end-btn-primary" onClick={handleReset}>
            {isWin ? 'Shop Again' : 'Try Again'}
          </button>
          {!isWin && (
            <p className="end-accept-defeat">
              or{' '}
              <button type="button" className="end-btn-ghost" onClick={handleReset}>
                accept defeat
              </button>
              {' '}and also try again, there is no other option
            </p>
          )}
        </div>

      </div>
    </div>
  );
}
