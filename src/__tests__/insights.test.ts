import { describe, expect, it } from '@jest/globals';

import { SAMPLE_RESTAURANTS } from '@/data/sample-restaurants';
import { buildReorder, prepList, recentKitchenOrders, searchDishes, weeklyEarnings } from '@/lib/insights';
import type { Order, Restaurant } from '@/types';

const at = (d: number, h = 12) => new Date(2026, 10, d, h).toISOString();

function order(partial: Partial<Order>): Order {
  return {
    id: Math.random().toString(36),
    customerId: 'me',
    customerName: 'Me',
    restaurantId: 'r1',
    restaurantName: 'R1',
    lines: [],
    subtotalCents: 1000,
    serviceFeeCents: 100,
    deliveryFeeCents: 299,
    totalCents: 1399,
    deliveryAddress: '',
    status: 'completed',
    statusHistory: [],
    chefNote: '',
    createdAt: at(5),
    estimatedReadyAt: at(5, 13),
    ...partial,
  };
}

describe('order again', () => {
  it('keeps the latest order per kitchen, newest first, skipping declined and other people', () => {
    const list = recentKitchenOrders(
      [
        order({ id: 'old', restaurantId: 'a', createdAt: at(1) }),
        order({ id: 'new', restaurantId: 'a', createdAt: at(3) }),
        order({ id: 'b', restaurantId: 'b', createdAt: at(2) }),
        order({ id: 'declined', restaurantId: 'c', createdAt: at(4), status: 'declined' }),
        order({ id: 'theirs', restaurantId: 'd', createdAt: at(4), customerId: 'other' }),
      ],
      'me',
    );
    expect(list.map((o) => o.id)).toEqual(['new', 'b']);
  });

  it('rebuilds the cart within today’s limits and reports what’s missing', () => {
    const kitchen = SAMPLE_RESTAURANTS.find((r) => r.id === 'sample_susies_sweets')!; // cobbler limit 6
    const past = order({
      restaurantId: kitchen.id,
      lines: [
        { itemId: 'ss_peach_cobbler', name: 'Peach Cobbler', priceCents: 1599, quantity: 4 },
        { itemId: 'ss_cookies', name: 'Cookies', priceCents: 899, quantity: 2 },
        { itemId: 'gone', name: 'Old special', priceCents: 500, quantity: 1 },
      ],
      createdAt: at(1),
    });
    const soldToday = order({
      restaurantId: kitchen.id,
      customerId: 'x',
      status: 'accepted',
      lines: [{ itemId: 'ss_peach_cobbler', name: 'Peach Cobbler', priceCents: 1599, quantity: 3 }],
      createdAt: at(5, 9),
    });
    const result = buildReorder(past, kitchen, [past, soldToday], new Date(2026, 10, 5, 15));
    expect(result.lines).toEqual([
      { itemId: 'ss_peach_cobbler', quantity: 3 },
      { itemId: 'ss_cookies', quantity: 2 },
    ]);
    expect(result.missing).toEqual(['Peach Cobbler', 'Old special']);
  });
});

describe('dish search', () => {
  it('finds dishes by name before description', () => {
    const results = searchDishes(SAMPLE_RESTAURANTS, 'cheese');
    expect(results[0].item.name).toBe('Four-Cheese Deep Dish');
    expect(results.some((r) => r.item.name === 'Peach Cobbler')).toBe(false);
  });

  it('ignores one-letter queries and draft kitchens', () => {
    expect(searchDishes(SAMPLE_RESTAURANTS, 'a')).toEqual([]);
    const draft: Restaurant = { ...SAMPLE_RESTAURANTS[0], id: 'd', status: 'draft' };
    expect(searchDishes([draft], 'lasagna')).toEqual([]);
  });
});

describe('chef dashboard', () => {
  it('sums the prep list across open orders', () => {
    const line = (itemId: string, quantity: number) => ({ itemId, name: itemId, priceCents: 100, quantity });
    const list = prepList(
      [
        order({ status: 'accepted', lines: [line('ziti', 2), line('salad', 1)] }),
        order({ status: 'preparing', lines: [line('ziti', 1)] }),
        order({ status: 'placed', lines: [line('salad', 2)] }),
        order({ status: 'completed', lines: [line('ziti', 9)] }),
        order({ status: 'accepted', restaurantId: 'other', lines: [line('ziti', 9)] }),
      ],
      'r1',
    );
    expect(list).toEqual([
      { itemId: 'ziti', name: 'ziti', toCook: 3, pending: 0 },
      { itemId: 'salad', name: 'salad', toCook: 1, pending: 2 },
    ]);
  });

  it('buckets delivered sales into the last seven days', () => {
    const now = new Date(2026, 10, 5, 20); // Thursday
    const days = weeklyEarnings(
      [
        order({ createdAt: at(5), subtotalCents: 1500 }),
        order({ createdAt: at(5, 8), subtotalCents: 500 }),
        order({ createdAt: at(30 - 31 + 2), subtotalCents: 700 }), // Nov 1
        order({ createdAt: at(4), status: 'preparing', subtotalCents: 9999 }), // not delivered
        order({ createdAt: new Date(2026, 9, 20).toISOString(), subtotalCents: 9999 }), // too old
      ],
      'r1',
      now,
    );
    expect(days).toHaveLength(7);
    expect(days[6]).toEqual({ label: 'Thu', cents: 2000, isToday: true });
    expect(days[2]).toEqual({ label: 'Sun', cents: 700, isToday: false });
    expect(days.reduce((s, d) => s + d.cents, 0)).toBe(2700);
  });
});
