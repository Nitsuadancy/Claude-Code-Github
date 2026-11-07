import type { PersistedState } from '@/state/reducer';
import { isAccentId } from '@/data/accents';
import { DEFAULT_STATE } from '@/data/regions';
import { isCategoryId } from '@/data/categories';
import type { MenuItem, Order, Restaurant, UserProfile } from '@/types';

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
    // Meal Preppers, Kids Favorites and Foodie Adventures were retired.
    categories: (r.categories ?? []).filter(isCategoryId),
    neighborhood: r.neighborhood ?? '',
    founding: r.founding ?? false,
    inPerson: r.inPerson ?? [],
    accent: isAccentId(r.accent) ? r.accent : undefined,
    tagline: r.tagline ?? '',
    instagram: r.instagram ?? '',
    orderMode: r.orderMode ?? 'hours',
    state: r.state ?? DEFAULT_STATE,
    dayHours: r.dayHours ?? {},
    bakeDays: r.bakeDays ?? [],
    skippedBakeDays: r.skippedBakeDays ?? [],
    pickupInstructions: r.pickupInstructions ?? '',
    menu: (r.menu ?? []).map(normalizeMenuItem),
  };
}

/** Older orders had a 10% service fee, a delivery fee and a delivery address. */
type LegacyOrder = Order & { serviceFeeCents?: number; deliveryAddress?: string };

export function normalizeOrder(saved: Order): Order {
  const { serviceFeeCents, deliveryAddress: _address, ...o } = saved as LegacyOrder;
  return {
    ...o,
    movementFeeCents: o.movementFeeCents ?? serviceFeeCents ?? 0,
    pickupAddress: o.pickupAddress ?? '',
    statusHistory: o.statusHistory?.length ? o.statusHistory : [{ status: 'placed', at: o.createdAt }],
    chefNote: o.chefNote ?? '',
    customerNote: o.customerNote ?? '',
    estimatedReadyAt: o.estimatedReadyAt ?? estimateReadyAt(o.createdAt, DEFAULT_PREP_MINUTES),
    scheduledFor: o.scheduledFor ?? null,
  };
}

/** Foodies used to save a delivery address; now they pick a neighborhood. */
export function normalizeUser(saved: UserProfile): UserProfile {
  const { deliveryAddress: _address, ...user } = saved as UserProfile & { deliveryAddress?: string };
  return { ...user, neighborhood: user.neighborhood ?? '' };
}

export function normalizePersisted(saved: Partial<PersistedState> | null): Partial<PersistedState> | null {
  if (!saved) return saved;
  const out: Partial<PersistedState> = {
    ...saved,
    reviews: saved.reviews ?? [],
    recentSearches: saved.recentSearches ?? [],
    reportedReviewIds: saved.reportedReviewIds ?? [],
    sharedSteps: saved.sharedSteps ?? [],
    proInterestAt: saved.proInterestAt ?? null,
    messages: saved.messages ?? [],
    chatReadAt: saved.chatReadAt ?? {},
    reportedMessageIds: saved.reportedMessageIds ?? [],
    blocks: saved.blocks ?? [],
  };
  // Only touch sections that were saved, so a missing one keeps the app's default instead of becoming undefined.
  if (saved.user) out.user = normalizeUser(saved.user);
  if (saved.restaurants) out.restaurants = saved.restaurants.map(normalizeRestaurant);
  if (saved.orders) out.orders = saved.orders.map(normalizeOrder);
  for (const key of Object.keys(out) as (keyof PersistedState)[]) {
    if (out[key] === undefined) delete out[key];
  }
  return out;
}
