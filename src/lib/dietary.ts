import type { Allergen, DietaryTag } from '@/types';

export const DIETARY_TAGS: { value: DietaryTag; label: string; icon: string }[] = [
  { value: 'vegan', label: 'Vegan', icon: 'sprout' },
  { value: 'vegetarian', label: 'Vegetarian', icon: 'leaf' },
  { value: 'gluten-free', label: 'Gluten-free', icon: 'barley-off' },
  { value: 'dairy-free', label: 'Dairy-free', icon: 'cow-off' },
  { value: 'halal', label: 'Halal', icon: 'food-halal' },
  { value: 'spicy', label: 'Spicy', icon: 'chili-mild' },
];

/** The major food allergens chefs should declare. */
export const ALLERGENS: { value: Allergen; label: string }[] = [
  { value: 'peanuts', label: 'Peanuts' },
  { value: 'tree-nuts', label: 'Tree nuts' },
  { value: 'dairy', label: 'Dairy' },
  { value: 'gluten', label: 'Gluten' },
  { value: 'eggs', label: 'Eggs' },
  { value: 'soy', label: 'Soy' },
  { value: 'fish', label: 'Fish' },
  { value: 'shellfish', label: 'Shellfish' },
  { value: 'sesame', label: 'Sesame' },
];

export function dietaryLabel(tag: DietaryTag): string {
  return DIETARY_TAGS.find((t) => t.value === tag)?.label ?? tag;
}

/** "Contains dairy, eggs and gluten", or null when nothing is declared. */
export function allergenSentence(allergens: Allergen[]): string | null {
  const names = ALLERGENS.filter((a) => allergens.includes(a.value)).map((a) => a.label.toLowerCase());
  if (names.length === 0) return null;
  const list = names.length === 1 ? names[0] : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
  return `Contains ${list}`;
}
