import { create } from 'zustand';

interface UIStore {
  visionBlur: number;
  lastCollisionMessage: string | null;
  triggerVisionBlur: (severity: number) => void;
  clearCollisionMessage: () => void;
}

export const useUIStore = create<UIStore>((set) => ({
  visionBlur: 0,
  lastCollisionMessage: null,

  triggerVisionBlur: (severity) => {
    set({
      visionBlur: Math.min(1, severity / 15),
      lastCollisionMessage: `INCIDENT LOGGED — impact severity ${severity.toFixed(1)}`,
    });
    window.setTimeout(() => {
      set((state) => ({
        visionBlur: Math.max(0, state.visionBlur - 0.15),
      }));
    }, 120);
  },

  clearCollisionMessage: () => set({ lastCollisionMessage: null }),
}));
