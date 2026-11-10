import { describe, expect, it } from '@jest/globals';

import { visibleUpdate } from '@/lib/kitchen-style';
import { canPostOrderUpdate, ORDER_UPDATE_MAX, ORDER_UPDATES_MAX, orderUpdates } from '@/lib/order-updates';
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
