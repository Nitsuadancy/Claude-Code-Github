import type { CategoryId, Restaurant } from '@/types';

import { LICENSED_BOOST } from './kitchen-kind';
import { takingOrders } from './ordering';

export type SortOption = 'recommended' | 'rating' | 'newest' | 'name';

export interface BrowseFilters {
  query: string;
  category: CategoryId | null;
  cuisines: string[];
  minRating: number | null;
  offersOnly: boolean;
  newOnly: boolean;
  openNow: boolean;
  sort: SortOption;
}

export const DEFAULT_FILTERS: BrowseFilters = {
  query: '',
  category: null,
  cuisines: [],
  minRating: null,
  offersOnly: false,
  newOnly: false,
  openNow: false,
  sort: 'recommended',
};

/** A kitchen counts as "new" for this many days after it joins. */
export const NEW_WINDOW_DAYS = 30;

/** "Italian • Continental" -> ["Italian", "Continental"] */
export function cuisineTags(restaurant: Restaurant): string[] {
  return restaurant.cuisine
    .split('•')
    .map((s) => s.trim())
    .filter(Boolean);
}

export function isNew(restaurant: Restaurant, now: Date): boolean {
  const ageMs = now.getTime() - new Date(restaurant.createdAt).getTime();
  return ageMs >= 0 && ageMs <= NEW_WINDOW_DAYS * 24 * 60 * 60 * 1000;
}

function matchesQuery(restaurant: Restaurant, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const haystack = [
    restaurant.name,
    restaurant.chefName,
    restaurant.cuisine,
    ...restaurant.menu.map((m) => m.name),
  ]
    .join(' ')
    .toLowerCase();
  return haystack.includes(q);
}

export function browseRestaurants(
  restaurants: Restaurant[],
  filters: BrowseFilters,
  now: Date,
): Restaurant[] {
  const result = restaurants.filter((r) => {
    if (r.status !== 'live') return false;
    if (!matchesQuery(r, filters.query)) return false;
    if (filters.category && !r.categories.includes(filters.category)) return false;
    if (filters.cuisines.length > 0) {
      const tags = cuisineTags(r);
      if (!filters.cuisines.some((c) => tags.includes(c))) return false;
    }
    if (filters.minRating !== null && r.rating < filters.minRating) return false;
    if (filters.offersOnly && !r.hasOffer) return false;
    if (filters.newOnly && !isNew(r, now)) return false;
    if (filters.openNow && !takingOrders(r, now)) return false;
    return true;
  });

  const byName = (a: Restaurant, b: Restaurant) => a.name.localeCompare(b.name);
  switch (filters.sort) {
    case 'rating':
      return result.sort((a, b) => b.rating - a.rating || byName(a, b));
    case 'newest':
      return result.sort((a, b) => b.createdAt.localeCompare(a.createdAt) || byName(a, b));
    case 'name':
      return result.sort(byName);
    case 'recommended':
    default:
      // Weighted rating so a 5.0 from two reviews doesn't outrank a 4.8 from two hundred.
      return result.sort((a, b) => score(b) - score(a) || byName(a, b));
  }
}

function score(r: Restaurant): number {
  const prior = 4.0;
  const weight = 20;
  const rating = (r.rating * r.ratingCount + prior * weight) / (r.ratingCount + weight);
  // Licensed kitchens get a small lift, so the home page leads with them.
  return rating + (r.licensed ? LICENSED_BOOST : 0);
}

export function allCuisineTags(restaurants: Restaurant[]): string[] {
  const set = new Set<string>();
  for (const r of restaurants) if (r.status === 'live') cuisineTags(r).forEach((t) => set.add(t));
  return [...set].sort();
}
