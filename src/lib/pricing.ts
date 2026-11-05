import type { Cart, MenuItem, OrderLine } from '@/types';

/** Platform service fee charged to the customer, as a fraction of the subtotal. */
export const SERVICE_FEE_RATE = 0.1;
export const DELIVERY_FEE_CENTS = 299;

export interface CartTotals {
  lines: OrderLine[];
  itemCount: number;
  subtotalCents: number;
  serviceFeeCents: number;
  deliveryFeeCents: number;
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
  const serviceFeeCents = Math.round(subtotalCents * SERVICE_FEE_RATE);
  const deliveryFeeCents = lines.length > 0 ? DELIVERY_FEE_CENTS : 0;
  return {
    lines,
    itemCount,
    subtotalCents,
    serviceFeeCents,
    deliveryFeeCents,
    totalCents: subtotalCents + serviceFeeCents + deliveryFeeCents,
  };
}

/** Tip choices at checkout, as fractions of the food subtotal. */
export const TIP_RATES = [0, 0.1, 0.15, 0.2] as const;

/** Tip in cents for a rate, rounded to the nearest 25¢ so amounts look intentional. */
export function tipFor(subtotalCents: number, rate: number): number {
  if (rate <= 0 || subtotalCents <= 0) return 0;
  return Math.max(25, Math.round((subtotalCents * rate) / 25) * 25);
}
