import { confirmAction } from '@/lib/alert';
import * as haptics from '@/lib/haptics';
import { remainingToday } from '@/lib/limits';
import type { MenuItem, Restaurant } from '@/types';

import { useStore } from './store';

/**
 * Adding a dish to the cart, the same way everywhere: it respects the dish's
 * daily limit, and if the cart holds food from another kitchen it asks
 * before starting a new one (orders come from one kitchen at a time).
 */
export function useAddToCart() {
  const { state, dispatch } = useStore();

  const quantity = (restaurantId: string, itemId: string) =>
    state.cart.restaurantId === restaurantId
      ? (state.cart.lines.find((l) => l.itemId === itemId)?.quantity ?? 0)
      : 0;

  const remaining = (restaurant: Restaurant, item: MenuItem, now = new Date()) =>
    remainingToday(item, state.orders, restaurant.id, now);

  const add = (restaurant: Restaurant, item: MenuItem, now = new Date()) => {
    const left = remaining(restaurant, item, now);
    if (left !== null && quantity(restaurant.id, item.id) >= left) {
      haptics.warning();
      return;
    }
    const doAdd = () => {
      haptics.tap();
      dispatch({ type: 'addToCart', restaurantId: restaurant.id, itemId: item.id, max: left });
    };
    const otherKitchen = state.cart.restaurantId && state.cart.restaurantId !== restaurant.id && state.cart.lines.length;
    if (otherKitchen) {
      confirmAction(
        'Start a new cart?',
        'Your cart has food from another kitchen. Orders come from one kitchen at a time.',
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
