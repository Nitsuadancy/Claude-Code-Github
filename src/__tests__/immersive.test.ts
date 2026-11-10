import { describe, expect, it } from '@jest/globals';

import { ALL_NEIGHBORHOODS } from '@/data/regions';
import { SAMPLE_RESTAURANTS } from '@/data/sample-restaurants';
import { isUrgent, timeLeft } from '@/lib/countdown';
import { driveLabel, driveMinutes, NEIGHBORHOOD_CENTERS, placeLabels, project } from '@/lib/geo';
import { visibleUpdate } from '@/lib/kitchen-style';
import { canPostOrderUpdate, ORDER_UPDATE_MAX, ORDER_UPDATES_MAX, orderUpdates } from '@/lib/order-updates';
import { newStampNumber, ordinal, passportStamps, stampTilt } from '@/lib/passport';
import { canOrderFrom, tasteFeed } from '@/lib/taste';
import { type AppState, INITIAL_STATE, reducer } from '@/state/reducer';
import type { Order } from '@/types';

const at = (h: number, m = 0) => new Date(Date.UTC(2026, 10, 7, h, m)).toISOString();

function order(partial: Partial<Order> = {}): Order {
  return {
    id: 'o1',
    customerId: 'c1',
    customerName: 'Maya',
    restaurantId: 'k1',
    restaurantName: 'Susie’s Sweets',
    lines: [{ itemId: 'a', name: 'Pound Cake', priceCents: 1800, quantity: 1 }],
    subtotalCents: 1800,
    movementFeeCents: 144,
    totalCents: 1944,
    pickupAddress: '5 Willow Way',
    status: 'preparing',
    statusHistory: [
      { status: 'placed', at: at(14) },
      { status: 'accepted', at: at(14, 5) },
      { status: 'preparing', at: at(14, 20) },
    ],
    chefNote: '',
    customerNote: '',
    createdAt: at(14),
    estimatedReadyAt: at(15),
    scheduledFor: null,
    ...partial,
  };
}

describe('oven updates', () => {
  it('needs words or a photo, and only while the kitchen is working on the order', () => {
    expect(canPostOrderUpdate(order(), { text: 'In the oven' })).toBe(true);
    expect(canPostOrderUpdate(order(), { text: ' ', photoUri: 'file:///tray.jpg' })).toBe(true);
    expect(canPostOrderUpdate(order(), { text: '  ' })).toBe(false);
    expect(canPostOrderUpdate(order({ status: 'placed' }), { text: 'hi' })).toBe(false);
    expect(canPostOrderUpdate(order({ status: 'completed' }), { text: 'hi' })).toBe(false);
    const full = Array.from({ length: ORDER_UPDATES_MAX }, (_, i) => ({ id: `u${i}`, text: 'x', at: at(15, i) }));
    expect(canPostOrderUpdate(order({ updates: full }), { text: 'one more' })).toBe(false);
  });

  it('shows an older text note as the first update, just after the latest status', () => {
    const list = orderUpdates(order({ chefNote: 'Just went in!', updates: [{ id: 'u1', text: 'Out of the oven', at: at(15) }] }));
    expect(list.map((u) => u.text)).toEqual(['Just went in!', 'Out of the oven']);
    expect(list[0].at > at(14, 20)).toBe(true);
    expect(orderUpdates(order())).toEqual([]);
  });

  it('adds trimmed updates to the right order and ignores empty ones', () => {
    let s: AppState = { ...INITIAL_STATE, orders: [order()] };
    s = reducer(s, { type: 'postOrderUpdate', orderId: 'o1', update: { id: 'u1', text: `  ${'x'.repeat(ORDER_UPDATE_MAX + 9)} `, at: at(15) } });
    s = reducer(s, { type: 'postOrderUpdate', orderId: 'o1', update: { id: 'u2', text: '', at: at(15, 1) } });
    s = reducer(s, { type: 'postOrderUpdate', orderId: 'o1', update: { id: 'u3', text: '', photoUri: 'file:///rolls.jpg', at: at(15, 2) } });
    expect(s.orders[0].updates?.map((u) => u.id)).toEqual(['u1', 'u3']);
    expect(s.orders[0].updates?.[0].text).toHaveLength(ORDER_UPDATE_MAX);
  });

  it('keeps a photo-only pinned update visible for its week', () => {
    const now = new Date(at(16));
    expect(visibleUpdate({ text: '', postedAt: at(12), photoUri: 'demo:brownies' }, now)).not.toBeNull();
    expect(visibleUpdate({ text: ' ', postedAt: at(12) }, now)).toBeNull();
  });
});

describe('taste feed', () => {
  // A Saturday morning in Orlando, when the demo kitchens are open or taking bake-day orders.
  const now = new Date('2026-11-07T10:40:00-05:00');

  it('only shows dishes with photos from kitchens you can order from, signature first', () => {
    const feed = tasteFeed(SAMPLE_RESTAURANTS, now);
    expect(feed.length).toBeGreaterThan(5);
    expect(feed.every((d) => d.item.photoUri && d.item.available && canOrderFrom(d.restaurant, now))).toBe(true);
    const firstPerKitchen = new Map<string, string>();
    for (const d of feed) if (!firstPerKitchen.has(d.restaurant.id)) firstPerKitchen.set(d.restaurant.id, d.item.id);
    for (const [id, itemId] of firstPerKitchen) {
      const r = SAMPLE_RESTAURANTS.find((k) => k.id === id)!;
      const signature = r.menu.find((m) => m.id === r.signatureItemId);
      if (signature?.photoUri && signature.available) expect(itemId).toBe(signature.id);
    }
  });

  it('takes turns between kitchens instead of grouping one cook', () => {
    const feed = tasteFeed(SAMPLE_RESTAURANTS, now);
    const kitchens = new Set(feed.map((d) => d.restaurant.id)).size;
    const opening = feed.slice(0, kitchens).map((d) => d.restaurant.id);
    expect(new Set(opening).size).toBe(kitchens);
  });

  it('skips kitchens that paused orders', () => {
    const paused = SAMPLE_RESTAURANTS.map((r) => ({ ...r, acceptingOrders: false }));
    expect(tasteFeed(paused, now)).toEqual([]);
  });
});

describe('neighborhood passport', () => {
  const done = (id: string, restaurantId: string, h: number, customerId = 'c1') =>
    order({ id, restaurantId, restaurantName: restaurantId, customerId, status: 'completed', statusHistory: [{ status: 'completed', at: at(h) }] });

  it('stamps each kitchen once, on the first pickup, in the order earned', () => {
    const orders = [
      done('a', 'k2', 12),
      done('b', 'k1', 10),
      done('c', 'k1', 14),
      order({ id: 'd', restaurantId: 'k3' }), // still being made: no stamp yet
      done('e', 'k4', 9, 'someone-else'),
    ];
    const stamps = passportStamps(orders, 'c1');
    expect(stamps.map((s) => [s.restaurantId, s.pickups])).toEqual([
      ['k1', 2],
      ['k2', 1],
    ]);
    expect(newStampNumber(orders[1], orders)).toBe(1);
    expect(newStampNumber(orders[0], orders)).toBe(2);
    expect(newStampNumber(orders[2], orders)).toBeNull(); // second pickup from k1
    expect(newStampNumber(orders[3], orders)).toBeNull();
  });

  it('writes ordinals the usual way and tilts stamps the same way every time', () => {
    expect([1, 2, 3, 4, 11, 12, 13, 21, 22, 23, 101].map(ordinal)).toEqual([
      '1st', '2nd', '3rd', '4th', '11th', '12th', '13th', '21st', '22nd', '23rd', '101st',
    ]);
    expect(stampTilt('sample_susies_sweets')).toBe(stampTilt('sample_susies_sweets'));
    expect(Math.abs(stampTilt('anything'))).toBeLessThanOrEqual(7);
  });
});

describe('countdowns', () => {
  const now = new Date(at(12));
  const plus = (ms: number) => new Date(now.getTime() + ms).toISOString();

  it('shows the two most useful units, rounded down', () => {
    expect(timeLeft(plus(30 * 3_600_000 + 5 * 60_000), now)).toBe('1d 6h');
    expect(timeLeft(plus(48 * 3_600_000), now)).toBe('2d');
    expect(timeLeft(plus(5 * 3_600_000 + 12 * 60_000 + 59_000), now)).toBe('5h 12m');
    expect(timeLeft(plus(3 * 3_600_000), now)).toBe('3h');
    expect(timeLeft(plus(42 * 60_000), now)).toBe('42 min');
    expect(timeLeft(plus(20_000), now)).toBe('1 min');
    expect(timeLeft(plus(-1), now)).toBeNull();
  });

  it('turns urgent in the last six hours', () => {
    expect(isUrgent(plus(7 * 3_600_000), now)).toBe(false);
    expect(isUrgent(plus(5 * 3_600_000), now)).toBe(true);
    expect(isUrgent(plus(-60_000), now)).toBe(false);
  });
});

describe('neighborhood map', () => {
  it('knows every neighborhood Manna lists', () => {
    for (const n of ALL_NEIGHBORHOODS) expect(NEIGHBORHOOD_CENTERS[n]).toBeDefined();
  });

  it('gives sensible city drive times', () => {
    expect(driveLabel('College Park', 'College Park')).toBe('In your neighborhood');
    const near = driveMinutes(NEIGHBORHOOD_CENTERS['College Park'], NEIGHBORHOOD_CENTERS['Ivanhoe Village']);
    const far = driveMinutes(NEIGHBORHOOD_CENTERS['College Park'], NEIGHBORHOOD_CENTERS['Lake Nona']);
    expect(near).toBeGreaterThanOrEqual(3);
    expect(near).toBeLessThan(10);
    expect(far).toBeGreaterThan(35);
    expect(driveLabel('College Park', 'Nowhere')).toBeNull();
  });

  it('fits points inside the box with padding, north at the top', () => {
    const pts = [NEIGHBORHOOD_CENTERS['Winter Park'], NEIGHBORHOOD_CENTERS['Delaney Park'], NEIGHBORHOOD_CENTERS['Pine Hills']];
    const to = project(pts, 300, 200, 20);
    for (const p of pts.map(to)) {
      expect(p.x).toBeGreaterThanOrEqual(19.99);
      expect(p.x).toBeLessThanOrEqual(280.01);
      expect(p.y).toBeGreaterThanOrEqual(19.99);
      expect(p.y).toBeLessThanOrEqual(180.01);
    }
    expect(to(NEIGHBORHOOD_CENTERS['Winter Park']).y).toBeLessThan(to(NEIGHBORHOOD_CENTERS['Delaney Park']).y);
  });
});

describe('map labels', () => {
  it('moves a label to a free side instead of printing over its neighbor', () => {
    const placed = placeLabels(
      [
        { x: 100, y: 100, text: 'Mills 50', gap: 12 },
        { x: 104, y: 104, text: 'Colonialtown', gap: 12 },
      ],
      { width: 300, height: 300 },
    );
    expect(placed[0]).toEqual({ x: 100, y: 122, anchor: 'middle' });
    expect(placed[1].y).toBeLessThan(104); // went above instead
  });
});
