import { describe, expect, it } from '@jest/globals';

import { COLLECTIONS, collectionKitchens } from '@/data/collections';
import { SAMPLE_RESTAURANTS } from '@/data/sample-restaurants';
import { buildActivity, unseenCount } from '@/lib/activity';
import { allergenConflicts, conflictSentence, dishFits, kitchenFits } from '@/lib/diet';
import { soldToday } from '@/lib/limits';
import { groupMenu, kitchenShareMessage } from '@/lib/menu';
import { tipFor } from '@/lib/pricing';
import { publicName, relativeDay, withReviews } from '@/lib/reviews';
import { availableSlots, dayLabel } from '@/lib/schedule';
import { INITIAL_STATE, reducer } from '@/state/reducer';
import type { Order, Review } from '@/types';

function order(partial: Partial<Order>): Order {
  return {
    id: 'o1',
    customerId: 'me',
    customerName: 'Ada Lovelace',
    restaurantId: 'r1',
    restaurantName: 'R',
    lines: [{ itemId: 'x', name: 'X', priceCents: 100, quantity: 2 }],
    subtotalCents: 200,
    serviceFeeCents: 20,
    deliveryFeeCents: 299,
    totalCents: 519,
    deliveryAddress: '',
    status: 'completed',
    statusHistory: [],
    chefNote: '',
    customerNote: '',
    createdAt: new Date(2026, 10, 5, 12).toISOString(),
    estimatedReadyAt: new Date(2026, 10, 5, 12, 30).toISOString(),
    scheduledFor: null,
    ...partial,
  };
}

const review = (partial: Partial<Review> = {}): Review => ({
  id: 'rv1',
  orderId: 'o1',
  restaurantId: 'r1',
  customerId: 'me',
  customerName: 'Ada L.',
  stars: 5,
  tags: ['Tasted like home'],
  text: '  Wonderful.  ',
  createdAt: new Date(2026, 10, 5, 14).toISOString(),
  ...partial,
});

describe('reviews', () => {
  it('shows only a first name and last initial', () => {
    expect(publicName('Ada Lovelace')).toBe('Ada L.');
    expect(publicName('  mary jane watson ')).toBe('mary W.');
    expect(publicName('Cher')).toBe('Cher');
    expect(publicName('')).toBe('A neighbor');
  });

  it('folds in-app reviews into the rating', () => {
    const base = { ...SAMPLE_RESTAURANTS[0], id: 'r1', rating: 4.0, ratingCount: 4 };
    const rated = withReviews(base, [review({ stars: 5 }), review({ id: 'rv2', stars: 5, restaurantId: 'other' })]);
    expect(rated.ratingCount).toBe(5);
    expect(rated.rating).toBe(4.2);
    expect(withReviews(base, [])).toBe(base);
  });

  it('accepts one review per delivered order from its customer', () => {
    let s = reducer({ ...INITIAL_STATE, hydrated: true }, { type: 'placeOrder', order: order({}) });
    s = reducer(s, { type: 'addReview', review: review({ stars: 9 }) });
    expect(s.reviews).toHaveLength(1);
    expect(s.reviews[0].stars).toBe(5);
    expect(s.reviews[0].text).toBe('Wonderful.');
    s = reducer(s, { type: 'addReview', review: review({ id: 'again' }) });
    expect(s.reviews).toHaveLength(1);
    const stranger = reducer(s, { type: 'addReview', review: review({ id: 'x', customerId: 'other', orderId: 'o1' }) });
    expect(stranger.reviews).toHaveLength(1);
  });

  it('refuses reviews for orders that are not delivered yet', () => {
    let s = reducer({ ...INITIAL_STATE, hydrated: true }, { type: 'placeOrder', order: order({ status: 'preparing' }) });
    s = reducer(s, { type: 'addReview', review: review() });
    expect(s.reviews).toHaveLength(0);
  });

  it('describes dates relative to today', () => {
    const now = new Date(2026, 10, 5, 18);
    expect(relativeDay(new Date(2026, 10, 5, 9).toISOString(), now)).toBe('Today');
    expect(relativeDay(new Date(2026, 10, 4, 9).toISOString(), now)).toBe('Yesterday');
    expect(relativeDay(new Date(2026, 10, 2, 9).toISOString(), now)).toBe('3 days ago');
  });
});

describe('scheduling', () => {
  const sunrise = SAMPLE_RESTAURANTS.find((r) => r.id === 'sample_sunrise_plates')!; // 6:30–12:00 daily, 25 min prep

  it('offers half-hour slots within opening hours, after prep time', () => {
    const now = new Date(2026, 10, 5, 10, 50); // Thu 10:50 -> ready at 11:15 -> first slot 11:30
    const slots = availableSlots(sunrise, now);
    expect(new Date(slots[0]).getHours()).toBe(11);
    expect(new Date(slots[0]).getMinutes()).toBe(30);
    // Today: 11:30 only. Tomorrow: 6:30 … 11:30 (11 slots).
    expect(slots).toHaveLength(12);
    expect(dayLabel(slots[1], now)).toBe('Tomorrow');
  });

  it('lets people pre-order from a kitchen that is closed now', () => {
    const evening = new Date(2026, 10, 5, 20, 0);
    const slots = availableSlots(sunrise, evening);
    expect(slots.length).toBeGreaterThan(0);
    expect(dayLabel(slots[0], evening)).toBe('Tomorrow');
  });

  it('offers nothing while the kitchen is paused', () => {
    expect(availableSlots({ ...sunrise, acceptingOrders: false }, new Date(2026, 10, 5, 9))).toEqual([]);
  });

  it('counts scheduled orders against the day they are cooked', () => {
    const tomorrow = new Date(2026, 10, 6, 9).toISOString();
    const orders = [order({ status: 'accepted', scheduledFor: tomorrow })];
    expect(soldToday(orders, 'r1', 'x', new Date(2026, 10, 5, 13))).toBe(0);
    expect(soldToday(orders, 'r1', 'x', new Date(2026, 10, 6, 13))).toBe(2);
  });
});

describe('collections', () => {
  it('match kitchens by category or by dish', () => {
    const byId = (id: string) => COLLECTIONS.find((c) => c.id === id)!;
    const names = (id: string) => collectionKitchens(byId(id), SAMPLE_RESTAURANTS).map((r) => r.name).sort();
    expect(names('sweet-endings')).toEqual(['Susie’s Sweets']);
    // The Green Bowl by category; Cafe Parmesan, Momo Mania, Jackson's and Susie's by vegetarian dishes.
    expect(names('plant-powered')).toContain('The Green Bowl');
    expect(names('plant-powered')).toContain('Momo Mania');
    expect(names('plant-powered')).not.toContain('Sunrise Plates');
    for (const c of COLLECTIONS) expect(collectionKitchens(c, SAMPLE_RESTAURANTS).length).toBeGreaterThan(0);
  });
});

describe('activity feed', () => {
  it('lists my order updates and chef notes, newest first, and counts unseen ones', () => {
    const t = (h: number, m = 0) => new Date(2026, 10, 5, h, m).toISOString();
    const mine = order({
      id: 'a',
      restaurantName: 'Momo Mania',
      status: 'accepted',
      statusHistory: [
        { status: 'placed', at: t(12) },
        { status: 'accepted', at: t(12, 5) },
      ],
      chefNote: 'Extra achar for you!',
    });
    const theirs = order({ id: 'b', customerId: 'other', statusHistory: [{ status: 'placed', at: t(13) }] });
    const items = buildActivity([mine, theirs], 'me');
    expect(items.map((i) => i.kind)).toEqual(['note', 'accepted', 'placed']);
    expect(items[1].title).toBe('Momo Mania accepted your order');
    expect(unseenCount(items, null)).toBe(3);
    expect(unseenCount(items, t(12, 1))).toBe(2);
    const s = reducer({ ...INITIAL_STATE, hydrated: true }, { type: 'markActivitySeen', at: t(14) });
    expect(s.activitySeenAt).toBe(t(14));
  });
});

describe('menu sections', () => {
  const dish = (id: string, section?: string) =>
    ({ id, name: id, description: '', priceCents: 100, available: true, dietary: [], allergens: [], dailyLimit: null, section });

  it('keeps one group when nothing is filed', () => {
    const groups = groupMenu([dish('a'), dish('b'), dish('sig')], 'sig');
    expect(groups.map((g) => [g.title, g.items.map((i) => i.id)])).toEqual([
      [null, ['sig']],
      [null, ['a', 'b']],
    ]);
  });

  it('orders sections and puts unfiled dishes last', () => {
    const groups = groupMenu(
      [dish('cake', 'Desserts'), dish('soup'), dish('pasta', 'Mains'), dish('tea', 'Drinks'), dish('sig', 'Mains')],
      'sig',
    );
    expect(groups.map((g) => g.title)).toEqual([null, 'Mains', 'Desserts', 'Drinks', 'More']);
    expect(groups[1].items.map((i) => i.id)).toEqual(['pasta']);
  });

  it('builds a share message with a link', () => {
    const { message, url } = kitchenShareMessage('Susie’s Sweets', 'Mrs. Susie', 'sample_susies_sweets');
    expect(url).toBe('manna://restaurant/sample_susies_sweets');
    expect(message).toContain('Susie’s Sweets by Mrs. Susie');
  });
});

describe('diet and allergy preferences', () => {
  const cobbler = SAMPLE_RESTAURANTS.find((r) => r.id === 'sample_susies_sweets')!;
  const green = SAMPLE_RESTAURANTS.find((r) => r.id === 'sample_green_bowl')!;
  const falafel = green.menu.find((m) => m.id === 'gb_falafel')!; // vegan, dairy-free, contains sesame

  it('flags allergens the customer avoids', () => {
    expect(allergenConflicts(falafel, ['sesame', 'peanuts'])).toEqual(['sesame']);
    expect(conflictSentence(['sesame'])).toBe('Contains sesame, which you avoid');
    expect(conflictSentence([])).toBeNull();
  });

  it('matches dishes against every diet and allergy', () => {
    expect(dishFits(falafel, { dietary: ['vegan'], avoid: [] })).toBe(true);
    expect(dishFits(falafel, { dietary: ['vegan', 'halal'], avoid: [] })).toBe(false);
    expect(dishFits(falafel, { dietary: ['vegan'], avoid: ['sesame'] })).toBe(false);
    expect(dishFits(falafel, { dietary: [], avoid: [] })).toBe(false);
    // Vegan dishes also count as vegetarian and dairy-free.
    expect(dishFits(falafel, { dietary: ['vegetarian', 'dairy-free'], avoid: [] })).toBe(true);
  });

  it('finds kitchens with at least one dish that fits', () => {
    expect(kitchenFits(green, { dietary: ['vegan'], avoid: [] })).toBe(true);
    expect(kitchenFits(cobbler, { dietary: ['vegan'], avoid: [] })).toBe(false);
    expect(kitchenFits(cobbler, { dietary: [], avoid: ['peanuts'] })).toBe(true);
  });
});

describe('recent searches', () => {
  it('keeps the six most recent, newest first, without duplicates', () => {
    let s = { ...INITIAL_STATE, hydrated: true };
    for (const q of ['lasagna', 'momo', ' Lasagna ', 'a', 'cobbler', 'grits', 'ziti', 'tea', 'pie']) {
      s = reducer(s, { type: 'rememberSearch', query: q });
    }
    expect(s.recentSearches).toEqual(['pie', 'tea', 'ziti', 'grits', 'cobbler', 'Lasagna']);
    expect(reducer(s, { type: 'clearSearches' }).recentSearches).toEqual([]);
  });
});

describe('tips', () => {
  it('rounds tips to the nearest quarter and skips zero', () => {
    expect(tipFor(2498, 0)).toBe(0);
    expect(tipFor(2498, 0.15)).toBe(375); // 374.7 -> $3.75
    expect(tipFor(1000, 0.2)).toBe(200);
    expect(tipFor(99, 0.1)).toBe(25); // never a tip smaller than 25¢
    expect(tipFor(0, 0.2)).toBe(0);
  });
});
