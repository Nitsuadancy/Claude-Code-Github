import { describe, expect, it } from '@jest/globals';

import {
  canSendHelp,
  directionsUrl,
  googleCalendarUrl,
  helpTopicsFor,
  HELP_NOTE_MAX,
  pickupEvent,
} from '@/lib/order-extras';
import { orderNumber } from '@/lib/orders';
import { type AppState, INITIAL_STATE, reducer } from '@/state/reducer';
import type { Order } from '@/types';

function order(partial: Partial<Order>): Order {
  return {
    id: 'o1',
    customerId: 'c1',
    customerName: 'Maya',
    restaurantId: 'k1',
    restaurantName: 'Susie’s Sweets',
    lines: [
      { itemId: 'a', name: 'Pound Cake', priceCents: 1800, quantity: 2 },
      { itemId: 'b', name: 'Peach Cobbler', priceCents: 2200, quantity: 1 },
    ],
    subtotalCents: 5800,
    movementFeeCents: 464,
    totalCents: 6264,
    pickupAddress: '5 Willow Way, Orlando',
    pickupInstructions: 'Side gate, blue cooler.',
    status: 'accepted',
    statusHistory: [],
    chefNote: '',
    customerNote: '',
    createdAt: '2026-11-06T15:00:00.000Z',
    estimatedReadyAt: '2026-11-06T15:30:00.000Z',
    scheduledFor: null,
    ...partial,
  };
}

describe('pickup on a calendar', () => {
  it('uses the bake day window when there is one', () => {
    const e = pickupEvent(order({ scheduledFor: '2026-11-14T15:00:00.000Z', pickupBy: '2026-11-14T18:00:00.000Z' }));
    expect(e.title).toBe('Pick up from Susie’s Sweets');
    expect(e.start.toISOString()).toBe('2026-11-14T15:00:00.000Z');
    expect(e.end.toISOString()).toBe('2026-11-14T18:00:00.000Z');
    expect(e.location).toBe('5 Willow Way, Orlando');
    expect(e.notes).toContain(`No. ${orderNumber('o1')}: 2 × Pound Cake, 1 × Peach Cobbler.`);
    expect(e.notes).toContain('Side gate, blue cooler.');
  });

  it('gives an as-soon-as-ready order half an hour from the ready time', () => {
    const e = pickupEvent(order({}));
    expect(e.start.toISOString()).toBe('2026-11-06T15:30:00.000Z');
    expect(e.end.toISOString()).toBe('2026-11-06T16:00:00.000Z');
  });

  it('keeps the address and instructions private until the kitchen accepts', () => {
    const e = pickupEvent(order({ status: 'placed' }), 'College Park');
    expect(e.location).toBe('College Park (address shared once accepted)');
    expect(e.notes).not.toContain('Side gate');
    expect(e.notes).toContain('once the kitchen accepts');
    expect(pickupEvent(order({ status: 'placed' })).location).toBe('');
  });

  it('builds a Google Calendar link with UTC times', () => {
    const url = googleCalendarUrl(
      pickupEvent(order({ scheduledFor: '2026-11-14T15:00:00.000Z', pickupBy: '2026-11-14T18:00:00.000Z' })),
    );
    expect(url.startsWith('https://calendar.google.com/calendar/render?action=TEMPLATE&')).toBe(true);
    expect(url).toContain('dates=20261114T150000Z%2F20261114T180000Z');
    expect(url).toContain('location=5%20Willow%20Way%2C%20Orlando');
  });
});

describe('directions', () => {
  it('opens Apple Maps on iPhone and Google Maps elsewhere', () => {
    expect(directionsUrl(' 5 Willow Way, Orlando ', 'ios')).toBe('https://maps.apple.com/?daddr=5%20Willow%20Way%2C%20Orlando');
    expect(directionsUrl('5 Willow Way', 'android')).toBe(
      'https://www.google.com/maps/dir/?api=1&destination=5%20Willow%20Way',
    );
  });
});

describe('help with an order', () => {
  it('offers topics that fit where the order is', () => {
    expect(helpTopicsFor('preparing').map((t) => t.kind)).toEqual(['late', 'pickup', 'change', 'other']);
    expect(helpTopicsFor('completed').map((t) => t.kind)).toContain('missing');
    expect(helpTopicsFor('cancelled').map((t) => t.kind)).toEqual(['charge', 'other']);
  });

  it('needs a few words for "Something else"', () => {
    expect(canSendHelp(null, 'hello')).toBe(false);
    expect(canSendHelp('late', '')).toBe(true);
    expect(canSendHelp('other', ' hi ')).toBe(false);
    expect(canSendHelp('other', 'The box was crushed')).toBe(true);
  });

  it('records one request from the order’s customer, for a topic that fits', () => {
    let s: AppState = { ...INITIAL_STATE, orders: [order({ status: 'completed' })] };
    s = reducer(s, { type: 'reportOrderIssue', orderId: 'o1', customerId: 'someone-else', kind: 'missing', note: '' });
    expect(s.orders[0].issue).toBeUndefined();
    s = reducer(s, { type: 'reportOrderIssue', orderId: 'o1', customerId: 'c1', kind: 'late', note: '' });
    expect(s.orders[0].issue).toBeUndefined();
    s = reducer(s, {
      type: 'reportOrderIssue',
      orderId: 'o1',
      customerId: 'c1',
      kind: 'missing',
      note: `  ${'x'.repeat(HELP_NOTE_MAX + 50)}  `,
      at: '2026-11-06T17:00:00.000Z',
    });
    expect(s.orders[0].issue).toEqual({ kind: 'missing', note: 'x'.repeat(HELP_NOTE_MAX), at: '2026-11-06T17:00:00.000Z' });
    const before = s.orders[0].issue;
    s = reducer(s, { type: 'reportOrderIssue', orderId: 'o1', customerId: 'c1', kind: 'quality', note: 'again' });
    expect(s.orders[0].issue).toBe(before);
  });
});
