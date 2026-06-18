import { create } from 'zustand';
import type { CartPhysics, PlayerState, StoreZone } from '../types/state';

interface PlayerStore extends PlayerState {
  damageMentalHealth: (amount: number) => void;
  restoreMentalHealth: (amount: number) => void;
  setCartPhysics: (cartPhysics: Partial<CartPhysics>) => void;
  setZone: (zone: StoreZone) => void;
  reset: () => void;
}

const initialState: PlayerState = {
  mentalHealth: 100,
  inventory: {
    itemsRemaining: 0,
    categories: {
      meat: false,
      bakery: false,
      electronics: false,
      bulkPaper: false,
    },
  },
  cartPhysics: {
    velocity: { x: 0, y: 0, z: 0 },
    momentum: 0,
    mass: 40,
  },
  currentZone: 'PARKING',
};

function logMentalHealth(prev: number, next: number, reason: string) {
  console.log(`[MH] ${prev.toFixed(1)} -> ${next.toFixed(1)} (${reason})`);
}

export const usePlayerStore = create<PlayerStore>((set, get) => ({
  ...initialState,

  damageMentalHealth: (amount) => {
    const prev = get().mentalHealth;
    const next = Math.max(0, prev - amount);
    logMentalHealth(prev, next, `damage -${amount.toFixed(1)}`);
    set({ mentalHealth: next });
  },

  restoreMentalHealth: (amount) => {
    const prev = get().mentalHealth;
    const next = Math.min(100, prev + amount);
    logMentalHealth(prev, next, `restore +${amount.toFixed(1)}`);
    set({ mentalHealth: next });
  },

  setCartPhysics: (cartPhysics) => {
    set((state) => ({
      cartPhysics: { ...state.cartPhysics, ...cartPhysics },
    }));
  },

  setZone: (zone) => set({ currentZone: zone }),

  reset: () => set(initialState),
}));
