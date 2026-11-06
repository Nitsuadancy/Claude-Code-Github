import type { Restaurant } from '@/types';

import { isOpenAt } from './hours';

export const SLOT_MINUTES = 30;

/**
 * Times a customer can schedule an order for: every half hour while the
 * kitchen is open, starting once there's enough time to cook, for the next
 * `days` days (today included). Returns ISO strings, soonest first.
 */
export function availableSlots(restaurant: Restaurant, now: Date, days = 2): string[] {
  if (!restaurant.acceptingOrders) return [];
  const earliest = now.getTime() + restaurant.prepMinutes * 60_000;
  // Start at the first half hour after the earliest possible ready time.
  const start = new Date(earliest);
  start.setSeconds(0, 0);
  const extra = (SLOT_MINUTES - (start.getMinutes() % SLOT_MINUTES)) % SLOT_MINUTES;
  start.setMinutes(start.getMinutes() + extra);

  const endOfRange = new Date(now.getFullYear(), now.getMonth(), now.getDate() + days);
  const slots: string[] = [];
  for (let t = start.getTime(); t < endOfRange.getTime(); t += SLOT_MINUTES * 60_000) {
    if (isOpenAt(restaurant, new Date(t))) slots.push(new Date(t).toISOString());
  }
  return slots;
}

/** "Today", "Tomorrow" or "Fri" for grouping slots. */
export function dayLabel(iso: string, now: Date): string {
  const d = new Date(iso);
  const day = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((day(d) - day(now)) / 86_400_000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  return d.toLocaleDateString(undefined, { weekday: 'short' });
}

/** "Today, 6:30 PM" */
export function formatSlot(iso: string, now: Date): string {
  const time = new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  return `${dayLabel(iso, now)}, ${time}`;
}

/** "Pickup Sat, 9:00 AM – 12:00 PM" for a window, or "Pickup Today, 6:30 PM" for a set time. */
export function formatPickup(scheduledFor: string, pickupBy: string | undefined, now: Date): string {
  if (!pickupBy) return `Pickup ${formatSlot(scheduledFor, now)}`;
  const end = new Date(pickupBy).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  return `Pickup ${formatSlot(scheduledFor, now)} – ${end}`;
}
