import type { CraftIconName } from '@/components/craft-icon';
import type { CategoryId, DietaryTag, Restaurant } from '@/types';

/**
 * Editorial collections on the Foodie home screen. Each one is a rule over
 * kitchens' categories and dishes, so new chefs appear automatically.
 */
export interface Collection {
  id: string;
  title: string;
  tagline: string;
  icon: CraftIconName;
  categories?: CategoryId[];
  dietary?: DietaryTag[];
}

export const COLLECTIONS: Collection[] = [
  {
    id: 'sunday-supper',
    title: 'Sunday Supper',
    tagline: 'Slow-cooked comfort, made to share at the table.',
    icon: 'cottage',
    categories: ['cottage-kitchen'],
  },
  {
    id: 'plant-powered',
    title: 'Plant-Powered',
    tagline: 'Vegan and vegetarian cooking that tastes like a treat.',
    icon: 'vegan',
    categories: ['vegan'],
    dietary: ['vegan', 'vegetarian'],
  },
  {
    id: 'sweet-endings',
    title: 'Sweet Endings',
    tagline: 'Cobblers, cookies and cakes from neighborhood bakers.',
    icon: 'sweet',
    categories: ['bakery', 'sweet-tooth'],
  },
  {
    id: 'around-the-world',
    title: 'Around the World',
    tagline: 'Family recipes carried here from far away.',
    icon: 'global',
    categories: ['global-flavors'],
  },
  {
    id: 'after-dark',
    title: 'After Dark',
    tagline: 'Kitchens that keep the oven on late.',
    icon: 'late-night',
    categories: ['late-night-bites'],
  },
];

/** Live kitchens in a collection: matching a category, or serving a matching dish. */
export function collectionKitchens(collection: Collection, restaurants: Restaurant[]): Restaurant[] {
  return restaurants.filter((r) => {
    if (r.status !== 'live') return false;
    if (collection.categories?.some((c) => r.categories.includes(c))) return true;
    return !!collection.dietary?.some((tag) => r.menu.some((m) => m.available && m.dietary.includes(tag)));
  });
}
