import { create } from 'zustand';
import {
  CHECKOUT_LANE_IDS,
  CHECKOUT_LANE_X,
  isInCheckoutApproach,
} from '../components/scene/checkoutLayout';
import {
  checkoutStressDrain,
  checkoutStressReason,
  pickLaneClosedLine,
  pickLaneSwitchRegretLine,
  pickLaneSwitchBaitLine,
  pickPriceCheckLine,
  pickCouponDisputeLine,
  pickRushHourLine,
  PRICE_CHECK_SPIKE,
  COUPON_DISPUTE_SPIKE,
} from '../systems/checkoutStress';
import { useGameStore } from './gameStore';
import { usePlayerStore } from './playerStore';
import { useUIStore } from './uiStore';
import { useCartTransformStore } from './cartTransformStore';

export interface SimCheckoutLane {
  id: string;
  x: number;
  isOpen: boolean;
  cashierSpeed: number;
  customersAhead: number;
  processingRemaining: number;
  priceCheckRemaining: number;
  priceCheckLabel: string | null;
  couponDisputeRemaining: number;
}

interface CheckoutStore {
  lanes: SimCheckoutLane[];
  playerLaneId: string | null;
  slotsFromFront: number;
  beingServed: boolean;
  serveRemaining: number;
  switchCooldown: number;
  lastEvent: string | null;
  stressDrainPerSec: number;
  stressReason: string | null;
  priceCheckOnPlayerLane: boolean;
  laneEventCooldown: number;
  rushCooldown: number;
  laneSwitchCount: number;
  /** 0→1 advance animation per lane; 1 = fully advanced, reset to 0 on each queue pop */
  laneAdvanceAnim: Record<string, number>;
  initLanes: () => void;
  snapCartToAssignedLane: () => void;
  tick: (dt: number, px: number, pz: number) => void;
  switchToLane: (laneId: string) => void;
  reset: () => void;
}

const prevPriceCheckRemaining = new Map<string, number>();

/** Per-lane starting queue — no lane is a free empty win (lane 4 was always 0). */
const LANE_START_QUEUE = [2, 3, 2, 3, 1, 2] as const;

function laneDepth(lane: SimCheckoutLane): number {
  return lane.customersAhead + (isRegisterBusy(lane) ? 1 : 0);
}

function isRegisterBusy(lane: SimCheckoutLane): boolean {
  return lane.processingRemaining > 0 || lane.priceCheckRemaining > 0 || lane.couponDisputeRemaining > 0;
}

function pickMedianLane(lanes: SimCheckoutLane[]): SimCheckoutLane {
  const open = lanes.filter((l) => l.isOpen);
  const sorted = [...open].sort((a, b) => laneDepth(a) - laneDepth(b));
  return sorted[Math.floor(sorted.length / 2)] ?? open[0];
}

function estimateWait(lane: SimCheckoutLane, slotsFromFront: number): number {
  const perCustomer = 3.2 / lane.cashierSpeed;
  return slotsFromFront * perCustomer + lane.processingRemaining + lane.priceCheckRemaining;
}

function startTransaction(lane: SimCheckoutLane): void {
  const roll = Math.random();
  if (roll < 0.18) {
    lane.priceCheckRemaining = 4 + Math.random() * 6;
    lane.priceCheckLabel = 'PRICE CHECK';
    lane.couponDisputeRemaining = 0;
    return;
  }
  if (roll < 0.30) {
    // Coupon dispute: 3× base delay (per mechanics.pseudocode §3)
    const baseDelay = (1.8 + Math.random() * 1.4) / lane.cashierSpeed;
    lane.couponDisputeRemaining = baseDelay * 3;
    lane.processingRemaining = 0;
    lane.priceCheckLabel = 'COUPON DISPUTE';
    return;
  }
  const load = 1.8 + Math.random() * 1.4;
  lane.processingRemaining = load / lane.cashierSpeed;
  lane.couponDisputeRemaining = 0;
  lane.priceCheckLabel = null;
}

function finishRegisterTransaction(
  lane: SimCheckoutLane,
  playerLaneId: string | null,
  slotsFromFront: number,
  advanceAnim: Record<string, number>,
): number {
  let nextSlots = slotsFromFront;
  if (lane.id === playerLaneId && nextSlots > 0) {
    nextSlots -= 1;
  }
  if (lane.customersAhead > 0) {
    lane.customersAhead -= 1;
    advanceAnim[lane.id] = 0; // trigger advance animation
    startTransaction(lane);
  }
  return nextSlots;
}

function applyCheckoutDamage(amount: number, message: string, flash = 0.75): void {
  usePlayerStore.getState().damageMentalHealth(amount);
  useUIStore.getState().triggerCheckoutStress(message, flash);
}

function maybeCloseLane(lanes: SimCheckoutLane[], playerLaneId: string | null): string | null {
  const open = lanes.filter((l) => l.isOpen);
  if (open.length <= 2 || Math.random() > 0.35) return null;

  const victim = open[Math.floor(Math.random() * open.length)];
  victim.isOpen = false;
  victim.processingRemaining = 0;
  victim.priceCheckRemaining = 0;
  victim.priceCheckLabel = null;

  if (victim.id === playerLaneId) {
    applyCheckoutDamage(14, pickLaneClosedLine(victim.id), 0.95);
    return `YOUR lane ${victim.id} closed — press 1–6 immediately.`;
  }

  return pickLaneClosedLine(victim.id);
}

function buildInitialLanes(): SimCheckoutLane[] {
  prevPriceCheckRemaining.clear();

  return CHECKOUT_LANE_X.map((x, i) => {
    const ahead = LANE_START_QUEUE[i] ?? 2;
    const lane: SimCheckoutLane = {
      id: CHECKOUT_LANE_IDS[i],
      x,
      isOpen: i !== 5 || Math.random() > 0.4,
      cashierSpeed: 0.5 + Math.random() * 0.4,
      customersAhead: ahead,
      processingRemaining: 0,
      priceCheckRemaining: 0,
      priceCheckLabel: null,
      couponDisputeRemaining: 0,
    };
    if (lane.isOpen) {
      startTransaction(lane);
    }
    prevPriceCheckRemaining.set(lane.id, lane.priceCheckRemaining);
    return lane;
  });
}

function rushRandomLanes(lanes: SimCheckoutLane[], count: number): void {
  const open = lanes.filter((l) => l.isOpen);
  for (let n = 0; n < count && open.length > 0; n += 1) {
    const lane = open[Math.floor(Math.random() * open.length)];
    lane.customersAhead += 1;
    if (!isRegisterBusy(lane)) {
      startTransaction(lane);
    }
  }
}

function baitLaneSwitch(target: SimCheckoutLane): boolean {
  if (laneDepth(target) > 1) return false;
  const bump = 2 + Math.floor(Math.random() * 3);
  target.customersAhead += bump;
  if (!isRegisterBusy(target)) {
    startTransaction(target);
  }
  return true;
}

export const useCheckoutStore = create<CheckoutStore>((set, get) => ({
  lanes: [],
  playerLaneId: null,
  slotsFromFront: 0,
  beingServed: false,
  serveRemaining: 0,
  switchCooldown: 0,
  lastEvent: null,
  stressDrainPerSec: 0,
  stressReason: null,
  priceCheckOnPlayerLane: false,
  laneEventCooldown: 24,
  rushCooldown: 18,
  laneSwitchCount: 0,
  laneAdvanceAnim: {},

  initLanes: () => {
    if (get().lanes.length > 0) return;

    const lanes = buildInitialLanes();
    const start = pickMedianLane(lanes);
    const slots = laneDepth(start);
    const initAnim: Record<string, number> = {};
    lanes.forEach((l) => { initAnim[l.id] = 1; });

    set({
      lanes,
      playerLaneId: start.id,
      slotsFromFront: slots,
      beingServed: false,
      serveRemaining: 0,
      switchCooldown: 0,
      stressDrainPerSec: 0,
      stressReason: null,
      priceCheckOnPlayerLane: false,
      laneEventCooldown: 24,
      rushCooldown: 16 + Math.random() * 10,
      laneSwitchCount: 0,
      laneAdvanceAnim: initAnim,
      lastEvent: `Lane ${start.id} — ${slots} carts ahead. No lane is empty. Press 1–6 wisely.`,
    });
  },

  snapCartToAssignedLane: () => {
    const { playerLaneId } = get();
    if (!playerLaneId) return;
    const idx = CHECKOUT_LANE_IDS.indexOf(playerLaneId as typeof CHECKOUT_LANE_IDS[number]);
    if (idx === -1) return;
    const { position, yaw } = useCartTransformStore.getState();
    useCartTransformStore.getState().requestTeleport(CHECKOUT_LANE_X[idx], position.z, yaw);
  },

  switchToLane: (laneId) => {
    const state = get();
    if (state.switchCooldown > 0 || state.beingServed) return;

    const lanes = state.lanes.map((l) => ({ ...l }));
    const target = lanes.find((l) => l.id === laneId);
    const current = lanes.find((l) => l.id === state.playerLaneId);
    if (!target || !current || !target.isOpen || target.id === current.id) return;

    const oldWait = estimateWait(current, state.slotsFromFront);
    let newSlots = laneDepth(target);
    const baited = baitLaneSwitch(target);
    if (baited) {
      newSlots = laneDepth(target);
    }
    const newWait = estimateWait(target, newSlots);
    const regret = newWait - oldWait;

    let message = baited
      ? pickLaneSwitchBaitLine()
      : `Lane ${laneId} — ${newSlots} carts ahead.`;
    let damage = 2;

    if (!baited && regret > 2) {
      message += ' Regret index: HIGH.';
      damage = 6;
    } else if (!baited && regret < -1) {
      message += ' This line looked faster…';
      damage = 3;
    } else if (!baited) {
      message += ` ${pickLaneSwitchRegretLine()}`;
    } else {
      damage = 5;
    }

    if (Math.random() < 0.28) {
      target.priceCheckRemaining = 5 + Math.random() * 5;
      target.priceCheckLabel = 'PRICE CHECK';
      prevPriceCheckRemaining.set(target.id, target.priceCheckRemaining);
      message = pickPriceCheckLine();
      damage = 8;
      newSlots = laneDepth(target);
    }

    applyCheckoutDamage(damage, message, regret > 2 || baited ? 0.85 : 0.55);

    // Snap the cart to the target lane's X so the physical position matches the sim
    const targetLaneIdx = CHECKOUT_LANE_IDS.indexOf(laneId as typeof CHECKOUT_LANE_IDS[number]);
    if (targetLaneIdx !== -1) {
      const { position, yaw } = useCartTransformStore.getState();
      useCartTransformStore.getState().requestTeleport(
        CHECKOUT_LANE_X[targetLaneIdx],
        position.z,
        yaw,
      );
    }

    set({
      lanes,
      playerLaneId: laneId,
      slotsFromFront: newSlots,
      switchCooldown: 4,
      laneSwitchCount: state.laneSwitchCount + 1,
      lastEvent: message,
    });
  },

  tick: (dt, px, pz) => {
    if (useGameStore.getState().phase !== 'CHECKOUT') return;
    if (useGameStore.getState().checkoutWon) return;
    if (!isInCheckoutApproach(px, pz)) return;

    const state = get();
    if (state.lanes.length === 0) return;

    const lanes = state.lanes.map((l) => ({ ...l }));
    let { playerLaneId, slotsFromFront, beingServed, serveRemaining, switchCooldown, lastEvent, laneSwitchCount } =
      state;
    let laneEventCooldown = state.laneEventCooldown - dt;
    let rushCooldown = state.rushCooldown - dt;
    const advanceAnim: Record<string, number> = { ...state.laneAdvanceAnim };
    const ANIM_SPEED = 1 / 0.65; // fully advance in 0.65s
    for (const id of Object.keys(advanceAnim)) {
      advanceAnim[id] = Math.min(1, (advanceAnim[id] ?? 1) + dt * ANIM_SPEED);
    }

    if (rushCooldown <= 0 && !beingServed) {
      rushRandomLanes(lanes, 2 + Math.floor(Math.random() * 2));
      lastEvent = pickRushHourLine();
      rushCooldown = 14 + Math.random() * 12;
    }

    for (const lane of lanes) {
      const prevPc = prevPriceCheckRemaining.get(lane.id) ?? 0;
      if (lane.priceCheckRemaining > 0 && prevPc <= 0 && lane.id === playerLaneId && slotsFromFront <= 1) {
        const isDispute = lane.priceCheckLabel === 'COUPON DISPUTE';
        const line = isDispute ? pickCouponDisputeLine() : pickPriceCheckLine();
        const spike = isDispute ? COUPON_DISPUTE_SPIKE : PRICE_CHECK_SPIKE;
        applyCheckoutDamage(spike, line, 0.9);
        lastEvent = line;
      }
      prevPriceCheckRemaining.set(lane.id, lane.priceCheckRemaining);

      if (!lane.isOpen || (beingServed && lane.id === playerLaneId)) continue;

      // Coupon dispute timer (uses priceCheckRemaining slot for display)
      if (lane.couponDisputeRemaining > 0) {
        lane.couponDisputeRemaining = Math.max(0, lane.couponDisputeRemaining - dt);
        lane.priceCheckRemaining = lane.couponDisputeRemaining; // drive the busy indicator
        if (lane.couponDisputeRemaining === 0) {
          lane.priceCheckRemaining = 0;
          lane.priceCheckLabel = null;
          if (lane.customersAhead > 0) {
            startTransaction(lane);
          }
        }
        continue;
      }

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
          slotsFromFront = finishRegisterTransaction(lane, playerLaneId, slotsFromFront, advanceAnim);
        }
        continue;
      }

      if (lane.customersAhead > 0 && !isRegisterBusy(lane)) {
        startTransaction(lane);
      }
    }

    if (laneEventCooldown <= 0 && !beingServed) {
      const closedMsg = maybeCloseLane(lanes, playerLaneId);
      if (closedMsg) {
        lastEvent = closedMsg;
        laneEventCooldown = 22 + Math.random() * 18;
      } else {
        laneEventCooldown = 12 + Math.random() * 8;
      }
    }

    const myLane = lanes.find((l) => l.id === playerLaneId);
    const priceCheckOnPlayerLane = Boolean(myLane?.isOpen && (myLane.priceCheckRemaining ?? 0) > 0);

    if (myLane?.isOpen && !beingServed && slotsFromFront === 0 && !isRegisterBusy(myLane)) {
      beingServed = true;
      const haulPenalty = usePlayerStore.getState().inventory.items.length * 0.35;
      const switchPenalty = laneSwitchCount * 0.45;
      serveRemaining = (3.4 + haulPenalty + switchPenalty) / myLane.cashierSpeed;
      lastEvent = 'Cashier scanning your absurd haul…';
    }

    let stressDrainPerSec = 0;
    let stressReason: string | null = null;

    if (beingServed) {
      serveRemaining = Math.max(0, serveRemaining - dt);
      const scanDrain = 0.45 * dt;
      usePlayerStore.getState().damageMentalHealth(scanDrain);
      stressDrainPerSec = 0.45;
      stressReason = 'Item-by-item judgment';
      if (serveRemaining === 0) {
        useGameStore.setState({ checkoutWon: true });
        useUIStore.setState({
          lastCollisionMessage: 'Transaction complete. Receipt spiritually $847.',
          healFlash: 1,
          bumpFlash: 0,
        });
        window.setTimeout(() => useUIStore.setState({ healFlash: 0 }), 800);
      }
    } else if (myLane?.isOpen) {
      stressDrainPerSec = checkoutStressDrain(slotsFromFront, priceCheckOnPlayerLane);
      stressReason = checkoutStressReason(slotsFromFront, priceCheckOnPlayerLane);
      usePlayerStore.getState().damageMentalHealth(stressDrainPerSec * dt);
      if (usePlayerStore.getState().mentalHealth <= 0) {
        useGameStore.getState().triggerNervousBreakdown();
        useUIStore.setState({
          lastCollisionMessage: 'Nervous breakdown at checkout. Membership emotionally revoked.',
        });
      }
    } else if (myLane && !myLane.isOpen) {
      stressDrainPerSec = 3.5;
      stressReason = 'Your lane is CLOSED';
      usePlayerStore.getState().damageMentalHealth(stressDrainPerSec * dt);
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
      stressDrainPerSec,
      stressReason,
      priceCheckOnPlayerLane,
      laneEventCooldown,
      rushCooldown,
      laneSwitchCount,
      laneAdvanceAnim: advanceAnim,
    });
  },

  reset: () => {
    prevPriceCheckRemaining.clear();
    set({
      lanes: [],
      playerLaneId: null,
      slotsFromFront: 0,
      beingServed: false,
      serveRemaining: 0,
      switchCooldown: 0,
      lastEvent: null,
      stressDrainPerSec: 0,
      stressReason: null,
      priceCheckOnPlayerLane: false,
      laneEventCooldown: 24,
      rushCooldown: 18,
      laneSwitchCount: 0,
      laneAdvanceAnim: {},
    });
  },
}));
