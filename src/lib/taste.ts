/**
 * "Taste": a full-screen, one-dish-at-a-time way to browse, like a feed of
 * the food itself. These helpers decide what shows and in what order.
 */
import type { MenuItem, Restaurant } from '@/types';

import { isBakeDayKitchen, takingOrders } from './ordering';
import { availableSlots } from './schedule';

export interface TasteDish {
  restaurant: Restaurant;
  item: MenuItem;
}

/** Same rule as the kitchen page: open now, an open bake day, or a pickup time to pre-order for. */
export function canOrderFrom(r: Restaurant, now: Date): boolean {
  if (takingOrders(r, now)) return true;
  return !isBakeDayKitchen(r) && availableSlots(r, now).length > 0;
}

/**
 * Every dish with a photo from kitchens you can order from. Each kitchen's
 * signature dish leads its own list, and kitchens take turns, so the feed
 * never shows five dishes from one cook in a row.
 */
export function tasteFeed(restaurants: Restaurant[], now: Date): TasteDish[] {
  const queues = restaurants
    .filter((r) => r.status !== 'draft' && canOrderFrom(r, now))
    .map((r) => {
      const dishes = r.menu.filter((m) => m.available && m.photoUri);
      dishes.sort((a, b) => Number(b.id === r.signatureItemId) - Number(a.id === r.signatureItemId));
      return dishes.map((item) => ({ restaurant: r, item }));
    })
    .filter((q) => q.length > 0);
  const feed: TasteDish[] = [];
  for (let round = 0; queues.some((q) => q.length > round); round++) {
    for (const q of queues) if (q[round]) feed.push(q[round]);
  }
  return feed;
}
