# State Management & Data Structures

## 1. PlayerState
interface PlayerState {
  mentalHealth: number; // 0 to 100. Game over at 0.
  inventory: ShoppingList;
  cartPhysics: {
    velocity: Vector3;
    momentum: number; // Increases as inventory gets heavier
    mass: number;
  };
  currentZone: StoreZone; // Enum: PARKING, AISLES, CHECKOUT
}

## 2. ShoppingList
interface ShoppingList {
  itemsRemaining: number;
  categories: {
    meat: boolean;
    bakery: boolean;
    electronics: boolean;
    bulkPaper: boolean;
    // ...
  };
}

## 3. NPCLogic (Archetypes)
interface NPCState {
  id: string;
  archetype: NPCArchetype; // Enum: BLOCKER, AGGRESSOR, SAMPLE_HUNTER
  baseSpeed: number;
  obsessiveness: number; // Determines willingness to abandon path for a sample
  cartLoad: number; // Determines mass for collision calculations
  state: NPCBehaviorState; // Enum: WANDERING, TARGETING_SAMPLE, IN_LINE
}

## 4. CheckoutSystem
interface CheckoutLane {
  laneId: string;
  isOpen: boolean;
  queue: NPCState[]; // Array of NPCs currently in line
  cashierBaseSpeed: number; // Randomized upon lane opening
  throughputVariance: number; // Random delays (e.g., price check, coupon dispute)
}