import type { PersistedState } from '@/state/reducer';
import type { MenuItem, Order, Restaurant } from '@/types';

import { estimateReadyAt } from './orders';

/**
 * Saved data from older app versions may be missing newer fields. These fill
 * them with safe defaults so the app never crashes on an old device state.
 */
export const DEFAULT_PREP_MINUTES = 30;

export function normalizeMenuItem(item: Partial<MenuItem> & Pick<MenuItem, 'id'>): MenuItem {
  return {
    name: '',
    description: '',
    priceCents: 0,
    available: true,
    ...item,
    dietary: item.dietary ?? [],
    allergens: item.allergens ?? [],
    dailyLimit: item.dailyLimit ?? null,
  };
}

export function normalizeRestaurant(r: Restaurant): Restaurant {
  return {
    ...r,
    chefBio: r.chefBio ?? '',
    verified: r.verified ?? false,
    prepMinutes: r.prepMinutes ?? DEFAULT_PREP_MINUTES,
    menu: (r.menu ?? []).map(normalizeMenuItem),
  };
}

export function normalizeOrder(o: Order): Order {
  return {
    ...o,
    statusHistory: o.statusHistory?.length ? o.statusHistory : [{ status: 'placed', at: o.createdAt }],
    chefNote: o.chefNote ?? '',
    customerNote: o.customerNote ?? '',
    estimatedReadyAt: o.estimatedReadyAt ?? estimateReadyAt(o.createdAt, DEFAULT_PREP_MINUTES),
    scheduledFor: o.scheduledFor ?? null,
  };
}

export function normalizePersisted(saved: Partial<PersistedState> | null): Partial<PersistedState> | null {
  if (!saved) return saved;
  return {
    ...saved,
    restaurants: saved.restaurants?.map(normalizeRestaurant),
    orders: saved.orders?.map(normalizeOrder),
    reviews: saved.reviews ?? [],
    recentSearches: saved.recentSearches ?? [],
  };
}
