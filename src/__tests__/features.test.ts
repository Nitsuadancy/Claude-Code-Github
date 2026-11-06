import { describe, expect, it } from '@jest/globals';

import { SAMPLE_RESTAURANTS } from '@/data/sample-restaurants';
import { allergenSentence } from '@/lib/dietary';
import { remainingToday, soldToday, stockLabel } from '@/lib/limits';
import { normalizeOrder, normalizePersisted, normalizeRestaurant } from '@/lib/migrate';
import { formatDays } from '@/lib/hours';
import { fitWithin } from '@/lib/images';
import { estimateReadyAt, isAddressShared, orderNumber } from '@/lib/orders';
import { isValidContact } from '@/lib/validation';
import { INITIAL_STATE, reducer } from '@/state/reducer';
import type { Order, Restaurant } from '@/types';

function order(partial: Partial<Order>): Order {
  return {
    id: 'o',
    customerId: 'c',
    customerName: 'C',
    restaurantId: 'r1',
    restaurantName: 'R',
    lines: [],
    subtotalCents: 0,
    movementFeeCents: 0,
    totalCents: 0,
    pickupAddress: '',
    status: 'placed',
    statusHistory: [],
    chefNote: '',
    customerNote: '',
    createdAt: new Date(2026, 10, 5, 12).toISOString(),
    estimatedReadyAt: new Date(2026, 10, 5, 12, 30).toISOString(),
    scheduledFor: null,
    ...partial,
  };
}

describe('daily limits', () => {
  const now = new Date(2026, 10, 5, 18);
  const line = (quantity: number) => [{ itemId: 'lasagna', name: 'Lasagna', priceCents: 1500, quantity }];
  const orders = [
    order({ id: '1', lines: line(3) }),
    order({ id: '2', lines: line(2), status: 'completed' }),
    order({ id: '3', lines: line(5), status: 'declined' }), // declined orders don't use stock
    order({ id: '4', lines: line(4), createdAt: new Date(2026, 10, 4, 12).toISOString() }), // yesterday
    order({ id: '5', lines: line(1), restaurantId: 'other' }), // different kitchen
  ];
  const item = {
    id: 'lasagna',
    name: 'Lasagna',
    description: '',
    priceCents: 1500,
    available: true,
    dietary: [],
    allergens: [],
    dailyLimit: 6,
  };

  it('counts only today’s non-declined orders for this kitchen', () => {
    expect(soldToday(orders, 'r1', 'lasagna', now)).toBe(5);
  });

  it('works out what is left, and never goes below zero', () => {
    expect(remainingToday(item, orders, 'r1', now)).toBe(1);
    expect(remainingToday({ ...item, dailyLimit: 2 }, orders, 'r1', now)).toBe(0);
    expect(remainingToday({ ...item, dailyLimit: null }, orders, 'r1', now)).toBeNull();
  });

  it('only shouts about stock when it is low', () => {
    expect(stockLabel(null)).toBeNull();
    expect(stockLabel(20)).toBeNull();
    expect(stockLabel(3)).toBe('Only 3 left today');
    expect(stockLabel(0)).toBe('Sold out today');
  });
});

describe('allergens', () => {
  it('reads naturally', () => {
    expect(allergenSentence([])).toBeNull();
    expect(allergenSentence(['dairy'])).toBe('Contains dairy');
    expect(allergenSentence(['eggs', 'dairy', 'gluten'])).toBe('Contains dairy, gluten and eggs');
  });
});

describe('order timing', () => {
  it('adds prep time to the order time', () => {
    expect(estimateReadyAt('2026-11-05T12:00:00.000Z', 45)).toBe('2026-11-05T12:45:00.000Z');
  });
});

describe('upgrading saved data from older versions', () => {
  it('fills in new restaurant and dish fields', () => {
    const old = {
      ...SAMPLE_RESTAURANTS[0],
      chefBio: undefined,
      verified: undefined,
      prepMinutes: undefined,
      menu: [{ id: 'x', name: 'Soup', description: '', priceCents: 500, available: true }],
    } as unknown as Restaurant;
    const r = normalizeRestaurant(old);
    expect(r.chefBio).toBe('');
    expect(r.verified).toBe(false);
    expect(r.prepMinutes).toBe(30);
    expect(r.menu[0]).toMatchObject({ dietary: [], allergens: [], dailyLimit: null });
  });

  it('moves old orders to the movement fee and pickup', () => {
    const old = { ...order({}), movementFeeCents: undefined, pickupAddress: undefined, serviceFeeCents: 250, deliveryAddress: '1 Main' };
    const o = normalizeOrder(old as unknown as Order);
    expect(o.movementFeeCents).toBe(250);
    expect(o.pickupAddress).toBe('');
    expect('deliveryAddress' in o).toBe(false);
  });

  it('drops retired categories from saved kitchens', () => {
    const old = { ...SAMPLE_RESTAURANTS[0], categories: ['vegan', 'meal-preppers', 'kids-favorites'] };
    expect(normalizeRestaurant(old as unknown as Restaurant).categories).toEqual(['vegan']);
  });

  it('gives old orders a history, note and ready time', () => {
    const old = { ...order({}), statusHistory: undefined, chefNote: undefined, estimatedReadyAt: undefined };
    const o = normalizeOrder(old as unknown as Order);
    expect(o.statusHistory).toEqual([{ status: 'placed', at: o.createdAt }]);
    expect(o.chefNote).toBe('');
    expect(new Date(o.estimatedReadyAt).getTime() - new Date(o.createdAt).getTime()).toBe(30 * 60_000);
  });

  it('runs on hydrate', () => {
    const old = { ...order({}), statusHistory: undefined } as unknown as Order;
    const s = reducer(INITIAL_STATE, { type: 'hydrate', state: { orders: [old] } });
    expect(s.orders[0].statusHistory).toHaveLength(1);
    expect(normalizePersisted(null)).toBeNull();
  });
});

describe('sample kitchens', () => {
  it('have stories, valid signature dishes and verified badges', () => {
    for (const r of SAMPLE_RESTAURANTS) {
      expect(r.chefBio.length).toBeGreaterThan(40);
      expect(r.verified).toBe(true);
      expect(r.menu.some((m) => m.id === r.signatureItemId)).toBe(true);
    }
  });
});

describe('pickup', () => {
  it('shares the kitchen address only after the chef says yes', () => {
    expect(isAddressShared('placed')).toBe(false);
    expect(isAddressShared('declined')).toBe(false);
    expect(isAddressShared('accepted')).toBe(true);
    expect(isAddressShared('completed')).toBe(true);
  });
});

describe('farmer and artisan waitlist', () => {
  it('accepts a phone number or an email', () => {
    expect(isValidContact('(407) 555-0100')).toBe(true);
    expect(isValidContact('+1 407 555 0100')).toBe(true);
    expect(isValidContact('grower@example.com')).toBe(true);
    expect(isValidContact('407-555')).toBe(false);
    expect(isValidContact('grower@')).toBe(false);
  });

  it('remembers the application on this device', () => {
    const application = {
      id: 'g1',
      businessName: 'Lake Ivanhoe Honey',
      offering: 'Wildflower honey',
      neighborhood: 'Ivanhoe Village',
      contact: 'bees@example.com',
      createdAt: '2026-11-06T12:00:00.000Z',
    };
    expect(INITIAL_STATE.growerApplication).toBeNull();
    const s = reducer(INITIAL_STATE, { type: 'joinGrowerWaitlist', application });
    expect(s.growerApplication).toEqual(application);
  });
});

describe('opening days', () => {
  it('reads like a menu card', () => {
    expect(formatDays(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'])).toBe('Every day');
    expect(formatDays(['tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'])).toBe('Tue–Sun');
    expect(formatDays(['thursday', 'friday', 'saturday'])).toBe('Thu–Sat');
    expect(formatDays(['monday', 'wednesday', 'friday'])).toBe('Mon, Wed, Fri');
    expect(formatDays(['friday', 'saturday'])).toBe('Fri, Sat');
  });
});

describe('order numbers', () => {
  it('are four digits and stable for an order', () => {
    expect(orderNumber('order_abc123')).toMatch(/^\d{4}$/);
    expect(orderNumber('order_abc123')).toBe(orderNumber('order_abc123'));
    expect(orderNumber('order_abc123')).not.toBe(orderNumber('order_abc124'));
  });
});

describe('photo uploads', () => {
  it('shrinks big phone photos to 1600 px on the long side and leaves small ones alone', () => {
    expect(fitWithin(4032, 3024)).toEqual({ width: 1600 });
    expect(fitWithin(3024, 4032)).toEqual({ height: 1600 });
    expect(fitWithin(1200, 900)).toBeNull();
    expect(fitWithin(undefined, undefined)).toBeNull();
  });
});
