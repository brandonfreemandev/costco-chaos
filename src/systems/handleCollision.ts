import { usePlayerStore } from '../stores/playerStore';
import { useGameStore } from '../stores/gameStore';
import { useUIStore } from '../stores/uiStore';
import { spatialAudio } from '../audio/spatialAudioManager';
import { mapRange } from '../utils/math';
import { getNpcMeta } from './npcRegistry';

export const MIN_IMPACT = 0.15;
export const MAX_IMPACT = 8.0;

const proximityCooldowns = new Map<string, number>();
let spawnBumpGraceUntil = 0;

/** Brief bump immunity after entering the warehouse (fair spawn). */
export function grantSpawnBumpGrace(ms = 2800): void {
  spawnBumpGraceUntil = performance.now() + ms;
}

export function handleNpcCollision(
  playerSpeed: number,
  entitySpeed: number,
  cartLoad: number,
): void {
  if (performance.now() < spawnBumpGraceUntil) return;
  // Per mechanics.pseudocode §1: damage = f(relativeVelocity × cartLoad, 1, 15)
  const relativeVelocity = Math.abs(playerSpeed - entitySpeed);
  const impactForce = Math.max(MIN_IMPACT, relativeVelocity * cartLoad);

  const scaled = mapRange(impactForce, MIN_IMPACT, MAX_IMPACT, 1, 15);
  const damage = Math.round(Math.max(1, scaled));

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
  spawnBumpGraceUntil = 0;
}
