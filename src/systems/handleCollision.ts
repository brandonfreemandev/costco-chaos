import { usePlayerStore } from '../stores/playerStore';
import { useGameStore } from '../stores/gameStore';
import { useUIStore } from '../stores/uiStore';
import { mapRange } from '../utils/math';
import { spatialAudio } from '../audio/spatialAudioManager';

export const MIN_IMPACT = 0.5;
export const MAX_IMPACT = 8.0;

export function handleCollision(
  playerSpeed: number,
  entitySpeed: number,
  cartLoad: number,
): void {
  const impactForce = Math.abs(playerSpeed - entitySpeed) * cartLoad;
  if (impactForce < MIN_IMPACT) return;

  const damage = mapRange(impactForce, MIN_IMPACT, MAX_IMPACT, 1, 15);

  usePlayerStore.getState().damageMentalHealth(damage);
  spatialAudio.playCartSlam(impactForce);
  useUIStore.getState().triggerVisionBlur(damage);

  console.log(
    `[Collision] force=${impactForce.toFixed(2)} load=${cartLoad} damage=${damage.toFixed(1)}`,
  );

  if (usePlayerStore.getState().mentalHealth <= 0) {
    useGameStore.getState().triggerNervousBreakdown();
  }
}
