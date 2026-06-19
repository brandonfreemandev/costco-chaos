import { create } from 'zustand';
import {
  CHECKOUT_LANE_IDS,
  CHECKOUT_LANE_X,
} from '../components/scene/checkoutLayout';
import { useGameStore } from './gameStore';
import { usePlayerStore } from './playerStore';
import { useUIStore } from './uiStore';

export interface SimCheckoutLane {
  id: string;
  x: number;
  isOpen: boolean;
  cashierSpeed: number;
  /** Shoppers waiting behind the person currently at the register. */
  customersAhead: number;
  processingRemaining: number;
  priceCheckRemaining: number;
  priceCheckLabel: string | null;
}

interface CheckoutStore {
  lanes: SimCheckoutLane[];
  playerLaneId: string | null;
  /** How many people (including active register scan) are ahead of the player. */
  slotsFromFront: number;
  beingServed: boolean;
  serveRemaining: number;
  switchCooldown: number;
  lastEvent: string | null;
  initLanes: () => void;
  tick: (dt: number, px: number, pz: number) => void;
  switchToLane: (laneId: string) => void;
  reset: () => void;
}

function seededQueue(seed: number): number {
  return seed % 4;
}

function isRegisterBusy(lane: SimCheckoutLane): boolean {
  return lane.processingRemaining > 0 || lane.priceCheckRemaining > 0;
}

function pickShortestLane(lanes: SimCheckoutLane[]): SimCheckoutLane {
  const open = lanes.filter((l) => l.isOpen);
  return open.reduce((best, lane) => {
    const bestDepth = best.customersAhead + (isRegisterBusy(best) ? 1 : 0);
    const laneDepth = lane.customersAhead + (isRegisterBusy(lane) ? 1 : 0);
    return laneDepth < bestDepth ? lane : best;
  });
}

function estimateWait(lane: SimCheckoutLane, slotsFromFront: number): number {
  const perCustomer = 3.2 / lane.cashierSpeed;
  return slotsFromFront * perCustomer + lane.processingRemaining + lane.priceCheckRemaining;
}

function playerSlotsBehind(lane: SimCheckoutLane): number {
  return lane.customersAhead + (isRegisterBusy(lane) ? 1 : 0);
}

function startTransaction(lane: SimCheckoutLane): void {
  if (Math.random() < 0.14) {
    lane.priceCheckRemaining = 4 + Math.random() * 5;
    lane.priceCheckLabel = 'PRICE CHECK';
    return;
  }
  const load = 1.8 + Math.random() * 1.4;
  lane.processingRemaining = load / lane.cashierSpeed;
  lane.priceCheckLabel = null;
}

function finishRegisterTransaction(
  lane: SimCheckoutLane,
  playerLaneId: string | null,
  slotsFromFront: number,
): number {
  let nextSlots = slotsFromFront;
  if (lane.id === playerLaneId && nextSlots > 0) {
    nextSlots -= 1;
  }
  if (lane.customersAhead > 0) {
    lane.customersAhead -= 1;
    startTransaction(lane);
  }
  return nextSlots;
}

export const useCheckoutStore = create<CheckoutStore>((set, get) => ({
  lanes: [],
  playerLaneId: null,
  slotsFromFront: 0,
  beingServed: false,
  serveRemaining: 0,
  switchCooldown: 0,
  lastEvent: null,

  initLanes: () => {
    if (get().lanes.length > 0) return;

    const lanes: SimCheckoutLane[] = CHECKOUT_LANE_X.map((x, i) => {
      const ahead = seededQueue(i * 7 + 3);
      const lane: SimCheckoutLane = {
        id: CHECKOUT_LANE_IDS[i],
        x,
        isOpen: i !== 5 || Math.random() > 0.35,
        cashierSpeed: 0.55 + Math.random() * 0.35,
        customersAhead: ahead,
        processingRemaining: 0,
        priceCheckRemaining: 0,
        priceCheckLabel: null,
      };
      if (lane.isOpen && (ahead > 0 || i % 2 === 0)) {
        startTransaction(lane);
      }
      return lane;
    });

    const start = pickShortestLane(lanes);
    const slots = playerSlotsBehind(start);
    set({
      lanes,
      playerLaneId: start.id,
      slotsFromFront: slots,
      beingServed: false,
      serveRemaining: 0,
      switchCooldown: 0,
      lastEvent: `Lane ${start.id} assigned — ${slots} carts ahead. Press 1–6 to switch lanes.`,
    });
  },

  switchToLane: (laneId) => {
    const state = get();
    if (state.switchCooldown > 0 || state.beingServed) return;

    const lanes = state.lanes.map((l) => ({ ...l }));
    const target = lanes.find((l) => l.id === laneId);
    const current = lanes.find((l) => l.id === state.playerLaneId);
    if (!target || !current || !target.isOpen || target.id === current.id) return;

    const oldWait = estimateWait(current, state.slotsFromFront);
    const newSlots = playerSlotsBehind(target);
    const newWait = estimateWait(target, newSlots);
    const regret = newWait - oldWait;

    let message = `Lane ${laneId} — ${newSlots} carts ahead.`;
    if (regret > 2) {
      message += ' Regret index: HIGH.';
      usePlayerStore.getState().damageMentalHealth(5);
    } else if (regret < -1) {
      message += ' This line looks faster.';
    } else {
      usePlayerStore.getState().damageMentalHealth(2);
    }

    if (Math.random() < 0.2) {
      target.priceCheckRemaining = 5 + Math.random() * 4;
      target.priceCheckLabel = 'PRICE CHECK';
      message = `Lane ${laneId} — price check. Of course.`;
      usePlayerStore.getState().damageMentalHealth(6);
    }

    set({
      lanes,
      playerLaneId: laneId,
      slotsFromFront: newSlots,
      switchCooldown: 4,
      lastEvent: message,
    });
    useUIStore.setState({ lastCollisionMessage: message });
  },

  tick: (dt, _px, _pz) => {
    if (useGameStore.getState().phase !== 'CHECKOUT') return;
    if (useGameStore.getState().checkoutWon) return;

    const state = get();
    if (state.lanes.length === 0) return;

    const lanes = state.lanes.map((l) => ({ ...l }));
    let { playerLaneId, slotsFromFront, beingServed, serveRemaining, switchCooldown, lastEvent } = state;

    for (const lane of lanes) {
      if (!lane.isOpen || beingServed && lane.id === playerLaneId) continue;

      if (lane.priceCheckRemaining > 0) {
        lane.priceCheckRemaining = Math.max(0, lane.priceCheckRemaining - dt);
        if (lane.priceCheckRemaining === 0) {
          lane.priceCheckLabel = null;
          if (lane.customersAhead > 0) {
            startTransaction(lane);
          }
        }
        continue;
      }

      if (lane.processingRemaining > 0) {
        lane.processingRemaining = Math.max(0, lane.processingRemaining - dt);
        if (lane.processingRemaining === 0) {
          slotsFromFront = finishRegisterTransaction(lane, playerLaneId, slotsFromFront);
        }
        continue;
      }

      if (lane.customersAhead > 0 && !isRegisterBusy(lane)) {
        startTransaction(lane);
      }
    }

    const myLane = lanes.find((l) => l.id === playerLaneId);
    if (myLane?.isOpen && !beingServed && slotsFromFront === 0 && !isRegisterBusy(myLane)) {
      beingServed = true;
      serveRemaining = 3.2 / myLane.cashierSpeed;
      lastEvent = 'Cashier scanning your absurd haul…';
    }

    if (beingServed) {
      serveRemaining = Math.max(0, serveRemaining - dt);
      if (serveRemaining === 0) {
        useGameStore.setState({ checkoutWon: true });
        useUIStore.setState({
          lastCollisionMessage: 'Transaction complete. Receipt spiritually $847.',
        });
      }
    } else if (myLane?.isOpen) {
      const drain = (1.35 + slotsFromFront * 0.5) * dt;
      usePlayerStore.getState().damageMentalHealth(drain);
      if (usePlayerStore.getState().mentalHealth <= 0) {
        useGameStore.getState().triggerNervousBreakdown();
      }
    }

    set({
      lanes,
      slotsFromFront,
      beingServed,
      serveRemaining,
      switchCooldown: Math.max(0, switchCooldown - dt),
      lastEvent,
    });
  },

  reset: () =>
    set({
      lanes: [],
      playerLaneId: null,
      slotsFromFront: 0,
      beingServed: false,
      serveRemaining: 0,
      switchCooldown: 0,
      lastEvent: null,
    }),
}));
