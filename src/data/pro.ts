import type { Href } from 'expo-router';

import type { IconName } from '@/components/icon';
import type { Restaurant } from '@/types';

/**
 * Manna Pro: the optional plan for cooks ($19.99 a month or $199 a year).
 * Every Pro tool is built to bring in more orders or bigger ones. Billing
 * isn't connected yet, so starting Pro is simulated, like payments.
 */
export interface PlanFeature {
  key: 'featured' | 'alerts' | 'drops' | 'custom' | 'codes' | 'insights' | 'labels';
  icon: IconName;
  title: string;
  body: string;
  /** Where the cook uses it. Featured placement works on its own. */
  route?: Href;
}

export const PRO_FEATURES: PlanFeature[] = [
  {
    key: 'featured',
    icon: 'sparkles',
    title: 'Featured on Manna',
    body: 'Your kitchen takes turns at the top of the home screen and comes first in Taste.',
  },
  {
    key: 'drops',
    icon: 'calendar-clock',
    title: 'Drops',
    body: 'Open a one-off menu with its own deadline, like “Thanksgiving pies, order by Tuesday.”',
    route: '/chef/drops',
  },
  {
    key: 'alerts',
    icon: 'megaphone',
    title: 'Alerts to your followers',
    body: 'Tell everyone who saved your kitchen when a bake day opens or a drop goes live.',
    route: '/chef/alerts',
  },
  {
    key: 'custom',
    icon: 'cake',
    title: 'Custom orders',
    body: 'Take requests for birthday cakes, party trays and catering. Send a price, and they pay in the app.',
    route: '/chef/requests',
  },
  {
    key: 'codes',
    icon: 'ticket-percent',
    title: 'Discount codes',
    body: 'Thank your regulars or run a launch special. You choose the amount, the end date and the limit.',
    route: '/chef/codes',
  },
  {
    key: 'insights',
    icon: 'chart-bar',
    title: 'Insights',
    body: 'Your regulars, best sellers, best days and busiest pickup times, month by month.',
    route: '/chef/insights',
  },
  {
    key: 'labels',
    icon: 'printer',
    title: 'Printable labels',
    body: 'A label for every dish with ingredients, allergens and the wording your state asks for.',
    route: '/chef/labels',
  },
];

/** What every kitchen gets, with or without Pro. */
export const FREE_FEATURES = [
  'Your storefront, menu, photos and intro video',
  'Orders paid upfront, with payouts to your bank',
  'Bake days, daily limits and your prep list',
  'Order chat, oven updates and your pinned update',
  'Reviews and the Instagram Story card with your QR code',
] as const;

/** Founding kitchens get Pro free for their first months on Manna. */
export function hasFoundingProOffer(r: Pick<Restaurant, 'founding'> | undefined): boolean {
  return !!r?.founding;
}
