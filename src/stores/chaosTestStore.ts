import { create } from 'zustand';

export interface ChaosViolation {
  id: string;
  kind: 'quest-in-rack' | 'cart-in-rack' | 'npc-stuck';
  message: string;
  at: number;
}

interface ChaosTestStore {
  monitorOn: boolean;
  violations: ChaosViolation[];
  lastCheckAt: number;
  setMonitor: (on: boolean) => void;
  toggleMonitor: () => void;
  addViolation: (v: Omit<ChaosViolation, 'at'>) => void;
  clearViolations: () => void;
}

const MAX_VIOLATIONS = 40;
const dedupeMs = 12_000;
const recentKeys = new Map<string, number>();

export const useChaosTestStore = create<ChaosTestStore>((set) => ({
  monitorOn: false,
  violations: [],
  lastCheckAt: 0,

  setMonitor: (on) => set({ monitorOn: on }),

  toggleMonitor: () => set((s) => ({ monitorOn: !s.monitorOn })),

  clearViolations: () => {
    recentKeys.clear();
    set({ violations: [] });
  },

  addViolation: (v) => {
    const now = Date.now();
    const last = recentKeys.get(v.id);
    if (last !== undefined && now - last < dedupeMs) return;
    recentKeys.set(v.id, now);

    const entry: ChaosViolation = { ...v, at: now };
    set((s) => ({
      violations: [entry, ...s.violations].slice(0, MAX_VIOLATIONS),
    }));
    console.warn(`[ChaosTest] ${v.kind}: ${v.message}`);
  },
}));
