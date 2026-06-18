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
      visionBlur: Math.min(6, severity * 0.35),
      lastCollisionMessage: `INCIDENT LOGGED — impact severity ${severity.toFixed(1)}`,
    });
    window.setTimeout(() => {
      set({ visionBlur: 0 });
    }, 280);
  },

  clearCollisionMessage: () => set({ lastCollisionMessage: null }),
}));
