import type { IconName } from '@/components/icon';
import type { CategoryId } from '@/types';

export interface Category {
  id: CategoryId;
  label: string;
  icon: IconName;
}

/** The "Fuel your Food Desire" grid on the Foodie home screen. */
export const CATEGORIES: Category[] = [
  { id: 'vegan', label: 'Vegan', icon: 'sprout' },
  { id: 'cottage-kitchen', label: 'Cottage Kitchen', icon: 'home-heart' },
  { id: 'foodie-adventures', label: 'Foodie Adventures', icon: 'map-marker-radius' },
  { id: 'bakery', label: 'Bakery', icon: 'croissant' },
  { id: 'meal-preppers', label: 'Meal Preppers', icon: 'food-takeout-box' },
  { id: 'global-flavors', label: 'Global Flavors', icon: 'earth' },
  { id: 'sweet-tooth', label: 'Sweet Tooth', icon: 'ice-cream' },
  { id: 'kids-favorites', label: 'Kids Favorites', icon: 'emoticon-happy-outline' },
  { id: 'breakfast-preppers', label: 'Breakfast Preppers', icon: 'egg-fried' },
  { id: 'late-night-bites', label: 'Late Night Bites', icon: 'weather-night' },
];

/** Options for the "Restaurant Type" dropdown during chef onboarding. */
export const CUISINES = [
  'American',
  'BBQ',
  'Caribbean',
  'Chinese',
  'Continental',
  'Ethiopian',
  'Filipino',
  'French',
  'Greek',
  'Indian',
  'Italian',
  'Jamaican',
  'Japanese',
  'Korean',
  'Mediterranean',
  'Mexican',
  'Middle Eastern',
  'Nepali',
  'Nigerian',
  'Soul Food',
  'Southern',
  'Thai',
  'Vietnamese',
  'Other',
];
