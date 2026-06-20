import { create } from 'zustand';

interface UIStore {
  visionBlur: number;
  lastCollisionMessage: string | null;
  sidebarCollapsed: boolean;
  /** DEV: walkability graph overlay — off until H pressed */
  walkGraphVisible: boolean;
  bumpFlash: number;
  healFlash: number;
  damagePulse: number;
  lastDamageAmount: number;
  triggerBumpFeedback: (damage: number) => void;
  triggerSampleFeedback: (message: string) => void;
  triggerCheckoutStress: (message: string, flash?: number) => void;
  clearCollisionMessage: () => void;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleWalkGraph: () => void;
}

export const useUIStore = create<UIStore>((set) => ({
  visionBlur: 0,
  lastCollisionMessage: null,
  sidebarCollapsed: false,
  walkGraphVisible: false,
  bumpFlash: 0,
  healFlash: 0,
  damagePulse: 0,
  lastDamageAmount: 0,

  triggerBumpFeedback: (damage) => {
    const d = damage.toFixed(0);
    const messages = [
      `Shopper collision — mental health −${d}`,
      `They saw your cart coming. Mental health −${d}`,
      `Cart karma strikes. Mental health −${d}`,
      `Executive member energy? Mental health −${d}`,
      `Sample lady judges you. Mental health −${d}`,
      `Bulk shopper detected. Mental health −${d}`,
      `Your cart has opinions. Mental health −${d}`,
      `You grazed a 48-pack of paper towels. Mental health −${d}`,
      `A retiree with infinite time blocks your path. Mental health −${d}`,
      `That was someone's grandma. Mental health −${d}`,
      `Their cart was full of regret AND rotisserie chicken. Mental health −${d}`,
      `You became the person everyone hates at Costco. Mental health −${d}`,
      `The Kirkland brand witnessed this. Mental health −${d}`,
      `Three people stopped to watch. Mental health −${d}`,
      `You apologized to the cart. Mental health −${d}`,
      `The PA system noticed. Mental health −${d}`,
      `Cart-on-cart violence in aisle 7. Mental health −${d}`,
      `Your executive membership does not protect you here. Mental health −${d}`,
      `A child pointed. A parent sighed. Mental health −${d}`,
      `Somebody's $1.50 hot dog was in there. Mental health −${d}`,
      `They were just trying to get to the samples. Mental health −${d}`,
      `Absolutely destroyed a display of 36-packs. Mental health −${d}`,
      `Your cart apologizes. You don't. Mental health −${d}`,
      `The free sample station is now a crime scene. Mental health −${d}`,
    ];
    const message = messages[Math.floor(Math.random() * messages.length)];
    set({
      visionBlur: Math.min(8, damage * 0.45),
      bumpFlash: 1,
      damagePulse: Date.now(),
      lastDamageAmount: damage,
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

  triggerCheckoutStress: (message, flash = 0.75) => {
    set({
      lastCollisionMessage: message,
      bumpFlash: flash,
      damagePulse: Date.now(),
      visionBlur: 2.5,
    });
    window.setTimeout(() => {
      set({ visionBlur: 0, bumpFlash: 0 });
    }, 520);
  },

  clearCollisionMessage: () => set({ lastCollisionMessage: null }),

  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),

  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),

  toggleWalkGraph: () =>
    set((s) => {
      const next = !s.walkGraphVisible;
      console.log(`[Shortcut] H — walk graph overlay ${next ? 'ON' : 'OFF'}`);
      return { walkGraphVisible: next };
    }),
}));
