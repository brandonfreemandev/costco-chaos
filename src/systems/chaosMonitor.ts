import { useCartTransformStore } from '../stores/cartTransformStore';
import { useGameStore } from '../stores/gameStore';
import { usePlayerStore } from '../stores/playerStore';
import { useChaosTestStore } from '../stores/chaosTestStore';
import { isInsideRackFootprint } from '../components/scene/warehouseLayout';
import { cartOverlapsRackObstacle } from './staticObstacles';
import { getActiveNpcRuntimes } from './npcRegistry';

interface NpcTrack {
  anchorX: number;
  anchorZ: number;
  prevX: number;
  prevZ: number;
  since: number;
  microSteps: number;
}

const npcTracks = new Map<string, NpcTrack>();

/** Lightweight sanity checks — call at most ~2× per second. */
export function runChaosMonitor(): void {
  if (!useChaosTestStore.getState().monitorOn) return;

  const phase = useGameStore.getState().phase;
  if (phase !== 'SHOPPING' && phase !== 'CHECKOUT') return;

  const now = Date.now();
  useChaosTestStore.setState({ lastCheckAt: now });
  const add = useChaosTestStore.getState().addViolation;

  for (const item of usePlayerStore.getState().inventory.items) {
    if (item.collected) continue;
    const { x, z } = item.worldPosition;
    if (isInsideRackFootprint(x, z, 0.6)) {
      add({
        id: `quest-${item.id}`,
        kind: 'quest-in-rack',
        message: `Quest item "${item.name.slice(0, 28)}…" sits inside rack geometry (${x.toFixed(1)}, ${z.toFixed(1)})`,
      });
    }
  }

  const { x: px, z: pz } = useCartTransformStore.getState().position;
  if (cartOverlapsRackObstacle(px, pz)) {
    add({
      id: 'cart-in-rack',
      kind: 'cart-in-rack',
      message: `Cart is overlapping a rack (${px.toFixed(1)}, ${pz.toFixed(1)})`,
    });
  }

  for (const npc of getActiveNpcRuntimes()) {
    if (npc.paused && !npc.jittering) continue;

    const id = npc.meta.npcId;
    let track = npcTracks.get(id);
    if (!track) {
      track = { anchorX: npc.x, anchorZ: npc.z, prevX: npc.x, prevZ: npc.z, since: now, microSteps: 0 };
      npcTracks.set(id, track);
      continue;
    }

    const step = Math.hypot(npc.x - track.prevX, npc.z - track.prevZ);
    const netFromAnchor = Math.hypot(npc.x - track.anchorX, npc.z - track.anchorZ);

    if (step > 0.012) track.microSteps += 1;

    if (netFromAnchor > 0.55 || npc.speed > 0.35) {
      track.anchorX = npc.x;
      track.anchorZ = npc.z;
      track.since = now;
      track.microSteps = 0;
    }

    track.prevX = npc.x;
    track.prevZ = npc.z;

    const frozen = now - track.since > 5000 && netFromAnchor < 0.4;
    const jitterLoop =
      track.microSteps > 22 && netFromAnchor < 0.45 && now - track.since > 3500;

    if (frozen || jitterLoop) {
      add({
        id: `npc-${id}`,
        kind: 'npc-stuck',
        message: jitterLoop
          ? `Shopper ${id} jitter-loop ~${((now - track.since) / 1000).toFixed(0)}s at (${npc.x.toFixed(1)}, ${npc.z.toFixed(1)})`
          : `Shopper ${id} frozen ~5s at (${npc.x.toFixed(1)}, ${npc.z.toFixed(1)})`,
      });
      track.since = now;
      track.microSteps = 0;
    }
  }
}

export function resetChaosMonitorTracking(): void {
  npcTracks.clear();
}
