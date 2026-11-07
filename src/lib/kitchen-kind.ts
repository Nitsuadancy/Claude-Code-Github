import type { Restaurant } from '@/types';

/**
 * Manna is open to every home cook and every kind of food. It doesn't inspect
 * kitchens; cooks confirm they follow their own state's and county's food laws.
 * Kitchens with an approved permit or license are labeled "Licensed kitchen"
 * and rank a little higher. Everyone else is labeled "Home kitchen".
 */
export const LAW_ATTESTATION =
  'I’m responsible for following my state’s and county’s food laws for everything I sell, including any permits, labels and limits. Manna doesn’t inspect kitchens.';

export function kitchenKind(r: Pick<Restaurant, 'licensed'>): 'licensed' | 'home' {
  return r.licensed ? 'licensed' : 'home';
}

/** Short label for a kitchen page. */
export function kitchenKindLabel(r: Pick<Restaurant, 'licensed'>): string {
  return r.licensed ? 'Licensed kitchen' : 'Home kitchen · not inspected';
}

/** The line under every kitchen's menu, before the allergy reminder. */
export function kitchenDisclosure(r: Pick<Restaurant, 'licensed'>): string {
  return r.licensed
    ? 'This kitchen has a food permit or license on file with Manna.'
    : 'Made in a home kitchen that isn’t licensed or inspected. The cook is responsible for following their local food laws.';
}

/** How much a license lifts a kitchen in Recommended, on the same scale as its rating. */
export const LICENSED_BOOST = 0.15;
