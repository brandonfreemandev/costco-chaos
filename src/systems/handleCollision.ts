import { usePlayerStore } from '../stores/playerStore';
import { useGameStore } from '../stores/gameStore';
import { useUIStore } from '../stores/uiStore';
import { mapRange } from '../utils/math';
import { spatialAudio } from '../audio/spatialAudioManager';
import { getNpcMeta } from './npcRegistry';

export const MIN_IMPACT = 0.15;
export const MAX_IMPACT = 8.0;

const proximityCooldowns = new Map<string, number>();

export function handleNpcCollision(
  playerSpeed: number,
  entitySpeed: number,
  cartLoad: number,
): void {
  const combined = playerSpeed + entitySpeed;
  const rawForce = Math.max(Math.abs(playerSpeed - entitySpeed), combined * 0.4) * cartLoad;
  const impactForce = Math.max(0.5, rawForce);

  const scaled = mapRange(impactForce, MIN_IMPACT, MAX_IMPACT, 6, 18);
  const damage = Math.max(6, scaled);

  usePlayerStore.getState().damageMentalHealth(damage);
  useUIStore.getState().triggerBumpFeedback(damage);

  if (useGameStore.getState().audioUnlocked) {
    spatialAudio.playCartSlam(impactForce);
  }

  if (usePlayerStore.getState().mentalHealth <= 0) {
    useGameStore.getState().triggerNervousBreakdown();
  }
}

export function tryHandlePlayerNpcCollision(
  playerSpeed: number,
  otherHandle: number | undefined,
  otherLinvel?: { x: number; y: number; z: number },
): boolean {
  const meta = getNpcMeta(otherHandle);
  if (!meta?.isNpc) return false;

  const entitySpeed = otherLinvel ? Math.hypot(otherLinvel.x, otherLinvel.z) : 0;
  handleNpcCollision(playerSpeed, entitySpeed, meta.cartLoad);
  return true;
}

export function tryNpcProximityBump(
  npcId: string,
  playerSpeed: number,
  entitySpeed: number,
  cartLoad: number,
  cooldownMs = 320,
): boolean {
  const now = performance.now();
  const last = proximityCooldowns.get(npcId) ?? 0;
  if (now - last < cooldownMs) return false;
  proximityCooldowns.set(npcId, now);
  handleNpcCollision(playerSpeed, entitySpeed, cartLoad);
  return true;
}

export function resetNpcBumpCooldowns(): void {
  proximityCooldowns.clear();
}
