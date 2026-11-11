import { describe, expect, it } from '@jest/globals';

import { SAMPLE_RESTAURANTS } from '@/data/sample-restaurants';
import { ALERTS_PER_WEEK, alertsLeft, followedAlerts } from '@/lib/alerts';
import { buildActivity } from '@/lib/activity';
import { acceptsCustomOrders, checkRequest, orderFromQuote, quoteWindow, requestDateOptions } from '@/lib/custom-orders';
import { applyCode, checkCodeDraft, discountFor } from '@/lib/discounts';
import { checkDrop, draftFromDrop, everydayMenu, openDrops } from '@/lib/drops';
import { kitchenInsights } from '@/lib/insights';
import { allergenLine, labelGaps } from '@/lib/labels';
import { kitchenPayout } from '@/lib/pricing';
import { featuredKitchens, hasPro, PRO_YEARLY_SAVINGS_DOLLARS, proStatus, startSubscription } from '@/lib/pro';
import { tasteFeed } from '@/lib/taste';
import { type AppState, INITIAL_STATE, reducer } from '@/state/reducer';
import type { CustomRequest, DiscountCode, Drop, Order, Restaurant } from '@/types';

const NOW = new Date('2026-11-11T15:00:00Z');
const iso = (d: Date) => d.toISOString();
const daysFrom = (days: number, base = NOW) => new Date(base.getTime() + days * 86_400_000);

const susie = SAMPLE_RESTAURANTS.find((r) => r.id === 'sample_susies_sweets')!;

function kitchen(partial: Partial<Restaurant> = {}): Restaurant {
  return {
    ...susie,
    id: 'k1',
    ownerId: 'u1',
    founding: false,
    pro: undefined,
    drops: [],
    discountCodes: [],
    createdAt: '2026-01-01T12:00:00.000Z',
    status: 'live',
    ...partial,
  };
}

function order(partial: Partial<Order> = {}): Order {
  return {
    id: 'o1',
    customerId: 'c1',
    customerName: 'Maya',
    restaurantId: 'k1',
    restaurantName: 'Susie’s Sweets',
    lines: [{ itemId: 'ss_pound_cake', name: 'Earl Grey Pound Cake', priceCents: 1800, quantity: 1 }],
    subtotalCents: 1800,
    movementFeeCents: 180,
    kitchenFeeCents: 90,
    totalCents: 1980,
    pickupAddress: '5 Willow Way',
    status: 'completed',
    statusHistory: [{ status: 'placed', at: iso(NOW) }],
    chefNote: '',
    customerNote: '',
    createdAt: iso(NOW),
    estimatedReadyAt: iso(NOW),
    scheduledFor: null,
    ...partial,
  };
}

const withKitchen = (k: Restaurant, extra: Partial<AppState> = {}): AppState => ({
  ...INITIAL_STATE,
  hydrated: true,
  user: { id: 'u1', name: 'Susie', email: '', phone: '+14075550100', role: 'chef', neighborhood: 'College Park' },
  restaurants: [k],
  ...extra,
});

describe('Manna Pro plan', () => {
  it('prices Pro at $19.99 a month or $199 a year', () => {
    expect(PRO_YEARLY_SAVINGS_DOLLARS).toBe(40);
  });

  it('gives founding kitchens 3 free months, then needs a plan', () => {
    const founding = kitchen({ founding: true, createdAt: '2026-10-01T12:00:00.000Z' });
    expect(proStatus(founding, NOW)).toMatchObject({ active: true, source: 'founding' });
    expect(hasPro(founding, new Date('2027-01-02T12:00:00Z'))).toBe(false);
    // Choosing a plan during the free months starts billing when they end.
    const sub = startSubscription(founding, 'monthly', NOW);
    expect(sub.billingStartsAt).toBe('2027-01-01T12:00:00.000Z');
    expect(hasPro({ ...founding, pro: sub }, new Date('2027-03-01T12:00:00Z'))).toBe(true);
  });

  it('keeps a canceled plan on until the end of the paid period', () => {
    const k = kitchen({ pro: { plan: 'monthly', startedAt: '2026-11-01T12:00:00.000Z', billingStartsAt: '2026-11-01T12:00:00.000Z' } });
    let state = withKitchen(k);
    state = reducer(state, { type: 'cancelPro', restaurantId: 'k1', at: iso(NOW) });
    const canceled = state.restaurants[0];
    expect(proStatus(canceled, NOW)).toMatchObject({ active: true, ending: true });
    expect(proStatus(canceled, NOW).until?.toISOString()).toBe('2026-12-01T12:00:00.000Z');
    expect(hasPro(canceled, new Date('2026-12-02T12:00:00Z'))).toBe(false);
    state = reducer(state, { type: 'resumePro', restaurantId: 'k1' });
    expect(hasPro(state.restaurants[0], new Date('2027-06-01T12:00:00Z'))).toBe(true);
  });

  it('puts Pro kitchens first on the home screen and in Taste', () => {
    const plain = kitchen({ id: 'a' });
    const pro = kitchen({ id: 'b', pro: startSubscription(kitchen(), 'yearly', daysFrom(-1)) });
    const featured = featuredKitchens([plain, pro], NOW, { isOpen: () => true });
    expect(featured.map((r) => r.id)).toEqual(['b', 'a']);
    const feed = tasteFeed([plain, pro], NOW);
    if (feed.length) expect(feed[0].restaurant.id).toBe('b');
  });
});

describe('alerts to followers', () => {
  it('allows two a week, only for Pro kitchens', () => {
    const alert = (id: string, at: Date) => ({
      type: 'sendAlert' as const,
      alert: { id, restaurantId: 'k1', restaurantName: 'Susie’s Sweets', text: 'Bake day is open', at: iso(at) },
    });
    expect(reducer(withKitchen(kitchen()), alert('a1', NOW)).alerts).toHaveLength(0);
    let state = withKitchen(kitchen({ pro: startSubscription(kitchen(), 'monthly', daysFrom(-10)) }));
    state = reducer(state, alert('a1', daysFrom(-1)));
    state = reducer(state, alert('a2', NOW));
    state = reducer(state, alert('a3', NOW));
    expect(state.alerts.map((a) => a.id)).toEqual(['a1', 'a2']);
    expect(alertsLeft(state.alerts, 'k1', NOW)).toBe(0);
    expect(alertsLeft(state.alerts, 'k1', daysFrom(6.5))).toBe(ALERTS_PER_WEEK - 1);
  });

  it('reach customers who saved the kitchen, in Activity', () => {
    const alerts = [{ id: 'a', restaurantId: 'k1', restaurantName: 'Susie’s Sweets', text: 'Cobbler is back', at: iso(NOW) }];
    expect(followedAlerts(alerts, [], NOW)).toHaveLength(0);
    const mine = followedAlerts(alerts, ['k1'], NOW);
    const items = buildActivity([], 'c1', [], { alerts: mine });
    expect(items[0]).toMatchObject({ kind: 'alert', restaurantId: 'k1', body: 'Cobbler is back' });
  });
});

describe('drops', () => {
  const draft = {
    title: 'Holiday pies',
    note: '',
    itemIds: ['ss_pound_cake'],
    date: '2026-11-25',
    pickupStart: '10:00',
    pickupEnd: '14:00',
    closeDaysBefore: 2,
  };

  it('checks a drop and sets its deadline at 8 PM before pickup', () => {
    const result = checkDrop(draft, susie.menu, NOW);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.closesAt.getDate()).toBe(23);
    expect(result.closesAt.getHours()).toBe(20);
    expect(checkDrop({ ...draft, itemIds: [] }, susie.menu, NOW)).toMatchObject({ ok: false });
    expect(checkDrop({ ...draft, pickupEnd: '09:00' }, susie.menu, NOW)).toMatchObject({ ok: false });
    const drop: Drop = {
      id: 'd',
      title: draft.title,
      itemIds: draft.itemIds,
      pickupStart: iso(result.pickupStart),
      pickupEnd: iso(result.pickupEnd),
      closesAt: iso(result.closesAt),
      createdAt: iso(NOW),
    };
    expect(draftFromDrop(drop)).toMatchObject({ date: '2026-11-25', pickupStart: '10:00', closeDaysBefore: 2 });
  });

  it('keeps drop-only dishes off the everyday menu and drop carts separate', () => {
    expect(everydayMenu(susie.menu).some((m) => m.dropOnly)).toBe(false);
    expect(openDrops(susie, NOW).length).toBeGreaterThan(0);
    let state = withKitchen(kitchen());
    state = reducer(state, { type: 'addToCart', restaurantId: 'k1', itemId: 'ss_pound_cake' });
    state = reducer(state, { type: 'addToCart', restaurantId: 'k1', itemId: 'ss_gift_loaves', dropId: 'd1' });
    expect(state.cart).toEqual({ restaurantId: 'k1', dropId: 'd1', lines: [{ itemId: 'ss_gift_loaves', quantity: 1 }] });
  });

  it('needs Pro to make a drop, and keeps drops that have orders', () => {
    const drop: Drop = {
      id: 'd1',
      title: 'Pies',
      itemIds: ['ss_pound_cake'],
      pickupStart: iso(daysFrom(5)),
      pickupEnd: iso(daysFrom(5.2)),
      closesAt: iso(daysFrom(3)),
      createdAt: iso(NOW),
    };
    expect(reducer(withKitchen(kitchen()), { type: 'saveDrop', restaurantId: 'k1', drop }).restaurants[0].drops).toEqual([]);
    let state = withKitchen(kitchen({ pro: startSubscription(kitchen(), 'monthly', daysFrom(-1)) }), {
      orders: [order({ dropId: 'd1', status: 'placed' })],
    });
    state = reducer(state, { type: 'saveDrop', restaurantId: 'k1', drop });
    state = reducer(state, { type: 'deleteDrop', restaurantId: 'k1', dropId: 'd1' });
    expect(state.restaurants[0].drops).toHaveLength(1);
    state = reducer(state, { type: 'closeDrop', restaurantId: 'k1', dropId: 'd1', at: iso(NOW) });
    expect(openDrops(state.restaurants[0], daysFrom(0.01))).toHaveLength(0);
  });
});

describe('custom orders', () => {
  const request: CustomRequest = {
    id: 'r1',
    restaurantId: 'k1',
    restaurantName: 'Susie’s Sweets',
    customerId: 'c1',
    customerName: 'Maya',
    occasion: 'Birthday cake',
    details: 'Two layers, chocolate, strawberry filling.',
    servings: 20,
    neededBy: requestDateOptions(NOW)[4],
    createdAt: iso(NOW),
    status: 'open',
  };

  it('checks requests and only lets Pro kitchens take them', () => {
    const draft = { occasion: 'Birthday cake', details: request.details, servings: '20', neededBy: request.neededBy, budget: '' };
    expect(checkRequest(draft, NOW)).toBeNull();
    expect(checkRequest({ ...draft, neededBy: '2026-11-12' }, NOW)).toMatch(/3 days/);
    expect(acceptsCustomOrders(kitchen(), NOW)).toBe(false);
    expect(acceptsCustomOrders(kitchen({ pro: startSubscription(kitchen(), 'monthly', NOW) }), NOW)).toBe(true);
  });

  it('turns an accepted quote into an accepted order with both fees', () => {
    const k = kitchen({ pro: startSubscription(kitchen(), 'monthly', daysFrom(-1)) });
    const window = quoteWindow(request.neededBy, '10:00', '12:00', NOW);
    expect(window.ok).toBe(true);
    if (!window.ok) return;
    let state = withKitchen(k);
    state = reducer(state, { type: 'requestCustom', request });
    state = reducer(state, {
      type: 'quoteCustom',
      requestId: 'r1',
      quote: { priceCents: 8500, note: 'Happy to!', pickupStart: window.pickupStart, pickupEnd: window.pickupEnd, at: iso(NOW) },
    });
    expect(buildActivity([], 'c1', [], { requests: state.customRequests })[0].kind).toBe('quote');
    state = reducer(state, { type: 'acceptQuote', requestId: 'r1', customerId: 'c1', orderId: 'o9', at: iso(NOW) });
    const placed = state.orders.find((o) => o.id === 'o9')!;
    expect(placed).toMatchObject({ status: 'accepted', subtotalCents: 8500, movementFeeCents: 850, kitchenFeeCents: 425, totalCents: 9350 });
    expect(state.customRequests[0]).toMatchObject({ status: 'accepted', orderId: 'o9' });
    // Someone else can't accept it, and it can't be accepted twice.
    expect(reducer(state, { type: 'acceptQuote', requestId: 'r1', customerId: 'c1', orderId: 'o10', at: iso(NOW) }).orders).toHaveLength(1);
    expect(orderFromQuote(request, state.customRequests[0].quote!, k, 'x', NOW).lines[0].name).toBe('Custom: Birthday cake');
  });
});

describe('discount codes', () => {
  const code: DiscountCode = {
    id: 'c',
    code: 'WELCOME15',
    kind: 'percent',
    value: 15,
    newCustomersOnly: true,
    maxUses: 2,
    endsAt: null,
    createdAt: iso(NOW),
  };

  it('checks codes and takes the discount off the food, paid by the kitchen', () => {
    const k = kitchen({ discountCodes: [code] });
    expect(applyCode(k, 'welcome15', 3000, 'c1', [], NOW)).toMatchObject({ ok: true, discountCents: 450 });
    expect(applyCode(k, 'NOPE', 3000, 'c1', [], NOW)).toMatchObject({ ok: false });
    expect(applyCode(k, 'WELCOME15', 3000, 'c1', [order({ customerId: 'c1' })], NOW)).toMatchObject({ ok: false });
    const used = [order({ id: 'x', customerId: 'z1', discountCode: 'WELCOME15' }), order({ id: 'y', customerId: 'z2', discountCode: 'WELCOME15' })];
    expect(applyCode(k, 'WELCOME15', 3000, 'c2', used, NOW)).toMatchObject({ ok: false });
    expect(discountFor({ kind: 'amount', value: 500 }, 300)).toBe(300);
    expect(checkCodeDraft({ ...code, code: 'AB' }, [], null)).toMatch(/3 to 15/);
    expect(kitchenPayout({ subtotalCents: 3000, discountCents: 450, tipCents: 0, kitchenFeeCents: 128 })).toBe(2422);
  });
});

describe('insights and labels', () => {
  it('finds regulars, best sellers and busy days', () => {
    const orders = [
      order({ id: 'a', customerId: 'c1', createdAt: iso(daysFrom(-1)) }),
      order({ id: 'b', customerId: 'c1', createdAt: iso(daysFrom(-3)) }),
      order({ id: 'c', customerId: 'c2', customerName: 'Leo', createdAt: iso(daysFrom(-2)) }),
    ];
    const ins = kitchenInsights(orders, 'k1', NOW);
    expect(ins.regulars).toEqual([expect.objectContaining({ name: 'Maya', orders: 2 })]);
    expect(ins.repeatRate).toBe(0.5);
    expect(ins.bestSellers[0]).toEqual({ name: 'Earl Grey Pound Cake', quantity: 3 });
    expect(ins.weekdays.reduce((t, d) => t + d.cents, 0)).toBe(3 * (1800 - 90));
  });

  it('builds label lines and says what is missing', () => {
    expect(allergenLine(['dairy', 'eggs'])).toBe('Contains: Dairy, Eggs');
    expect(allergenLine([])).toBeNull();
    expect(labelGaps({ ingredients: 'Flour', netWeight: '' }, '5 Willow Way')).toEqual(['net weight']);
  });
});
