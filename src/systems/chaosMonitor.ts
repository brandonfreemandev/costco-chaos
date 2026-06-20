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
  lastTargetNodeId: string | null;
  targetSince: number;
}

const npcTracks = new Map<string, NpcTrack>();

const JITTER_SCORE_THRESHOLD = 8;
const NET_DISPLACEMENT_THRESHOLD = 0.4;
const STUCK_MS = 5000;

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
    const telem = npc.telemetry;
    const id = npc.meta.npcId;

    if (telem) {
      if (telem.state === 'Recover' && telem.netDisplacement5s < NET_DISPLACEMENT_THRESHOLD) {
        add({
          id: `npc-recover-${id}`,
          kind: 'npc-stuck',
          message: `Shopper ${id} in Recover with ${telem.netDisplacement5s.toFixed(2)}m / 5s at (${npc.x.toFixed(1)}, ${npc.z.toFixed(1)})`,
        });
      }

      if (
        telem.state === 'Patrol' &&
        telem.targetNodeId &&
        telem.netDisplacement5s < NET_DISPLACEMENT_THRESHOLD
      ) {
        let track = npcTracks.get(id);
        if (!track) {
          track = {
            anchorX: npc.x,
            anchorZ: npc.z,
            prevX: npc.x,
            prevZ: npc.z,
            since: now,
            microSteps: 0,
            lastTargetNodeId: telem.targetNodeId,
            targetSince: now,
          };
          npcTracks.set(id, track);
        } else if (track.lastTargetNodeId !== telem.targetNodeId) {
          track.lastTargetNodeId = telem.targetNodeId;
          track.targetSince = now;
        } else if (now - track.targetSince > STUCK_MS && npc.speed < 0.08) {
          add({
            id: `npc-target-${id}`,
            kind: 'npc-stuck',
            message: `Shopper ${id} stuck on target ${telem.targetNodeId} ~${((now - track.targetSince) / 1000).toFixed(0)}s`,
          });
          track.targetSince = now;
        }
      }

      if (
        telem.jitterScore > JITTER_SCORE_THRESHOLD &&
        telem.netDisplacement5s < 0.45 &&
        telem.state === 'Patrol'
      ) {
        add({
          id: `npc-jitter-${id}`,
          kind: 'npc-stuck',
          message: `Shopper ${id} jitter-loop (score ${telem.jitterScore}) at (${npc.x.toFixed(1)}, ${npc.z.toFixed(1)})`,
        });
      }
    }

    if (npc.paused && !npc.jittering && !telem) continue;
    if (telem?.state === 'Yield' || telem?.state === 'Recover') continue;

    let track = npcTracks.get(id);
    if (!track) {
      track = {
        anchorX: npc.x,
        anchorZ: npc.z,
        prevX: npc.x,
        prevZ: npc.z,
        since: now,
        microSteps: 0,
        lastTargetNodeId: telem?.targetNodeId ?? null,
        targetSince: now,
      };
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

    const frozen = now - track.since > STUCK_MS && netFromAnchor < NET_DISPLACEMENT_THRESHOLD;
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

/** Synthetic jitter scenario for CI — returns true if monitor would flag within window. */
export function detectSyntheticJitterLoop(
  samples: { x: number; z: number; at: number }[],
  now: number,
): boolean {
  if (samples.length < 10) return false;
  const oldest = samples[0];
  const latest = samples[samples.length - 1];
  const net = Math.hypot(latest.x - oldest.x, latest.z - oldest.z);
  if (net >= 0.45) return false;

  let microSteps = 0;
  for (let i = 1; i < samples.length; i++) {
    const step = Math.hypot(samples[i].x - samples[i - 1].x, samples[i].z - samples[i - 1].z);
    if (step > 0.012) microSteps += 1;
  }

  return microSteps > 22 && now - oldest.at > 3500;
}
