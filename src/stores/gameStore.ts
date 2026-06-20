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
  bumpCount: number;
  showPhoneInterlude: boolean;
  bonusItems: string[];
  setPhase: (phase: GamePhase) => void;
  unlockAudio: () => void;
  triggerNervousBreakdown: () => void;
  secureParkingSpot: () => void;
  markShoppingComplete: () => void;
  beginCheckout: () => void;
  skipToCheckout: () => void;
  triggerPhoneInterlude: () => void;
  dismissPhoneInterlude: () => void;
  addBonusItem: (item: string) => void;
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
  bumpCount: 0,
  showPhoneInterlude: false,
  bonusItems: [],

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
    useCheckoutStore.getState().snapCartToAssignedLane();
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
    useCheckoutStore.getState().snapCartToAssignedLane();
    logTransition('Dev shortcut — skipped shopping to checkout (test queue)');
  },

  triggerPhoneInterlude: () => {
    if (get().showPhoneInterlude) return;
    logTransition('Phone interlude triggered');
    set({ showPhoneInterlude: true });
  },

  dismissPhoneInterlude: () => set({ showPhoneInterlude: false }),

  addBonusItem: (item) => {
    const s = get();
    if (s.bonusItems.includes(item)) return;
    set({ bonusItems: [...s.bonusItems, item] });
    const slug = item.toLowerCase().replace(/\s+/g, '-');
    usePlayerStore.getState().addShoppingItem({
      id: `bonus-${slug}`,
      sku: `SPX-${Math.floor(Math.random() * 90000) + 10000}`,
      name: item,
      aisle: 'Babe\'s Request',
      category: 'bonus',
      collected: true,
      worldPosition: { x: 0, y: 0, z: 0 },
      productColor: '#a78bfa',
    });
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
      bumpCount: 0,
      showPhoneInterlude: false,
      bonusItems: [],
    });
  },
}));
