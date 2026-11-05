import type { Restaurant, Review } from '@/types';

/** One-tap compliments on the rating sheet. */
export const REVIEW_TAGS = [
  'Tasted like home',
  'Generous portions',
  'Packed with care',
  'Right on time',
  'Beautifully presented',
  'Will order again',
];

export const STAR_LABELS = ['', 'Not for me', 'It was okay', 'Good', 'Really good', 'Outstanding'];

/** "Ada Lovelace" -> "Ada L." so reviews never show a full name. */
export function publicName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'A neighbor';
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1].charAt(0).toUpperCase()}.`;
}

/**
 * Folds reviews written in the app into a kitchen's rating. The base
 * rating and count already include the sample reviews.
 */
export function withReviews(restaurant: Restaurant, reviews: Review[]): Restaurant {
  const mine = reviews.filter((r) => r.restaurantId === restaurant.id);
  if (mine.length === 0) return restaurant;
  const stars = mine.reduce((sum, r) => sum + r.stars, 0);
  const count = restaurant.ratingCount + mine.length;
  const rating = (restaurant.rating * restaurant.ratingCount + stars) / count;
  return { ...restaurant, rating: Math.round(rating * 10) / 10, ratingCount: count };
}

/** "3 days ago", "Today", "Yesterday", or a date for older reviews. */
export function relativeDay(iso: string, now: Date): string {
  const day = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diff = Math.round((day(now) - day(new Date(iso))) / 86_400_000);
  if (diff <= 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  if (diff < 7) return `${diff} days ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}
