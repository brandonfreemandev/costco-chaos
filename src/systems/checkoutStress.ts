/** Satirical checkout stress copy — price checks, coupon disputes, lane chaos, queue drain. */

export const PRICE_CHECK_SPIKE = 9;
export const COUPON_DISPUTE_SPIKE = 7;

export const COUPON_DISPUTE_LINES = [
  'COUPON DISPUTE — "I printed this from 2009 — it should still work."',
  'COUPON DISPUTE — cashier summoning a supervisor from the break room.',
  'COUPON DISPUTE — "The app said 15% off. The app lied."',
  'COUPON DISPUTE — executive member insists the price is wrong on everything.',
  'COUPON DISPUTE — three coupons, two managers, one audible sigh.',
] as const;

export function pickCouponDisputeLine(): string {
  return COUPON_DISPUTE_LINES[Math.floor(Math.random() * COUPON_DISPUTE_LINES.length)];
}

export const PRICE_CHECK_LINES = [
  'PRICE CHECK — auditor squints at your rotisserie.',
  'PRICE CHECK — "Sir, this TV is not on the pallet manifest."',
  'PRICE CHECK — cashier calls a manager. You breathe manually.',
  'PRICE CHECK — someone is verifying the muffin SKU. Individually.',
  'PRICE CHECK — hold music but for your dignity.',
  'PRICE CHECK — the line behind you learns your name.',
] as const;

export const LANE_CLOSED_LINES = [
  'Lane closed — register went to find "a price" from 2019.',
  'Lane closed — cashier escaped to food court.',
  'Lane closed — corporate said "consolidate lanes."',
  'Lane closed — receipt printer achieved sentience and quit.',
] as const;

export const LANE_SWITCH_REGRET_LINES = [
  'You switched lanes. The universe noticed.',
  'New lane. Same existential dread.',
  'Lane hop detected. Costco frowns upon hope.',
] as const;

export function pickPriceCheckLine(): string {
  return PRICE_CHECK_LINES[Math.floor(Math.random() * PRICE_CHECK_LINES.length)];
}

export function pickLaneClosedLine(laneId: string): string {
  const line = LANE_CLOSED_LINES[Math.floor(Math.random() * LANE_CLOSED_LINES.length)];
  return `Lane ${laneId} ${line.replace('Lane closed — ', '')}`;
}

export const LANE_SWITCH_BAIT_LINES = [
  'You switched to the "fast" lane. A pallet family materialized behind you.',
  'Empty lane? Costco heard you thinking that.',
  'Fresh cart convoy just merged into your lane.',
  'The universe punishes lane optimists.',
] as const;

export function pickLaneSwitchBaitLine(): string {
  return LANE_SWITCH_BAIT_LINES[Math.floor(Math.random() * LANE_SWITCH_BAIT_LINES.length)];
}

export function pickLaneSwitchRegretLine(): string {
  return LANE_SWITCH_REGRET_LINES[Math.floor(Math.random() * LANE_SWITCH_REGRET_LINES.length)];
}

export const RUSH_HOUR_LINES = [
  'Rush surge — every lane just got longer.',
  'Shift change: more carts inbound on all lanes.',
  'Weekend crowd wave hits checkout.',
] as const;

export function pickRushHourLine(): string {
  return RUSH_HOUR_LINES[Math.floor(Math.random() * RUSH_HOUR_LINES.length)];
}

/** MH/sec while waiting — base + crowd + price-check panic on your lane. */
export function checkoutStressDrain(slotsFromFront: number, priceCheckOnLane: boolean): number {
  let rate = 1.1 + slotsFromFront * 0.55;
  if (priceCheckOnLane) rate += 2.8;
  if (slotsFromFront >= 3) rate += 0.9;
  return rate;
}

export function checkoutStressReason(slotsFromFront: number, priceCheckOnLane: boolean): string {
  if (priceCheckOnLane) return 'Price check on your lane';
  if (slotsFromFront >= 3) return 'Deep queue — cart claustrophobia';
  if (slotsFromFront > 0) return `${slotsFromFront} cart${slotsFromFront > 1 ? 's' : ''} ahead`;
  return 'At register — almost free (lie)';
}
