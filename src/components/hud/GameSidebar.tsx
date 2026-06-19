import { useGameStore } from '../../stores/gameStore';
import { usePlayerStore } from '../../stores/playerStore';
import { useUIStore } from '../../stores/uiStore';
import { MentalHealthGauge } from './MentalHealthGauge';
import { ShoppingListGrid } from './ShoppingListGrid';
import { CheckoutPanel } from './CheckoutPanel';
import { WarehouseMap } from './WarehouseMap';

export function GameSidebar() {
  const phase = useGameStore((s) => s.phase);
  const parkingSpotSecured = useGameStore((s) => s.parkingSpotSecured);
  const nervousBreakdown = useGameStore((s) => s.nervousBreakdown);
  const checkoutWon = useGameStore((s) => s.checkoutWon);
  const resetGame = useGameStore((s) => s.reset);
  const resetPlayer = usePlayerStore((s) => s.reset);
  const momentum = usePlayerStore((s) => s.cartPhysics.momentum);
  const currentZone = usePlayerStore((s) => s.currentZone);
  const itemsRemaining = usePlayerStore((s) => s.inventory.itemsRemaining);
  const shoppingListComplete = useGameStore((s) => s.shoppingListComplete);
  const lastCollisionMessage = useUIStore((s) => s.lastCollisionMessage);
  const sidebarCollapsed = useUIStore((s) => s.sidebarCollapsed);
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);

  if (phase === 'MENU') return null;

  const phaseLabel =
    phase === 'PARKING'
      ? 'Parking Lot'
      : phase === 'SHOPPING'
        ? 'Warehouse'
        : phase;

  const handleReset = () => {
    resetGame();
    resetPlayer();
    useUIStore.setState({ visionBlur: 0, lastCollisionMessage: null, bumpFlash: 0 });
  };

  return (
    <aside className={`game-sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
      <button
        type="button"
        className="sidebar-toggle"
        onClick={toggleSidebar}
        aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {sidebarCollapsed ? '›' : '‹'}
      </button>

      <div className="sidebar-inner">
        <header className="sidebar-header">
          <div className="sidebar-brand">
            <span className="brand-mark">CC</span>
            <div>
              <div className="brand-title">Costco Chaos</div>
              <div className="brand-subtitle">{phaseLabel}</div>
            </div>
          </div>
        </header>

        <div className="sidebar-scroll">
          <MentalHealthGauge />

          <section className="sidebar-section">
            <div className="section-label">Objective</div>
            <p className="objective-copy">
              {phase === 'PARKING' && !parkingSpotSecured
                ? 'Dodge the chaos. Reach the green entrance mat alive. Mental health is a luxury.'
                : phase === 'SHOPPING' && shoppingListComplete
                  ? 'All items collected — proceed to CHECKOUT at the front of the store (north on map).'
                  : phase === 'SHOPPING'
                  ? `Collect ${itemsRemaining} item${itemsRemaining !== 1 ? 's' : ''} before your sanity checks out.`
                  : phase === 'CHECKOUT'
                    ? 'Final boss — wait in lane, manage mental health, press 1–6 to switch lanes.'
                    : 'Finish your trip (if you can).'}
            </p>
          </section>

          <ShoppingListGrid />

          <CheckoutPanel />

          {(phase === 'SHOPPING' || phase === 'CHECKOUT') && <WarehouseMap />}

          <section className="sidebar-section stats-section">
            <div className="section-label">Cart Stats</div>
            <div className="stat-grid">
              <div className="stat-cell">
                <span className="stat-key">Zone</span>
                <span className="stat-val">{currentZone}</span>
              </div>
              <div className="stat-cell">
                <span className="stat-key">Momentum</span>
                <span className="stat-val">{momentum.toFixed(1)}</span>
              </div>
              <div className="stat-cell">
                <span className="stat-key">Location</span>
                <span className="stat-val">{parkingSpotSecured ? 'Inside' : 'Outside'}</span>
              </div>
              <div className="stat-cell">
                <span className="stat-key">Checkout</span>
                <span className="stat-val">{phase === 'CHECKOUT' ? 'In line' : 'Not yet'}</span>
              </div>
            </div>
          </section>

          {lastCollisionMessage && (
            <div className="sidebar-alert">{lastCollisionMessage}</div>
          )}
        </div>

        <footer className="sidebar-footer">
          <div className="controls-legend">
            <span>W/↑ Drive</span>
            <span>S/↓ Reverse</span>
            <span>A/D Steer</span>
            <span>1–6 Lanes</span>
            <span>I Skip inside</span>
            {phase === 'SHOPPING' && <span>O Test checkout</span>}
          </div>
        </footer>
      </div>

      {nervousBreakdown && (
        <div className="game-over-overlay">
          <div className="game-over-panel">
            <h1>Nervous Breakdown</h1>
            <p>Your membership has been emotionally cancelled.</p>
            <button type="button" className="primary-button" onClick={handleReset}>
              Try Again
            </button>
          </div>
        </div>
      )}

      {checkoutWon && (
        <div className="game-over-overlay win-overlay">
          <div className="game-over-panel win-panel">
            <h1>Trip Complete</h1>
            <p>You collected everything and survived checkout. Costco respects your trauma.</p>
            <button type="button" className="primary-button" onClick={handleReset}>
              Shop Again
            </button>
          </div>
        </div>
      )}
    </aside>
  );
}
