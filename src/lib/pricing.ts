import { formatMonthDay } from './orders';
import type { Cart, MenuItem, Order, OrderLine, Restaurant } from '@/types';

/**
 * Manna's fees. Customers pay a movement fee at checkout (10% of the food,
 * at least $1.50), and kitchens pay 5% of their food sales. Tips are never
 * charged: every cent goes to the kitchen. Card processing comes out of
 * Manna's share, and orders are picked up, so there is no delivery fee.
 * Mirrors movement_fee() and kitchen_fee_rate() in the database.
 */
export const MOVEMENT_FEE_RATE = 0.1;
export const MOVEMENT_FEE_MIN_CENTS = 150;

export function movementFee(subtotalCents: number): number {
  if (subtotalCents <= 0) return 0;
  return Math.max(Math.round(subtotalCents * MOVEMENT_FEE_RATE), MOVEMENT_FEE_MIN_CENTS);
}

/** "10%, at least $1.50", for checkout and the terms. */
export const MOVEMENT_FEE_TERMS = '10% of the food subtotal, at least $1.50';

/** Manna's share of a kitchen's food sales. */
export const KITCHEN_FEE_RATE = 0.05;
/** Founding kitchens pay no kitchen fee for their first months on Manna. */
export const FOUNDING_FEE_FREE_MONTHS = 3;

/** "5% of food sales", for the cook's screens and the terms. */
export const KITCHEN_FEE_TERMS = '5% of food sales';

type FeeKitchen = Pick<Restaurant, 'founding' | 'createdAt' | 'feeCreditUntil'>;

/**
 * When a kitchen starts paying the kitchen fee: the later of a founding
 * kitchen's first months and any fee-free months earned from invites, or
 * null if neither applies.
 */
export function feeFreeUntil(r: FeeKitchen): Date | null {
  let until: Date | null = null;
  if (r.founding) {
    until = new Date(r.createdAt);
    until.setUTCMonth(until.getUTCMonth() + FOUNDING_FEE_FREE_MONTHS);
  }
  if (r.feeCreditUntil) {
    const credit = new Date(r.feeCreditUntil);
    if (!until || credit > until) until = credit;
  }
  return until;
}

/** The kitchen fee rate for an order placed at `at`. */
export function kitchenFeeRate(r: FeeKitchen, at: Date): number {
  const until = feeFreeUntil(r);
  return until && at < until ? 0 : KITCHEN_FEE_RATE;
}

export function kitchenFee(subtotalCents: number, rate: number): number {
  if (subtotalCents <= 0 || rate <= 0) return 0;
  return Math.round(subtotalCents * rate);
}

/** How the kitchen fee applies to this kitchen right now, in a line for the cook. */
export function kitchenFeeNote(r: FeeKitchen, now: Date): string {
  const until = feeFreeUntil(r);
  if (until && now < until) {
    const credit = r.feeCreditUntil && until.getTime() === new Date(r.feeCreditUntil).getTime();
    return `${credit ? 'With your invite rewards' : 'As a founding kitchen'}, you pay no Manna fee until ${formatMonthDay(until.toISOString())}. After that, Manna keeps ${KITCHEN_FEE_TERMS}. Tips are always yours.`;
  }
  return `Shown after Manna’s ${KITCHEN_FEE_TERMS}. Tips are always yours.`;
}

/**
 * What the kitchen receives for an order: the food (less any discount code
 * it offered) and the tip, less the kitchen fee.
 */
export function kitchenPayout(
  order: Pick<Order, 'subtotalCents' | 'tipCents' | 'kitchenFeeCents' | 'discountCents'>,
): number {
  return order.subtotalCents - (order.discountCents ?? 0) + (order.tipCents ?? 0) - (order.kitchenFeeCents ?? 0);
}

export interface CartTotals {
  lines: OrderLine[];
  itemCount: number;
  subtotalCents: number;
  movementFeeCents: number;
  totalCents: number;
}

/** Resolves cart lines against a menu, dropping items that no longer exist or are unavailable. */
export function computeCartTotals(cart: Cart, menu: MenuItem[]): CartTotals {
  const byId = new Map(menu.map((item) => [item.id, item]));
  const lines: OrderLine[] = [];
  for (const line of cart.lines) {
    const item = byId.get(line.itemId);
    if (!item || !item.available || line.quantity <= 0) continue;
    lines.push({
      itemId: item.id,
      name: item.name,
      priceCents: item.priceCents,
      quantity: line.quantity,
    });
  }
  const subtotalCents = lines.reduce((sum, l) => sum + l.priceCents * l.quantity, 0);
  const itemCount = lines.reduce((sum, l) => sum + l.quantity, 0);
  const movementFeeCents = movementFee(subtotalCents);
  return {
    lines,
    itemCount,
    subtotalCents,
    movementFeeCents,
    totalCents: subtotalCents + movementFeeCents,
  };
}

/** Tip choices at checkout, as fractions of the food subtotal. */
export const TIP_RATES = [0, 0.1, 0.15, 0.2] as const;

/** Tip in cents for a rate, rounded to the nearest 25¢ so amounts look intentional. */
export function tipFor(subtotalCents: number, rate: number): number {
  if (rate <= 0 || subtotalCents <= 0) return 0;
  return Math.max(25, Math.round((subtotalCents * rate) / 25) * 25);
}
