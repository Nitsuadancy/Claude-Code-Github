import { describe, expect, it } from '@jest/globals';

import { SAMPLE_RESTAURANTS } from '@/data/sample-restaurants';
import { allergenSentence } from '@/lib/dietary';
import { remainingToday, soldToday, stockLabel } from '@/lib/limits';
import { normalizeOrder, normalizePersisted, normalizeRestaurant } from '@/lib/migrate';
import { formatDays } from '@/lib/hours';
import { pickForYou } from '@/lib/for-you';
import { fitWithin } from '@/lib/images';
import { canSayArrived, estimateReadyAt, isActive, isAddressShared, orderNumber } from '@/lib/orders';
import { isValidContact } from '@/lib/validation';
import { accentColor } from '@/data/accents';
import { hasFoundingProOffer } from '@/data/pro';
import { cottageStatement, isOpenState, marketFor, neighborhoodsFor, stateName, US_STATES } from '@/data/regions';
import { cleanInstagram, visibleUpdate } from '@/lib/kitchen-style';
import {
  describeBakeDays,
  describeBakeDaysLong,
  describeCutoff,
  isValidBakeDay,
  nextBakeDayStatus,
  openBakeDays,
  upcomingBakeDays,
} from '@/lib/bake-days';
import { firstOrderSteps } from '@/lib/launch';
import { isInformationComplete, isReadyToOpen } from '@/lib/setup';
import { browseRestaurants, DEFAULT_FILTERS } from '@/lib/browse';
import { kitchenKindLabel } from '@/lib/kitchen-kind';
import { moveItem } from '@/lib/menu';
import { orderingLine, takingOrders } from '@/lib/ordering';
import { type AppState, INITIAL_STATE, reducer, storedKitchen } from '@/state/reducer';
import { withReviews } from '@/lib/reviews';
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

describe('for you', () => {
  const base = {
    customerId: 'me',
    orders: [] as Order[],
    favoriteIds: [] as string[],
    diet: { dietary: [], avoid: [] },
    neighborhood: '',
    now: new Date(2026, 10, 5, 3, 0), // 3 AM: every sample kitchen is closed
  };

  it('puts favorites first, then kitchens you ordered from, each with its reason', () => {
    const picks = pickForYou(SAMPLE_RESTAURANTS, {
      ...base,
      favoriteIds: ['sample_abuela_rosa'],
      orders: [order({ customerId: 'me', restaurantId: 'sample_green_bowl', status: 'completed' })],
    });
    expect(picks[0]).toMatchObject({ restaurant: { id: 'sample_abuela_rosa' }, reason: 'One of your favorites, taking orders' });
    expect(picks[1]).toMatchObject({ restaurant: { id: 'sample_green_bowl' }, reason: 'You ordered here before' });
  });

  it('uses your diet and neighborhood, and caps the list', () => {
    const vegan = pickForYou(SAMPLE_RESTAURANTS, { ...base, diet: { dietary: ['vegan'], avoid: [] } });
    expect(vegan[0].reason).toBe('Fits your diet');
    const local = pickForYou(SAMPLE_RESTAURANTS, { ...base, neighborhood: 'Pine Hills' });
    expect(local[0]).toMatchObject({ restaurant: { id: 'sample_blue_mountain' }, reason: 'In Pine Hills' });
    expect(pickForYou(SAMPLE_RESTAURANTS, base, 3)).toHaveLength(3);
  });
});

describe('deleting an account', () => {
  it('removes the person, their kitchen and everything tied to them, and keeps everyone else', () => {
    let s = reducer(INITIAL_STATE, { type: 'hydrate', state: {} });
    s = reducer(s, { type: 'signIn', userId: 'u1', phone: '+14075550100' });
    s = reducer(s, { type: 'saveRestaurant', restaurant: { ...SAMPLE_RESTAURANTS[0], id: 'mine', ownerId: 'u1' } });
    s = {
      ...s,
      favoriteRestaurantIds: ['sample_blue_mountain'],
      orders: [
        order({ id: 'a', customerId: 'u1', restaurantId: 'sample_blue_mountain' }),
        order({ id: 'b', customerId: 'other', restaurantId: 'mine' }),
        order({ id: 'c', customerId: 'other', restaurantId: 'sample_blue_mountain' }),
      ],
    };
    const after = reducer(s, { type: 'deleteAccount' });
    expect(after.user).toBeNull();
    expect(after.restaurants.map((r) => r.id)).toEqual([]);
    expect(after.orders.map((o) => o.id)).toEqual(['c']);
    expect(after.favoriteRestaurantIds).toEqual([]);
    expect(after.hasSeenWelcome).toBe(true);
  });
});

describe('editing a kitchen', () => {
  it('starts from the stored kitchen, so saving never counts device reviews twice', () => {
    const kitchen = { ...SAMPLE_RESTAURANTS[0], id: 'mine', ownerId: 'u1', rating: 4, ratingCount: 10 };
    const review = { id: 'rv', orderId: 'o', restaurantId: 'mine', customerId: 'c', customerName: 'Ann B.', stars: 5, tags: [], text: '', createdAt: '2026-11-01T00:00:00.000Z' };
    const state = { user: { id: 'u1', name: 'A', email: '', phone: '', role: 'chef' as const, neighborhood: '' }, restaurants: [kitchen] };
    expect(withReviews(kitchen, [review]).ratingCount).toBe(11);
    expect(storedKitchen(state)?.ratingCount).toBe(10);
    expect(storedKitchen({ ...state, user: null })).toBeUndefined();
  });
});

describe('reporting a review', () => {
  it('remembers each report once and survives an old saved state without the field', () => {
    let s = reducer(INITIAL_STATE, { type: 'hydrate', state: { recentSearches: ['jam'] } });
    expect(s.reportedReviewIds).toEqual([]);
    s = reducer(s, { type: 'reportReview', reviewId: 'r1' });
    s = reducer(s, { type: 'reportReview', reviewId: 'r1' });
    expect(s.reportedReviewIds).toEqual(['r1']);
  });
});

describe('first-order checklist', () => {
  it('ticks off photos, story and sharing', () => {
    const kitchen = { ...SAMPLE_RESTAURANTS[0], chefBio: '', menu: SAMPLE_RESTAURANTS[0].menu.map((m) => ({ ...m, photoUri: undefined })) };
    expect(firstOrderSteps(kitchen, []).map((s) => s.done)).toEqual([false, false, false, false]);
    const ready = firstOrderSteps(SAMPLE_RESTAURANTS[0], ['link']);
    expect(ready.map((s) => [s.id, s.done])).toEqual([
      ['photos', true],
      ['bio', true],
      ['story', false],
      ['link', true],
    ]);
    let s = reducer(INITIAL_STATE, { type: 'markShared', step: 'story' });
    s = reducer(s, { type: 'markShared', step: 'story' });
    expect(s.sharedSteps).toEqual(['story']);
  });
});

describe('cancelling an order', () => {
  it('lets the customer cancel only before the kitchen accepts', () => {
    const placed = order({ id: 'p', customerId: 'c1', restaurantId: 'sample_blue_mountain' });
    const accepted = { ...order({ id: 'a', customerId: 'c1', restaurantId: 'sample_blue_mountain' }), status: 'accepted' as const };
    let s = { ...INITIAL_STATE, orders: [placed, accepted] };
    s = reducer(s, { type: 'cancelOrder', orderId: 'p', customerId: 'someone-else' });
    expect(s.orders[0].status).toBe('placed');
    s = reducer(s, { type: 'cancelOrder', orderId: 'p', customerId: 'c1', at: '2026-11-07T15:00:00Z' });
    s = reducer(s, { type: 'cancelOrder', orderId: 'a', customerId: 'c1' });
    expect(s.orders.map((o) => o.status)).toEqual(['cancelled', 'accepted']);
    expect(s.orders[0].statusHistory.at(-1)).toEqual({ status: 'cancelled', at: '2026-11-07T15:00:00Z' });
    // A kitchen can't move a cancelled order.
    s = reducer(s, { type: 'setOrderStatus', orderId: 'p', status: 'accepted' });
    expect(s.orders[0].status).toBe('cancelled');
    expect(isActive('cancelled')).toBe(false);
    expect(isAddressShared('cancelled')).toBe(false);
  });
});

describe('kitchen personalization', () => {
  it('cleans Instagram handles and hides old updates', () => {
    expect(cleanInstagram('@Susies.Sweets ')).toBe('susies.sweets');
    expect(cleanInstagram('https://www.instagram.com/susies_sweets/?hl=en')).toBe('susies_sweets');
    expect(cleanInstagram('not a handle!')).toBe('');
    const now = new Date('2026-11-07T12:00:00Z');
    expect(visibleUpdate({ text: 'Pie is back', postedAt: '2026-11-05T12:00:00Z' }, now)?.text).toBe('Pie is back');
    expect(visibleUpdate({ text: 'Old news', postedAt: '2026-10-20T12:00:00Z' }, now)).toBeNull();
    expect(visibleUpdate({ text: '  ', postedAt: '2026-11-06T12:00:00Z' }, now)).toBeNull();
    expect(accentColor('sage')).toBe('#9DC59B');
    expect(accentColor(undefined)).toBe('#D4B26E');
  });
});

describe('reordering dishes', () => {
  it('swaps neighbours and ignores moves off either end', () => {
    expect(moveItem(['a', 'b', 'c'], 1, -1)).toEqual(['b', 'a', 'c']);
    expect(moveItem(['a', 'b', 'c'], 1, 1)).toEqual(['a', 'c', 'b']);
    expect(moveItem(['a', 'b', 'c'], 0, -1)).toEqual(['a', 'b', 'c']);
    expect(moveItem(['a', 'b', 'c'], 2, 1)).toEqual(['a', 'b', 'c']);
  });
});

describe('bake days', () => {
  const kitchen = {
    ...SAMPLE_RESTAURANTS[0],
    orderMode: 'bake-days' as const,
    acceptingOrders: true,
    bakeDays: [{ day: 'saturday' as const, pickupStart: '09:00', pickupEnd: '12:00', closeDaysBefore: 2 }],
    skippedBakeDays: [],
  };
  // Wednesday, Nov 4 2026, 10 AM local time.
  const wed = new Date(2026, 10, 4, 10, 0);

  it('lists the next Saturdays with their order cutoff', () => {
    const days = upcomingBakeDays(kitchen, wed);
    // Two weeks ahead.
    expect(days.map((d) => d.date)).toEqual(['2026-11-07', '2026-11-14']);
    expect(new Date(days[0].closesAt)).toEqual(new Date(2026, 10, 5, 20, 0));
    expect(new Date(days[0].pickupEnd)).toEqual(new Date(2026, 10, 7, 12, 0));
  });

  it('closes ordering at the cutoff and skips weeks the cook takes off', () => {
    const friday = new Date(2026, 10, 6, 9, 0); // After Thursday 8 PM, so this Saturday has closed.
    expect(openBakeDays(kitchen, friday)[0].date).toBe('2026-11-14');
    expect(takingOrders(kitchen, friday)).toBe(true);
    const skipping = { ...kitchen, skippedBakeDays: ['2026-11-07'] };
    expect(openBakeDays(skipping, wed)[0].date).toBe('2026-11-14');
    expect(upcomingBakeDays(skipping, wed, { includeSkipped: true })[0].date).toBe('2026-11-07');
    expect(takingOrders({ ...kitchen, acceptingOrders: false }, wed)).toBe(false);
    expect(takingOrders({ ...kitchen, bakeDays: [] }, wed)).toBe(false);
    expect(orderingLine({ ...kitchen, bakeDays: [] }, wed)).toBe('No bake days coming up');
  });

  it('describes the schedule in plain words', () => {
    expect(describeBakeDays(kitchen.bakeDays)).toBe('Sat 9 AM–12 PM');
    expect(
      describeBakeDaysLong([
        { day: 'saturday', pickupStart: '10:00', pickupEnd: '13:00', closeDaysBefore: 1 },
        { day: 'friday', pickupStart: '15:00', pickupEnd: '18:30', closeDaysBefore: 1 },
      ]),
    ).toBe('Fridays 3–6:30 PM and Saturdays 10 AM–1 PM');
    expect(describeCutoff(1)).toBe('8 PM the day before');
    expect(describeCutoff(2)).toBe('8 PM, 2 days before');
    expect(isValidBakeDay({ day: 'monday', pickupStart: '12:00', pickupEnd: '09:00', closeDaysBefore: 1 })).toBe(false);
    expect(isValidBakeDay({ day: 'monday', pickupStart: '09:00', pickupEnd: '12:00', closeDaysBefore: 5 })).toBe(false);
  });
});

describe('next bake day on the dashboard', () => {
  it('counts the orders for it and knows whether it is open, baking or in pickup', () => {
    const kitchen = {
      id: 'k1',
      bakeDays: [{ day: 'saturday' as const, pickupStart: '09:00', pickupEnd: '12:00', closeDaysBefore: 1 }],
      skippedBakeDays: [],
    };
    const sat = new Date(2026, 10, 7, 9, 0).toISOString();
    const orders = [
      { restaurantId: 'k1', scheduledFor: sat, status: 'placed' as const },
      { restaurantId: 'k1', scheduledFor: sat, status: 'cancelled' as const },
      { restaurantId: 'k1', scheduledFor: null, status: 'placed' as const },
    ];
    expect(nextBakeDayStatus(kitchen, orders, new Date(2026, 10, 5, 12))).toMatchObject({ orderCount: 1, phase: 'open' });
    expect(nextBakeDayStatus(kitchen, orders, new Date(2026, 10, 6, 21))?.phase).toBe('baking');
    expect(nextBakeDayStatus(kitchen, orders, new Date(2026, 10, 7, 10))?.phase).toBe('pickup');
    expect(nextBakeDayStatus({ ...kitchen, bakeDays: [] }, orders, new Date(2026, 10, 5))).toBeNull();
  });
});

describe('pickup handoff', () => {
  it('lets the customer say they are here once the order is ready or the pickup window opens', () => {
    const now = new Date('2026-11-07T15:30:00Z');
    expect(canSayArrived({ status: 'ready', scheduledFor: null }, now)).toBe(true);
    expect(canSayArrived({ status: 'placed', scheduledFor: null }, now)).toBe(false);
    expect(canSayArrived({ status: 'preparing', scheduledFor: null }, now)).toBe(false);
    const bake = { status: 'accepted' as const, scheduledFor: '2026-11-07T15:00:00Z', pickupBy: '2026-11-07T18:00:00Z' };
    expect(canSayArrived(bake, now)).toBe(true);
    expect(canSayArrived(bake, new Date('2026-11-07T14:00:00Z'))).toBe(false);
    expect(canSayArrived({ ...bake, arrivedAt: '2026-11-07T15:10:00Z' }, now)).toBe(false);

    const ready: Order = { ...order({ id: 'r', customerId: 'c1', restaurantId: 'k' }), status: 'ready' };
    let s: AppState = { ...INITIAL_STATE, orders: [ready] };
    s = reducer(s, { type: 'markArrived', orderId: 'r', customerId: 'someone-else' });
    expect(s.orders[0].arrivedAt).toBeUndefined();
    s = reducer(s, { type: 'markArrived', orderId: 'r', customerId: 'c1', at: '2026-11-07T15:31:00Z' });
    expect(s.orders[0].arrivedAt).toBe('2026-11-07T15:31:00Z');
  });
});

describe('Manna Pro interest', () => {
  it('records interest once and offers founding kitchens a free year', () => {
    let s = reducer(INITIAL_STATE, { type: 'hydrate', state: {} });
    expect(s.proInterestAt).toBeNull();
    s = reducer(s, { type: 'joinProWaitlist', at: '2026-11-07T12:00:00Z' });
    s = reducer(s, { type: 'joinProWaitlist', at: '2026-11-08T12:00:00Z' });
    expect(s.proInterestAt).toBe('2026-11-07T12:00:00Z');
    expect(hasFoundingProOffer({ founding: true })).toBe(true);
    expect(hasFoundingProOffer({ founding: false })).toBe(false);
    expect(hasFoundingProOffer(undefined)).toBe(false);
  });
});

describe('states and markets', () => {
  it('opens only states with rules and a market, and keeps each state to its own neighborhoods', () => {
    expect(US_STATES).toHaveLength(51);
    expect(isOpenState('FL')).toBe(true);
    expect(isOpenState('GA')).toBe(false);
    expect(isOpenState(undefined)).toBe(false);
    expect(neighborhoodsFor('FL')).toContain('College Park');
    expect(neighborhoodsFor('TX')).toEqual([]);
    expect(marketFor('College Park')?.city).toBe('Orlando');
    expect(marketFor('College Park', 'GA')).toBeUndefined();
    expect(cottageStatement('FL')).toContain('Florida');
    expect(stateName('NC')).toBe('North Carolina');
  });

  it('blocks publishing a kitchen outside an open state and fills Florida for older saved kitchens', () => {
    const kitchen = SAMPLE_RESTAURANTS.find((r) => r.id === 'sample_susies_sweets')!;
    expect(isInformationComplete(kitchen)).toBe(true);
    expect(isInformationComplete({ ...kitchen, state: 'GA' })).toBe(false);
    const { state: _state, ...old } = kitchen;
    const s = reducer(INITIAL_STATE, { type: 'hydrate', state: { restaurants: [old] } });
    expect(s.restaurants[0].state).toBe('FL');
  });
});

describe('open marketplace', () => {
  it('needs the food-law confirmation to open, labels kitchens honestly and lifts licensed ones', () => {
    const user = { id: 'u1', name: 'Rae Cook', email: '', phone: '+14075550100', role: 'chef' as const, neighborhood: '' };
    const ready = {
      ...SAMPLE_RESTAURANTS.find((r) => r.id === 'sample_susies_sweets')!,
      id: 'mine',
      ownerId: 'u1',
      status: 'draft' as const,
      documents: [
        { kind: 'food-handler' as const, fileName: 'card.pdf', uri: 'x' },
        { kind: 'government-id' as const, fileName: 'id.jpg', uri: 'y' },
      ],
      lawAttestedAt: undefined,
    };
    expect(isReadyToOpen(ready)).toBe(false);
    let s = reducer({ ...INITIAL_STATE, user, restaurants: [ready] }, { type: 'publishRestaurant', restaurantId: 'mine' });
    expect(s.restaurants[0].status).toBe('draft');
    const attested = { ...ready, lawAttestedAt: '2026-11-07T12:00:00Z' };
    s = reducer({ ...INITIAL_STATE, user, restaurants: [attested] }, { type: 'publishRestaurant', restaurantId: 'mine' });
    expect(s.restaurants[0].status).toBe('live');

    expect(kitchenKindLabel({ licensed: false })).toBe('Home kitchen · not inspected');
    expect(kitchenKindLabel({ licensed: true })).toBe('Licensed kitchen');

    const twin = SAMPLE_RESTAURANTS[1];
    const ranked = browseRestaurants(
      [{ ...twin, id: 'home' }, { ...twin, id: 'licensed', licensed: true }],
      DEFAULT_FILTERS,
      new Date(2026, 10, 7, 10),
    );
    expect(ranked.map((r) => r.id)).toEqual(['licensed', 'home']);
  });
});
