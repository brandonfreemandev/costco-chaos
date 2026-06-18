import { useGameStore } from '../../stores/gameStore';
import { usePlayerStore } from '../../stores/playerStore';
import { useUIStore } from '../../stores/uiStore';
import { ComplianceGauge } from './ComplianceGauge';

export function GameHud() {
  const phase = useGameStore((s) => s.phase);
  const parkingSpotSecured = useGameStore((s) => s.parkingSpotSecured);
  const nervousBreakdown = useGameStore((s) => s.nervousBreakdown);
  const resetGame = useGameStore((s) => s.reset);
  const resetPlayer = usePlayerStore((s) => s.reset);
  const momentum = usePlayerStore((s) => s.cartPhysics.momentum);
  const lastCollisionMessage = useUIStore((s) => s.lastCollisionMessage);
  const visionBlur = useUIStore((s) => s.visionBlur);

  if (phase === 'MENU') return null;

  const handleReset = () => {
    resetGame();
    resetPlayer();
    useUIStore.setState({ visionBlur: 0, lastCollisionMessage: null });
  };

  return (
    <div className="hud-root" style={{ filter: `blur(${visionBlur * 3}px)` }}>
      <header className="hud-header">
        <span>Costco Chaos Portal</span>
        <a href="#incidents">Incident Reports</a>
        <span className="breadcrumb"> / Parking Lot Gauntlet</span>
      </header>

      <ComplianceGauge />

      <div className="panel status-panel">
        <div className="panel-title">Cart Telemetry (Read-Only)</div>
        <table className="datagrid">
          <tbody>
            <tr>
              <td>Phase</td>
              <td>{phase}</td>
            </tr>
            <tr>
              <td>Momentum</td>
              <td>{momentum.toFixed(1)} kg·m/s</td>
            </tr>
            <tr>
              <td>Parking Objective</td>
              <td>{parkingSpotSecured ? 'SECURED' : 'PENDING'}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {lastCollisionMessage && (
        <div className="incident-banner">{lastCollisionMessage}</div>
      )}

      {parkingSpotSecured && phase === 'PARKING' && (
        <div className="success-banner">
          PARKING SPOT SECURED — Phase 1 prototype complete. Warehouse slice coming next.
        </div>
      )}

      {nervousBreakdown && (
        <div className="game-over-overlay">
          <div className="game-over-panel">
            <h1>NERVOUS BREAKDOWN</h1>
            <p>Your Compliance Index reached 0%. HR has been notified.</p>
            <button type="button" className="enter-button" onClick={handleReset}>
              Re-Enter Portal
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
