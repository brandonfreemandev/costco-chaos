import { create } from 'zustand';
import type { GamePhase } from '../types/state';
import { useCheckoutStore } from './checkoutStore';
import { usePlayerStore } from './playerStore';
import { useSampleStationStore } from './sampleStationStore';
import { grantSpawnBumpGrace, resetNpcBumpCooldowns } from '../systems/handleCollision';

interface GameStore {
  phase: GamePhase;
  audioUnlocked: boolean;
  nervousBreakdown: boolean;
  checkoutWon: boolean;
  parkingSpotSecured: boolean;
  shoppingListComplete: boolean;
  setPhase: (phase: GamePhase) => void;
  unlockAudio: () => void;
  triggerNervousBreakdown: () => void;
  secureParkingSpot: () => void;
  markShoppingComplete: () => void;
  beginCheckout: () => void;
  skipToCheckout: () => void;
  reset: () => void;
}

function logTransition(message: string) {
  console.log(`[GameManager] ${message}`);
}

export const useGameStore = create<GameStore>((set, get) => ({
  phase: 'MENU',
  audioUnlocked: false,
  nervousBreakdown: false,
  checkoutWon: false,
  parkingSpotSecured: false,
  shoppingListComplete: false,

  setPhase: (phase) => {
    const prev = get().phase;
    if (prev === phase) return;
    logTransition(`${prev} -> ${phase}`);
    set({ phase });
  },

  unlockAudio: () => {
    logTransition('Audio context unlocked');
    set({ audioUnlocked: true, phase: 'PARKING' });
  },

  triggerNervousBreakdown: () => {
    logTransition('Nervous breakdown — GAME OVER');
    set({ nervousBreakdown: true, phase: 'END' });
  },

  secureParkingSpot: () => {
    if (get().parkingSpotSecured) return;
    logTransition('Entered Costco warehouse -> SHOPPING');
    useSampleStationStore.getState().reset();
    useCheckoutStore.getState().reset();
    resetNpcBumpCooldowns();
    grantSpawnBumpGrace(4200);
    set({
      parkingSpotSecured: true,
      phase: 'SHOPPING',
      shoppingListComplete: false,
      checkoutWon: false,
    });
    usePlayerStore.getState().setZone('AISLES');
  },

  markShoppingComplete: () => {
    if (get().shoppingListComplete || get().phase !== 'SHOPPING') return;
    logTransition('Shopping list complete — proceed to checkout');
    useCheckoutStore.getState().initLanes();
    set({ shoppingListComplete: true });
  },

  beginCheckout: () => {
    if (!get().shoppingListComplete || get().checkoutWon || get().phase === 'CHECKOUT') return;
    logTransition('Entered checkout area -> CHECKOUT');
    useCheckoutStore.getState().initLanes();
    set({ phase: 'CHECKOUT' });
    usePlayerStore.getState().setZone('CHECKOUT');
  },

  skipToCheckout: () => {
    if (get().phase !== 'SHOPPING' || get().checkoutWon) return;

    const player = usePlayerStore.getState();
    for (const item of player.inventory.items) {
      if (!item.collected) {
        player.collectItem(item.id);
      }
    }

    useCheckoutStore.getState().reset();
    set({ shoppingListComplete: true, checkoutWon: false, phase: 'CHECKOUT' });
    useCheckoutStore.getState().initLanes();
    usePlayerStore.getState().setZone('CHECKOUT');
    logTransition('Dev shortcut — skipped shopping to checkout (test queue)');
  },

  reset: () => {
    logTransition('Session reset');
    useSampleStationStore.getState().reset();
    useCheckoutStore.getState().reset();
    set({
      phase: 'MENU',
      audioUnlocked: false,
      nervousBreakdown: false,
      checkoutWon: false,
      parkingSpotSecured: false,
      shoppingListComplete: false,
    });
  },
}));
