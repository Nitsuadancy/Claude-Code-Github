import type { Allergen, DietaryTag, MenuItem, Restaurant } from '@/types';

import { ALLERGENS } from './dietary';

export interface DietProfile {
  dietary: DietaryTag[];
  avoid: Allergen[];
}

export function hasDietProfile(profile: DietProfile): boolean {
  return profile.dietary.length > 0 || profile.avoid.length > 0;
}

/** Allergens in a dish that the customer avoids. */
export function allergenConflicts(item: MenuItem, avoid: Allergen[]): Allergen[] {
  return item.allergens.filter((a) => avoid.includes(a));
}

/** Tags a dish effectively has: vegan dishes are also vegetarian and dairy-free. */
export function effectiveDietary(item: MenuItem): DietaryTag[] {
  const tags = new Set(item.dietary);
  if (tags.has('vegan')) {
    tags.add('vegetarian');
    tags.add('dairy-free');
  }
  return [...tags];
}

/** A dish fits when it matches every diet the customer follows and contains nothing they avoid. */
export function dishFits(item: MenuItem, profile: DietProfile): boolean {
  if (!hasDietProfile(profile)) return false;
  return (
    profile.dietary.every((tag) => effectiveDietary(item).includes(tag)) &&
    allergenConflicts(item, profile.avoid).length === 0
  );
}

/** A kitchen fits when it has at least one available dish that fits. */
export function kitchenFits(restaurant: Restaurant, profile: DietProfile): boolean {
  return restaurant.menu.some((m) => m.available && dishFits(m, profile));
}

/** "Contains peanuts and dairy, which you avoid" */
export function conflictSentence(conflicts: Allergen[]): string | null {
  const names = ALLERGENS.filter((a) => conflicts.includes(a.value)).map((a) => a.label.toLowerCase());
  if (!names.length) return null;
  const list = names.length === 1 ? names[0] : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
  return `Contains ${list}, which you avoid`;
}
