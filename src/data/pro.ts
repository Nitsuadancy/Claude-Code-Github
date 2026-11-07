import type { IconName } from '@/components/icon';
import type { Restaurant } from '@/types';

/**
 * Manna Pro: an optional plan for cooks, planned for once kitchens are
 * selling steadily (see docs/ROADMAP.md, Phase 6). Selling and getting paid
 * stay free forever; Pro adds tools that help a kitchen sell more or save time.
 * Billing isn't built yet, so the app shows the plan and takes interest only.
 */
export interface PlanFeature {
  icon: IconName;
  title: string;
  body: string;
}

export const PRO_FEATURES: PlanFeature[] = [
  {
    icon: 'calendar-clock',
    title: 'Drops and pre-order windows',
    body: 'Open a holiday menu with its own deadline, like “Thanksgiving pies, orders close Tuesday.”',
  },
  {
    icon: 'bell-ring-outline',
    title: 'Followers and alerts',
    body: 'Customers follow your kitchen and get a notification when you open a bake day or post a drop.',
  },
  {
    icon: 'receipt-text-outline',
    title: 'Discount codes and gift cards',
    body: 'Thank your regulars, run a launch special, or sell gift cards for the holidays.',
  },
  {
    icon: 'history',
    title: 'Deeper insights',
    body: 'Your repeat customers, best sellers by day and busiest pickup times.',
  },
  {
    icon: 'storefront-outline',
    title: 'Your own link and branded labels',
    body: 'A short link like manna.app/yourkitchen, plus flyer and label templates with your name on them.',
  },
];

/** What every kitchen gets, with or without Pro. */
export const FREE_FEATURES = [
  'Your storefront, menu and photos',
  'Orders paid upfront, with payouts to your bank',
  'Bake days, daily limits and your prep list',
  'Reviews, your pinned update and accent color',
  'The Instagram Story card with your QR code',
] as const;

/** Founding kitchens get Pro free for their first year once it opens. */
export function hasFoundingProOffer(r: Pick<Restaurant, 'founding'> | undefined): boolean {
  return !!r?.founding;
}
