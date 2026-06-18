import { useGameStore } from '../../stores/gameStore';
import { usePlayerStore } from '../../stores/playerStore';
import { useUIStore } from '../../stores/uiStore';
import { ComplianceGauge } from './ComplianceGauge';
import { ShoppingListGrid } from './ShoppingListGrid';

export function GameHud() {
  const phase = useGameStore((s) => s.phase);
  const parkingSpotSecured = useGameStore((s) => s.parkingSpotSecured);
  const nervousBreakdown = useGameStore((s) => s.nervousBreakdown);
  const resetGame = useGameStore((s) => s.reset);
  const resetPlayer = usePlayerStore((s) => s.reset);
  const momentum = usePlayerStore((s) => s.cartPhysics.momentum);
  const currentZone = usePlayerStore((s) => s.currentZone);
  const lastCollisionMessage = useUIStore((s) => s.lastCollisionMessage);

  if (phase === 'MENU') return null;

  const handleReset = () => {
    resetGame();
    resetPlayer();
    useUIStore.setState({ visionBlur: 0, lastCollisionMessage: null });
  };

  const phaseLabel =
    phase === 'PARKING'
      ? 'Parking Lot Gauntlet'
      : phase === 'SHOPPING'
        ? 'Warehouse Fulfillment'
        : phase;

  return (
    <div className="hud-root">
      <header className="hud-header">
        <span>Costco Chaos Portal</span>
        <a href="#incidents">Incident Reports</a>
        <span className="breadcrumb"> / {phaseLabel}</span>
      </header>

      <ComplianceGauge />
      <ShoppingListGrid />

      <div className="panel status-panel">
        <div className="panel-title">Cart Telemetry (Read-Only)</div>
        <table className="datagrid">
          <tbody>
            <tr>
              <td>Phase</td>
              <td>{phase}</td>
            </tr>
            <tr>
              <td>Zone</td>
              <td>{currentZone}</td>
            </tr>
            <tr>
              <td>Momentum</td>
              <td>{momentum.toFixed(1)} kg·m/s</td>
            </tr>
            <tr>
              <td>Objective</td>
              <td>{parkingSpotSecured ? 'INSIDE — SHOP' : 'REACH ENTRANCE'}</td>
            </tr>
            <tr>
              <td>Parking Status</td>
              <td>{parkingSpotSecured ? 'ENTERED' : 'OUTSIDE'}</td>
            </tr>
            <tr>
              <td>Checkout Drain</td>
              <td>{phase === 'CHECKOUT' ? 'ACTIVE' : 'INACTIVE'}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="panel controls-panel">
        <div className="panel-title">Operator Controls</div>
        <p className="controls-copy">
          ↑ / W — push forward &nbsp;|&nbsp; ↓ / S — pull back &nbsp;|&nbsp; ← → / A D — steer
        </p>
      </div>

      {lastCollisionMessage && (
        <div className="incident-banner">{lastCollisionMessage}</div>
      )}

      {parkingSpotSecured && phase === 'SHOPPING' && (
        <div className="success-banner">
          INSIDE COSTCO — Navigate wide warehouse aisles. Collect manifest items.
        </div>
      )}

      {phase === 'PARKING' && !parkingSpotSecured && (
        <div className="objective-banner">
          OBJECTIVE: Push cart through the crosswalk to the warehouse entrance doors ahead.
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
