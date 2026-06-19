import { create } from 'zustand';
import {
  pickSampleLine,
  SAMPLE_KIOSKS,
  SAMPLE_MH_RESTORE,
  SAMPLE_TAKE_RADIUS_SQ,
} from '../systems/sampleStations';
import { usePlayerStore } from './playerStore';

const COOLDOWN_MS = 28_000;

interface SampleStationState {
  /** kiosk id → last taken timestamp */
  lastTakenAt: Record<string, number>;
  isKioskReady: (kioskId: string) => boolean;
  tryTakeSample: (px: number, pz: number) => { ok: boolean; kioskId?: string };
  getSwarmTarget: () => { x: number; z: number } | null;
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

      const dx = px - kiosk.x;
      const dz = pz - kiosk.z;
      if (dx * dx + dz * dz > SAMPLE_TAKE_RADIUS_SQ) continue;

      usePlayerStore.getState().restoreMentalHealth(SAMPLE_MH_RESTORE);
      set({ lastTakenAt: { ...lastTakenAt, [kiosk.id]: now } });
      return { ok: true, kioskId: kiosk.id };
    }

    return { ok: false };
  },

  getSwarmTarget: () => {
    const ready = SAMPLE_KIOSKS.filter((k) => get().isKioskReady(k.id));
    if (ready.length === 0) return null;
    return { x: ready[0].x, z: ready[0].z };
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
