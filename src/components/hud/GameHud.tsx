import { useGameStore } from '../../stores/gameStore';
import { useCartTransformStore } from '../../stores/cartTransformStore';
import { usePlayerStore } from '../../stores/playerStore';
import { useCheckoutStore } from '../../stores/checkoutStore';
import { useSampleStationStore } from '../../stores/sampleStationStore';
import { isInCheckoutApproach } from '../scene/checkoutLayout';
import { SAMPLE_KIOSKS, SAMPLE_MH_RESTORE } from '../../systems/sampleStations';
import { MentalHealthGauge } from './MentalHealthGauge';
import { WarehouseMap } from './WarehouseMap';

const COOLDOWN_MS = 28_000;

/** Viewport overlays — floating reference HUD + contextual toasts. */
export function GameHud() {
  const phase = useGameStore((s) => s.phase);
  const parkingSpotSecured = useGameStore((s) => s.parkingSpotSecured);
  const checkoutWon = useGameStore((s) => s.checkoutWon);
  const shoppingListComplete = useGameStore((s) => s.shoppingListComplete);
  const position = useCartTransformStore((s) => s.position);
  const mentalHealth = usePlayerStore((s) => s.mentalHealth);
  const lastTakenAt = useSampleStationStore((s) => s.lastTakenAt);
  const getPrompt = useSampleStationStore((s) => s.getPrompt);
  const slotsFromFront = useCheckoutStore((s) => s.slotsFromFront);
  const beingServed = useCheckoutStore((s) => s.beingServed);
  const lastEvent = useCheckoutStore((s) => s.lastEvent);
  const priceCheckOnPlayerLane = useCheckoutStore((s) => s.priceCheckOnPlayerLane);
  const stressDrainPerSec = useCheckoutStore((s) => s.stressDrainPerSec);

  const inCheckoutApproach = isInCheckoutApproach(position.x, position.z);

  let samplePrompt: string | null = null;
  if (phase === 'SHOPPING' && !shoppingListComplete) {
    samplePrompt = getPrompt(position.x, position.z);
    if (!samplePrompt && mentalHealth < 100) {
      const readyCount = SAMPLE_KIOSKS.filter((k) => {
        const last = lastTakenAt[k.id];
        return last === undefined || Date.now() - last >= COOLDOWN_MS;
      }).length;
      if (readyCount > 0) {
        samplePrompt = `${readyCount} sample station${readyCount > 1 ? 's' : ''} ready — look for green rings (+${SAMPLE_MH_RESTORE} MH)`;
      }
    }
  }

  if (phase === 'MENU') return null;

  const showMap = phase === 'SHOPPING' || phase === 'CHECKOUT';

  return (
    <div className="viewport-hud">
      <div className="float-hud-stack">
        <MentalHealthGauge floating />
        {showMap && <WarehouseMap floating />}
      </div>

      {samplePrompt && (
        <div className="toast-banner toast-sample">{samplePrompt}</div>
      )}

      {phase === 'SHOPPING' && shoppingListComplete && !checkoutWon && (
        <div className="toast-banner toast-objective">
          {inCheckoutApproach
            ? 'Entering checkout…'
            : 'List complete — drive north to CHECKOUT (front of store).'}
        </div>
      )}

      {phase === 'CHECKOUT' && !checkoutWon && (
        <div className={`toast-banner toast-checkout ${priceCheckOnPlayerLane ? 'toast-checkout-alarm' : ''}`}>
          {priceCheckOnPlayerLane && !beingServed && (
            <strong>PRICE CHECK — </strong>
          )}
          {beingServed
            ? 'Scanning items… almost free…'
            : `Lane queue — ${slotsFromFront} cart${slotsFromFront !== 1 ? 's' : ''} ahead · −${stressDrainPerSec.toFixed(1)} MH/s`}
          {lastEvent ? ` · ${lastEvent}` : ''}
        </div>
      )}

      {phase === 'PARKING' && !parkingSpotSecured && (
        <div className="toast-banner toast-objective">
          Target: Green mat in covered entrance. Hazard: Everything. Press I to skip inside (dev).
        </div>
      )}

      {checkoutWon && (
        <div className="toast-banner toast-win">
          You survived Costco. Your receipt is spiritually $847.
        </div>
      )}
    </div>
  );
}
