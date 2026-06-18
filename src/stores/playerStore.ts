import { create } from 'zustand';
import type { CartPhysics, PlayerState, ShoppingListItem, StoreZone } from '../types/state';

interface PlayerStore extends PlayerState {
  damageMentalHealth: (amount: number) => void;
  restoreMentalHealth: (amount: number) => void;
  setCartPhysics: (cartPhysics: Partial<CartPhysics>) => void;
  setZone: (zone: StoreZone) => void;
  collectItem: (itemId: string) => void;
  reset: () => void;
}

const SHOPPING_ITEMS: ShoppingListItem[] = [
  {
    id: 'item-meat',
    sku: '482910',
    name: 'Chicken Breast 12lb x4',
    aisle: 'Aisle 501 (Meat)',
    category: 'meat',
    collected: false,
    worldPosition: { x: -2.6, y: 1.1, z: -18 },
    productColor: '#f5c6a5',
  },
  {
    id: 'item-bakery',
    sku: '119044',
    name: 'Muffin Assortment 24ct',
    aisle: 'Aisle 310 (Bakery)',
    category: 'bakery',
    collected: false,
    worldPosition: { x: 2.6, y: 0.95, z: -10 },
    productColor: '#d4a574',
  },
  {
    id: 'item-electronics',
    sku: '990221',
    name: '65" LED Display Bundle',
    aisle: 'Aisle 120 (Electronics)',
    category: 'electronics',
    collected: false,
    worldPosition: { x: -2.6, y: 1.5, z: 4 },
    productColor: '#1a1a22',
  },
  {
    id: 'item-paper',
    sku: '330118',
    name: 'Bath Tissue 30-Roll Pallet',
    aisle: 'Aisle 214 (Bulk Paper)',
    category: 'bulkPaper',
    collected: false,
    worldPosition: { x: 2.6, y: 1.35, z: 14 },
    productColor: '#f0ebe3',
  },
];

function buildInventory() {
  return {
    itemsRemaining: SHOPPING_ITEMS.length,
    items: SHOPPING_ITEMS.map((item) => ({ ...item })),
    categories: {
      meat: false,
      bakery: false,
      electronics: false,
      bulkPaper: false,
    },
  };
}

const initialState: PlayerState = {
  mentalHealth: 100,
  inventory: buildInventory(),
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

  collectItem: (itemId) => {
    set((state) => {
      const items = state.inventory.items.map((item) =>
        item.id === itemId ? { ...item, collected: true } : item,
      );
      const collected = items.find((item) => item.id === itemId);
      const categories = collected
        ? { ...state.inventory.categories, [collected.category]: true }
        : state.inventory.categories;

      return {
        inventory: {
          items,
          categories,
          itemsRemaining: items.filter((item) => !item.collected).length,
        },
      };
    });
  },

  reset: () => set({ ...initialState, inventory: buildInventory() }),
}));
