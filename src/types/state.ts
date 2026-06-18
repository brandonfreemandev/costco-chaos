export type StoreZone = 'PARKING' | 'AISLES' | 'CHECKOUT';

export type GamePhase = 'MENU' | 'PARKING' | 'SHOPPING' | 'CHECKOUT' | 'END';

export type NPCArchetype = 'BLOCKER' | 'AGGRESSOR' | 'SAMPLE_HUNTER';

export type NPCBehaviorState = 'WANDERING' | 'TARGETING_SAMPLE' | 'IN_LINE';

export interface CartPhysics {
  velocity: { x: number; y: number; z: number };
  momentum: number;
  mass: number;
}

export interface ShoppingList {
  itemsRemaining: number;
  categories: {
    meat: boolean;
    bakery: boolean;
    electronics: boolean;
    bulkPaper: boolean;
  };
}

export interface PlayerState {
  mentalHealth: number;
  inventory: ShoppingList;
  cartPhysics: CartPhysics;
  currentZone: StoreZone;
}

export interface NPCState {
  id: string;
  archetype: NPCArchetype;
  baseSpeed: number;
  obsessiveness: number;
  cartLoad: number;
  state: NPCBehaviorState;
}

export interface CheckoutLane {
  laneId: string;
  isOpen: boolean;
  queue: NPCState[];
  cashierBaseSpeed: number;
  throughputVariance: number;
}

export const COLLISION_GROUP = {
  PLAYER: 0,
  NPC: 1,
  STATIC: 2,
} as const;
