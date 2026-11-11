import type { KitchenAlert } from '@/types';

/**
 * Alerts from the demo's Pro kitchens, timed relative to now so the demo
 * always has something fresh for people who saved those kitchens.
 */
export function sampleAlerts(now: Date): KitchenAlert[] {
  const ago = (hours: number) => new Date(now.getTime() - hours * 3_600_000).toISOString();
  return [
    {
      id: 'sample_alert_susie',
      restaurantId: 'sample_susies_sweets',
      restaurantName: 'Susie’s Sweets',
      text: 'Peach cobbler is back this week, and there are only 12. Order by Thursday for Saturday pickup.',
      at: ago(3),
    },
    {
      id: 'sample_alert_parmesan',
      restaurantId: 'sample_cafe_parmesan',
      restaurantName: 'Cafe Parmesan',
      text: 'Lemon polenta cakes are cooling now. A few left for pickup this afternoon.',
      at: ago(28),
    },
  ];
}
