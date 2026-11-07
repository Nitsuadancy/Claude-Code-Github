import type { Cart, MenuItem, OrderLine } from '@/types';

/**
 * Manna's only fee: 8% of the food subtotal, at least $1, paid by the
 * customer. Card processing comes out of it, so kitchens keep 100% of their
 * menu prices. Orders are picked up, so there is no delivery fee.
 * Mirrors movement_fee() in the database.
 */
export const MOVEMENT_FEE_RATE = 0.08;
export const MOVEMENT_FEE_MIN_CENTS = 100;

export function movementFee(subtotalCents: number): number {
  if (subtotalCents <= 0) return 0;
  return Math.max(Math.round(subtotalCents * MOVEMENT_FEE_RATE), MOVEMENT_FEE_MIN_CENTS);
}

/** "8%, at least $1", for checkout and the terms. */
export const MOVEMENT_FEE_TERMS = '8% of the food subtotal, at least $1';

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
