import { create } from 'zustand';

interface UIStore {
  visionBlur: number;
  lastCollisionMessage: string | null;
  sidebarCollapsed: boolean;
  bumpFlash: number;
  healFlash: number;
  damagePulse: number;
  triggerBumpFeedback: (damage: number) => void;
  triggerSampleFeedback: (message: string) => void;
  clearCollisionMessage: () => void;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
}

export const useUIStore = create<UIStore>((set) => ({
  visionBlur: 0,
  lastCollisionMessage: null,
  sidebarCollapsed: false,
  bumpFlash: 0,
  healFlash: 0,
  damagePulse: 0,

  triggerBumpFeedback: (damage) => {
    const messages = [
      `Shopper collision — mental health −${damage.toFixed(0)}`,
      `They saw your cart coming. Mental health −${damage.toFixed(0)}`,
      `Cart karma strikes. Mental health −${damage.toFixed(0)}`,
      `Executive member energy? Mental health −${damage.toFixed(0)}`,
      `Sample lady judges you. Mental health −${damage.toFixed(0)}`,
      `Bulk shopper detected. Mental health −${damage.toFixed(0)}`,
      `Your cart has opinions. Mental health −${damage.toFixed(0)}`,
    ];
    const message = messages[Math.floor(Math.random() * messages.length)];
    set({
      visionBlur: Math.min(8, damage * 0.45),
      bumpFlash: 1,
      damagePulse: Date.now(),
      lastCollisionMessage: message,
    });
    window.setTimeout(() => {
      set({ visionBlur: 0, bumpFlash: 0 });
    }, 420);
  },

  triggerSampleFeedback: (message) => {
    set({
      lastCollisionMessage: message,
      damagePulse: Date.now(),
      healFlash: 1,
      bumpFlash: 0,
      visionBlur: 0,
    });
    window.setTimeout(() => set({ healFlash: 0 }), 600);
  },

  clearCollisionMessage: () => set({ lastCollisionMessage: null }),

  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),

  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
}));
