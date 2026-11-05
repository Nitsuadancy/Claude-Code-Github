import type { Allergen, DietaryTag } from '@/types';

/** `code` is the short mark restaurant menus print next to a dish. */
export const DIETARY_TAGS: { value: DietaryTag; label: string; code: string }[] = [
  { value: 'vegan', label: 'Vegan', code: 'VG' },
  { value: 'vegetarian', label: 'Vegetarian', code: 'V' },
  { value: 'gluten-free', label: 'Gluten-free', code: 'GF' },
  { value: 'dairy-free', label: 'Dairy-free', code: 'DF' },
  { value: 'halal', label: 'Halal', code: 'H' },
  { value: 'spicy', label: 'Spicy', code: 'S' },
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
