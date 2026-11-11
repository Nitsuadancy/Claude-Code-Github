import type { Allergen, MenuItem } from '@/types';

import { ALLERGENS } from './dietary';

/**
 * Printable labels for a kitchen's dishes. Cottage food labels usually need
 * the kitchen's name and address, the product name, ingredients in order of
 * weight, the net weight, allergens and the state's required statement.
 * Cooks are responsible for checking their own state's rules.
 */
export const INGREDIENTS_MAX = 400;
export const NET_WEIGHT_MAX = 40;

/** "Contains: Wheat, Milk, Eggs" from a dish's allergens, or null. */
export function allergenLine(allergens: Allergen[]): string | null {
  if (!allergens.length) return null;
  const names = allergens.map((a) => ALLERGENS.find((x) => x.value === a)?.label ?? a);
  return `Contains: ${names.join(', ')}`;
}

/** What's still missing before a label is complete. */
export function labelGaps(item: Pick<MenuItem, 'ingredients' | 'netWeight'>, address: string): string[] {
  const gaps: string[] = [];
  if (!item.ingredients?.trim()) gaps.push('ingredients');
  if (!item.netWeight?.trim()) gaps.push('net weight');
  if (!address.trim()) gaps.push('your address (in Kitchen details)');
  return gaps;
}
