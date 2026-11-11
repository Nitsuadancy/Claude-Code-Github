import { confirmAction } from '@/lib/alert';
import * as haptics from '@/lib/haptics';
import { remainingToday } from '@/lib/limits';
import type { Drop, MenuItem, Restaurant } from '@/types';

import { useStore } from './store';

/**
 * Adding a dish to the cart, the same way everywhere: it respects the dish's
 * daily limit, and if the cart holds food from another kitchen it asks
 * before starting a new one (orders come from one kitchen at a time).
 */
export function useAddToCart() {
  const { state, dispatch } = useStore();

  const sameCart = (restaurantId: string, drop?: Drop) =>
    state.cart.restaurantId === restaurantId && (state.cart.dropId ?? null) === (drop?.id ?? null);

  const quantity = (restaurantId: string, itemId: string, drop?: Drop) =>
    sameCart(restaurantId, drop) ? (state.cart.lines.find((l) => l.itemId === itemId)?.quantity ?? 0) : 0;

  /** Portions left for the day it'll be cooked: today, or the drop's pickup day. */
  const remaining = (restaurant: Restaurant, item: MenuItem, now = new Date(), drop?: Drop) =>
    remainingToday(item, state.orders, restaurant.id, drop ? new Date(drop.pickupStart) : now);

  const add = (restaurant: Restaurant, item: MenuItem, now = new Date(), drop?: Drop) => {
    const left = remaining(restaurant, item, now, drop);
    if (left !== null && quantity(restaurant.id, item.id, drop) >= left) {
      haptics.warning();
      return;
    }
    const doAdd = () => {
      haptics.tap();
      dispatch({ type: 'addToCart', restaurantId: restaurant.id, itemId: item.id, max: left, dropId: drop?.id });
    };
    if (state.cart.restaurantId && state.cart.lines.length && !sameCart(restaurant.id, drop)) {
      const otherKitchen = state.cart.restaurantId !== restaurant.id;
      confirmAction(
        'Start a new cart?',
        otherKitchen
          ? 'Your cart has food from another kitchen. Orders come from one kitchen at a time.'
          : 'Drops are picked up on their own day, so they’re ordered separately from the everyday menu.',
        'Start new cart',
        doAdd,
        'Keep cart',
      );
      return;
    }
    doAdd();
  };

  return { add, quantity, remaining };
}
