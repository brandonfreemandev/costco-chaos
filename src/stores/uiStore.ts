import { create } from 'zustand';

interface UIStore {
  visionBlur: number;
  lastCollisionMessage: string | null;
  sidebarCollapsed: boolean;
  triggerVisionBlur: (severity: number) => void;
  clearCollisionMessage: () => void;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
}

export const useUIStore = create<UIStore>((set) => ({
  visionBlur: 0,
  lastCollisionMessage: null,
  sidebarCollapsed: false,

  triggerVisionBlur: (severity) => {
    set({
      visionBlur: Math.min(6, severity * 0.35),
      lastCollisionMessage: `Someone bumped you — mental health −${severity.toFixed(0)}`,
    });
    window.setTimeout(() => {
      set({ visionBlur: 0 });
    }, 280);
  },

  clearCollisionMessage: () => set({ lastCollisionMessage: null }),

  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),

  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
}));
