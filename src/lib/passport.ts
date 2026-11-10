/**
 * The neighborhood passport: a stamp for every kitchen you've picked up from,
 * so trying a second and third cook feels like collecting, not switching.
 */
import type { Order } from '@/types';

export interface Stamp {
  restaurantId: string;
  restaurantName: string;
  /** When you first picked up from this kitchen. */
  firstPickupAt: string;
  pickups: number;
}

function pickedUpAt(order: Order): string {
  return [...order.statusHistory].reverse().find((h) => h.status === 'completed')?.at ?? order.createdAt;
}

/** One stamp per kitchen with a picked-up order, in the order you earned them. */
export function passportStamps(orders: Order[], customerId: string): Stamp[] {
  const stamps = new Map<string, Stamp>();
  for (const o of orders) {
    if (o.customerId !== customerId || o.status !== 'completed') continue;
    const at = pickedUpAt(o);
    const s = stamps.get(o.restaurantId);
    if (!s) stamps.set(o.restaurantId, { restaurantId: o.restaurantId, restaurantName: o.restaurantName, firstPickupAt: at, pickups: 1 });
    else stamps.set(o.restaurantId, { ...s, pickups: s.pickups + 1, firstPickupAt: at < s.firstPickupAt ? at : s.firstPickupAt });
  }
  return [...stamps.values()].sort((a, b) => a.firstPickupAt.localeCompare(b.firstPickupAt));
}

/**
 * If this picked-up order earned a new stamp, its place in the passport
 * (1 for the first kitchen ever); otherwise null.
 */
export function newStampNumber(order: Order, orders: Order[]): number | null {
  if (order.status !== 'completed') return null;
  const stamps = passportStamps(orders, order.customerId);
  const index = stamps.findIndex((s) => s.restaurantId === order.restaurantId);
  if (index < 0) return null;
  const firstOrderHere = orders
    .filter((o) => o.customerId === order.customerId && o.restaurantId === order.restaurantId && o.status === 'completed')
    .sort((a, b) => pickedUpAt(a).localeCompare(pickedUpAt(b)))[0];
  return firstOrderHere?.id === order.id ? index + 1 : null;
}

/** 1 → "1st", 2 → "2nd", 11 → "11th", 23 → "23rd". */
export function ordinal(n: number): string {
  const teen = n % 100 >= 11 && n % 100 <= 13;
  const suffix = teen ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' } as Record<number, string>)[n % 10] ?? 'th';
  return `${n}${suffix}`;
}

/** A small, steady tilt per kitchen, so stamps look pressed by hand. */
export function stampTilt(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return (Math.abs(h) % 15) - 7;
}
