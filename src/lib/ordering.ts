import type { Restaurant } from '@/types';

import { bakeDayDate, formatCutoff, openBakeDays, upcomingBakeDays } from './bake-days';
import { dayLabel } from './schedule';
import { formatTime, isOpenAt } from './hours';

export function isBakeDayKitchen(r: Pick<Restaurant, 'orderMode'>): boolean {
  return r.orderMode === 'bake-days';
}

/** True once the chef has set valid opening and closing times. */
export function hasHours(r: Pick<Restaurant, 'openTime' | 'closeTime'>): boolean {
  const valid = (t: string) => /^\d{1,2}:\d{2}$/.test(t);
  return valid(r.openTime) && valid(r.closeTime);
}

/**
 * Whether a customer can order from this kitchen right now: during its hours,
 * or, for a bake-day kitchen, while an upcoming bake day is still open.
 */
export function takingOrders(r: Restaurant, now: Date): boolean {
  if (!r.acceptingOrders) return false;
  if (isBakeDayKitchen(r)) return openBakeDays(r, now).length > 0;
  return hasHours(r) && isOpenAt(r, now);
}

/**
 * The ordering status line: "Open · ready in ~20 min", "Opens 9:00 AM" or, for
 * bake-day kitchens, "Bake day Sat". `long` adds the date and cutoff where there's room.
 */
export function orderingLine(r: Restaurant, now: Date, { long = false } = {}): string {
  if (isBakeDayKitchen(r)) {
    const next = r.acceptingOrders ? openBakeDays(r, now)[0] : undefined;
    if (next) return long ? `Bake day ${bakeDayDate(next, now)} · ${formatCutoff(next, now)}` : `Bake day ${dayLabel(next.pickupStart, now)}`;
    const later = upcomingBakeDays(r, now)[0];
    if (!later) return 'No bake days coming up';
    return long ? `Orders closed · next bake day ${bakeDayDate(later, now)}` : 'Orders closed';
  }
  if (takingOrders(r, now)) return `Open · ready in ~${r.prepMinutes} min`;
  return hasHours(r) ? `Opens ${formatTime(r.openTime)}` : 'Hours not set';
}
