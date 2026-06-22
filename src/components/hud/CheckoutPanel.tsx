import { useGameStore } from '../../stores/gameStore';
import { useCheckoutStore } from '../../stores/checkoutStore';

/** Live lane status during checkout boss phase. */
export function CheckoutPanel({ floating = false }: { floating?: boolean }) {
  const phase = useGameStore((s) => s.phase);
  const shoppingListComplete = useGameStore((s) => s.shoppingListComplete);
  const lanes = useCheckoutStore((s) => s.lanes);
  const playerLaneId = useCheckoutStore((s) => s.playerLaneId);
  const slotsFromFront = useCheckoutStore((s) => s.slotsFromFront);
  const beingServed = useCheckoutStore((s) => s.beingServed);
  const switchCooldown = useCheckoutStore((s) => s.switchCooldown);
  const lastEvent = useCheckoutStore((s) => s.lastEvent);
  const stressDrainPerSec = useCheckoutStore((s) => s.stressDrainPerSec);
  const stressReason = useCheckoutStore((s) => s.stressReason);
  const priceCheckOnPlayerLane = useCheckoutStore((s) => s.priceCheckOnPlayerLane);

  if (!shoppingListComplete && phase !== 'CHECKOUT') return null;

  const sectionClass = floating ? 'float-hud float-hud-checkout checkout-panel' : 'sidebar-section checkout-panel';
  const labelClass = floating ? 'float-hud-label' : 'section-label';

  return (
    <section className={sectionClass}>
      <div className={labelClass}>Checkout Lanes</div>
      {phase !== 'CHECKOUT' ? (
        <p className="objective-copy">
          After your list is complete, drive north through the front court to the checkout lanes.
        </p>
      ) : (
        <>
          <p className="checkout-hint">
            You: Lane {playerLaneId} ·{' '}
            {beingServed
              ? 'being scanned…'
              : slotsFromFront === 0
                ? 'at register — waiting for cashier'
                : `${slotsFromFront} carts ahead`}
          </p>
          {phase === 'CHECKOUT' && stressDrainPerSec > 0 && (
            <p className={`checkout-stress ${priceCheckOnPlayerLane ? 'checkout-stress-alarm' : ''}`}>
              MH drain: −{stressDrainPerSec.toFixed(1)}/s
              {stressReason ? ` · ${stressReason}` : ''}
            </p>
          )}
          <div className="lane-grid">
            {lanes.map((lane) => {
              const registerBusy = lane.processingRemaining > 0 || lane.priceCheckRemaining > 0;
              const totalInLine = lane.customersAhead + (registerBusy ? 1 : 0);
              return (
              <div
                key={lane.id}
                className={`lane-cell ${lane.id === playerLaneId ? 'lane-you' : ''} ${!lane.isOpen ? 'lane-closed' : ''}`}
              >
                <span className="lane-num">{lane.id}</span>
                <span className="lane-depth">
                  {lane.isOpen ? `${lane.customersAhead} waiting · ${totalInLine} in line` : 'CLOSED'}
                </span>
                {registerBusy && lane.isOpen && (
                  <span className="lane-flag">
                    {lane.priceCheckLabel === 'COUPON DISPUTE'
                      ? 'COUPON DISPUTE'
                      : lane.priceCheckRemaining > 0
                        ? 'PRICE CHECK'
                        : 'SCANNING'}
                  </span>
                )}
              </div>
            );
            })}
          </div>
          <p className="checkout-hint">
            Press <strong>1–6</strong> to switch lanes
            {switchCooldown > 0 ? ` (${Math.ceil(switchCooldown)}s cooldown)` : ''}. Switching can trigger price checks.
          </p>
          {lastEvent && <p className="checkout-event">{lastEvent}</p>}
        </>
      )}
    </section>
  );
}
