import { create } from 'zustand';
import {
  pickSampleLine,
  SAMPLE_KIOSKS,
  SAMPLE_MH_RESTORE,
  SAMPLE_TAKE_RADIUS_SQ,
} from '../systems/sampleStations';
import { useEncounterStore } from './encounterStore';
import { usePlayerStore } from './playerStore';

const COOLDOWN_MS = 28_000;

interface SampleStationState {
  /** kiosk id → last taken timestamp */
  lastTakenAt: Record<string, number>;
  isKioskReady: (kioskId: string) => boolean;
  tryTakeSample: (px: number, pz: number) => { ok: boolean; kioskId?: string };
  getSwarmTarget: (npcId?: string) => { x: number; z: number } | null;
  getPrompt: (px: number, pz: number) => string | null;
  reset: () => void;
}

export const useSampleStationStore = create<SampleStationState>((set, get) => ({
  lastTakenAt: {},

  isKioskReady: (kioskId) => {
    const last = get().lastTakenAt[kioskId] ?? 0;
    return Date.now() - last >= COOLDOWN_MS;
  },

  tryTakeSample: (px, pz) => {
    if (usePlayerStore.getState().mentalHealth >= 100) {
      return { ok: false };
    }

    const { lastTakenAt, isKioskReady } = get();
    const now = Date.now();

    for (const kiosk of SAMPLE_KIOSKS) {
      if (!isKioskReady(kiosk.id)) continue;
      // Linda must confront you before the mid-aisle sample auto-collects.
      if (
        kiosk.id === 'sample-mid' &&
        !useEncounterStore.getState().seen.has('sample-inquisitor')
      ) {
        continue;
      }

      const dx = px - kiosk.x;
      const dz = pz - kiosk.z;
      if (dx * dx + dz * dz > SAMPLE_TAKE_RADIUS_SQ) continue;

      usePlayerStore.getState().restoreMentalHealth(SAMPLE_MH_RESTORE);
      set({ lastTakenAt: { ...lastTakenAt, [kiosk.id]: now } });
      return { ok: true, kioskId: kiosk.id };
    }

    return { ok: false };
  },

  getSwarmTarget: (npcId?: string) => {
    const ready = SAMPLE_KIOSKS.filter((k) => get().isKioskReady(k.id));
    if (ready.length === 0) return null;
    if (!npcId) return { x: ready[0].x, z: ready[0].z };
    let h = 0;
    for (let i = 0; i < npcId.length; i++) {
      h = (h * 31 + npcId.charCodeAt(i)) | 0;
    }
    const kiosk = ready[Math.abs(h) % ready.length];
    return { x: kiosk.x, z: kiosk.z };
  },

  getPrompt: (px, pz) => {
    const atMaxMh = usePlayerStore.getState().mentalHealth >= 100;

    for (const kiosk of SAMPLE_KIOSKS) {
      if (!get().isKioskReady(kiosk.id)) continue;
      const dx = px - kiosk.x;
      const dz = pz - kiosk.z;
      if (dx * dx + dz * dz > SAMPLE_TAKE_RADIUS_SQ) continue;
      if (atMaxMh) {
        return `${kiosk.sampleName} — you're already at 100% Mental Health. Leave it for the suffering.`;
      }
      return `${kiosk.sampleName} — +${SAMPLE_MH_RESTORE} Mental Health (roll through green ring)`;
    }
    return null;
  },

  reset: () => set({ lastTakenAt: {} }),
}));

export { pickSampleLine, SAMPLE_MH_RESTORE };
