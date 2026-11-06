import type { Order, Restaurant } from '@/types';

import { isNew } from './browse';
import { type DietProfile, hasDietProfile, kitchenFits } from './diet';
import { isOpenAt } from './hours';
import { endedWithoutSale } from './orders';

export interface ForYouPick {
  restaurant: Restaurant;
  /** Why it's here, shown under the name: "You ordered here before". */
  reason: string;
}

/**
 * Personal picks for the home screen, each with the one reason it was chosen.
 * Stronger personal signals come first; ratings break ties.
 */
export function pickForYou(
  restaurants: Restaurant[],
  context: {
    customerId: string;
    orders: Order[];
    favoriteIds: string[];
    diet: DietProfile;
    neighborhood: string;
    now: Date;
  },
  limit = 6,
): ForYouPick[] {
  const ordered = new Set(
    context.orders
      .filter((o) => o.customerId === context.customerId && !endedWithoutSale(o.status))
      .map((o) => o.restaurantId),
  );
  const ranked = restaurants
    .filter((r) => r.status === 'live')
    .map((r) => {
      const open = r.acceptingOrders && isOpenAt(r, context.now);
      if (context.favoriteIds.includes(r.id)) {
        return { r, score: 6, reason: open ? 'One of your favorites, open now' : 'One of your favorites' };
      }
      if (ordered.has(r.id)) return { r, score: 5, reason: 'You ordered here before' };
      if (hasDietProfile(context.diet) && kitchenFits(r, context.diet)) return { r, score: 4, reason: 'Fits your diet' };
      if (context.neighborhood && r.neighborhood === context.neighborhood) {
        return { r, score: 3, reason: `In ${r.neighborhood}` };
      }
      if (isNew(r, context.now)) return { r, score: 2, reason: 'New to Manna' };
      if (open) return { r, score: 1, reason: `Open now · ready in ~${r.prepMinutes} min` };
      return { r, score: 0, reason: r.ratingCount ? `Loved by neighbors · ${r.rating.toFixed(1)}` : 'Worth a try' };
    })
    .sort((a, b) => b.score - a.score || b.r.rating - a.r.rating);
  return ranked.slice(0, limit).map(({ r, reason }) => ({ restaurant: r, reason }));
}
