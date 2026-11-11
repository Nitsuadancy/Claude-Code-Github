/**
 * Money rules shared by the payment functions. Plain TypeScript with no Deno
 * APIs, so the app's tests check it too (src/__tests__/payments.test.ts).
 */

export interface OrderAmounts {
  subtotal_cents: number;
  discount_cents: number;
  movement_fee_cents: number;
  kitchen_fee_cents: number;
  tip_cents: number;
  total_cents: number;
}

/** What Manna keeps from a charge: the customer's movement fee and the kitchen fee. Card fees come out of it. */
export function applicationFeeCents(o: OrderAmounts): number {
  return o.movement_fee_cents + o.kitchen_fee_cents;
}

/** What reaches the cook: the food less any discount code, plus the whole tip, less the kitchen fee. */
export function cookTransferCents(o: OrderAmounts): number {
  return o.total_cents - applicationFeeCents(o);
}

/** The charge must add up before Stripe sees it. */
export function checkAmounts(o: OrderAmounts): string | null {
  if (o.total_cents !== o.subtotal_cents - o.discount_cents + o.movement_fee_cents + o.tip_cents) {
    return 'The order total doesn’t add up.';
  }
  if (o.total_cents < 50) return 'The order total is too small to charge.';
  if (cookTransferCents(o) < 0) return 'The fees are larger than the order.';
  return null;
}

/** Orders that are refunded in full: declined by the kitchen, or cancelled before it accepted. */
export function refundsInFull(status: string): boolean {
  return status === 'declined' || status === 'cancelled';
}

export type PlanName = 'monthly' | 'yearly';

/** Which plan a Stripe price is, from the two price ids set as secrets. */
export function planForPrice(priceId: string, prices: { monthly?: string; yearly?: string }): PlanName | null {
  if (priceId && priceId === prices.monthly) return 'monthly';
  if (priceId && priceId === prices.yearly) return 'yearly';
  return null;
}

/**
 * The Pro columns for a kitchen from a Stripe subscription. A subscription
 * set to end at its period's end counts as canceled now; Pro stays on until
 * then (has_pro() in the database works the date out).
 */
export function proColumns(sub: {
  status: string;
  created: number;
  start_date: number;
  trial_end: number | null;
  cancel_at_period_end: boolean;
  canceled_at: number | null;
  ended_at: number | null;
  plan: PlanName;
}): { pro_plan: PlanName; pro_started_at: string; pro_billing_starts_at: string; pro_canceled_at: string | null } {
  const iso = (s: number) => new Date(s * 1000).toISOString();
  const canceled =
    sub.status === 'canceled' || sub.cancel_at_period_end
      ? iso(sub.canceled_at ?? sub.ended_at ?? Math.floor(Date.now() / 1000))
      : null;
  return {
    pro_plan: sub.plan,
    pro_started_at: iso(sub.created),
    pro_billing_starts_at: iso(sub.trial_end ?? sub.start_date),
    pro_canceled_at: canceled,
  };
}

/** Founding kitchens get their first 3 months of Pro free (has_pro() in the database). */
export const FOUNDING_PRO_FREE_MONTHS = 3;

/**
 * When a new Pro subscription's first charge should land, as Stripe's unix
 * seconds, or null to charge today. A founding kitchen still inside its free
 * months starts paying when they end. Stripe needs a trial to end at least
 * two days out, so a free stretch shorter than that is simply charged today.
 */
export function proTrialEnd(kitchen: { founding: boolean; live_since: string | null; created_at: string }, now: Date): number | null {
  if (!kitchen.founding) return null;
  const end = new Date(kitchen.live_since ?? kitchen.created_at);
  end.setUTCMonth(end.getUTCMonth() + FOUNDING_PRO_FREE_MONTHS);
  if (end.getTime() - now.getTime() < 2 * 24 * 60 * 60 * 1000) return null;
  return Math.floor(end.getTime() / 1000);
}

/** Subscriptions that never got going (first payment never went through) don't touch the kitchen. */
export function subscriptionStarted(status: string): boolean {
  return status !== 'incomplete' && status !== 'incomplete_expired';
}

/** A connected account is ready once Stripe lets it take charges and pay out. */
export function payoutsReady(account: { charges_enabled: boolean; payouts_enabled: boolean }): boolean {
  return account.charges_enabled && account.payouts_enabled;
}
