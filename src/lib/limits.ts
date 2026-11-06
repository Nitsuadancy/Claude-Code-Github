import type { MenuItem, Order } from '@/types';

import { endedWithoutSale } from './orders';

function sameLocalDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
  );
}

/** The day the kitchen cooks an order: its scheduled time, or when it was placed. */
export function fulfilmentDate(order: Order): Date {
  return new Date(order.scheduledFor ?? order.createdAt);
}

/**
 * How many of a dish a kitchen has committed to on the day of `now`
 * (declined orders don't count; scheduled orders count on their day).
 */
export function soldToday(orders: Order[], restaurantId: string, itemId: string, now: Date): number {
  let sold = 0;
  for (const order of orders) {
    if (order.restaurantId !== restaurantId || endedWithoutSale(order.status)) continue;
    if (!sameLocalDay(fulfilmentDate(order), now)) continue;
    for (const line of order.lines) if (line.itemId === itemId) sold += line.quantity;
  }
  return sold;
}

/** Portions still available today, or null when the dish has no daily limit. */
export function remainingToday(
  item: MenuItem,
  orders: Order[],
  restaurantId: string,
  now: Date,
): number | null {
  if (item.dailyLimit === null) return null;
  return Math.max(0, item.dailyLimit - soldToday(orders, restaurantId, item.id, now));
}

/** Show the count once stock is low enough to matter to the customer. */
export const LOW_STOCK_THRESHOLD = 5;

export function stockLabel(remaining: number | null): string | null {
  if (remaining === null) return null;
  if (remaining === 0) return 'Sold out today';
  if (remaining <= LOW_STOCK_THRESHOLD) return `Only ${remaining} left today`;
  return null;
}
