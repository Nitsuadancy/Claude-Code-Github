import type { CraftIconName } from '@/components/craft-icon';
import type { CategoryId } from '@/types';

export interface Category {
  id: CategoryId;
  label: string;
  icon: CraftIconName;
}

/** The seven crafts on the Foodie home screen, each with its own drawn icon. */
export const CATEGORIES: Category[] = [
  { id: 'vegan', label: 'Vegan', icon: 'vegan' },
  { id: 'cottage-kitchen', label: 'Cottage', icon: 'cottage' },
  { id: 'global-flavors', label: 'Global', icon: 'global' },
  { id: 'bakery', label: 'Bakery', icon: 'bakery' },
  { id: 'breakfast-preppers', label: 'Breakfast', icon: 'breakfast' },
  { id: 'late-night-bites', label: 'Late Night', icon: 'late-night' },
  { id: 'sweet-tooth', label: 'Sweet', icon: 'sweet' },
];

const CATEGORY_IDS = new Set<string>(CATEGORIES.map((c) => c.id));

/** True for a category Manna still offers. Older saved kitchens may carry retired ones. */
export function isCategoryId(value: string): value is CategoryId {
  return CATEGORY_IDS.has(value);
}

/** Options for the Cuisine picker during chef onboarding. */
export const CUISINES = [
  // Baking first: it's what most Manna kitchens make.
  'Bakery',
  'Desserts',
  'Breakfast',
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
  'Vegan',
  'Vietnamese',
  'Other',
];
