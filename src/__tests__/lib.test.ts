import { describe, expect, it } from '@jest/globals';
import { SAMPLE_RESTAURANTS } from '@/data/sample-restaurants';
import { browseRestaurants, cuisineTags, DEFAULT_FILTERS, isNew } from '@/lib/browse';
import { formatTime, isOpenAt, TIME_SLOTS, toMinutes } from '@/lib/hours';
import { normalizeMenuItem } from '@/lib/migrate';
import { formatCents, parsePriceToCents } from '@/lib/money';
import { computeCartTotals } from '@/lib/pricing';
import { blankRestaurant, currentStep, isInformationComplete } from '@/lib/setup';
import { formatUsPhone, isValidEmail, isValidUsPhone, isValidZip } from '@/lib/validation';
import type { MenuItem, Restaurant } from '@/types';

describe('money', () => {
  it('formats cents as dollars', () => {
    expect(formatCents(0)).toBe('$0.00');
    expect(formatCents(1499)).toBe('$14.99');
    expect(formatCents(5)).toBe('$0.05');
    expect(formatCents(-250)).toBe('-$2.50');
  });

  it('parses prices', () => {
    expect(parsePriceToCents('12')).toBe(1200);
    expect(parsePriceToCents('12.5')).toBe(1250);
    expect(parsePriceToCents('$12.05')).toBe(1205);
    expect(parsePriceToCents(' 0.99 ')).toBe(99);
    expect(parsePriceToCents('12.345')).toBeNull();
    expect(parsePriceToCents('abc')).toBeNull();
    expect(parsePriceToCents('')).toBeNull();
  });
});

describe('pricing', () => {
  const menu: MenuItem[] = [
    normalizeMenuItem({ id: 'a', name: 'A', priceCents: 1000 }),
    normalizeMenuItem({ id: 'b', name: 'B', priceCents: 550 }),
    normalizeMenuItem({ id: 'c', name: 'C', priceCents: 900, available: false }),
  ];

  it('totals the cart with fees', () => {
    const totals = computeCartTotals(
      { restaurantId: 'r', lines: [{ itemId: 'a', quantity: 2 }, { itemId: 'b', quantity: 1 }] },
      menu,
    );
    expect(totals.itemCount).toBe(3);
    expect(totals.subtotalCents).toBe(2550);
    // A single 5% movement fee and no delivery fee: orders are picked up.
    expect(totals.movementFeeCents).toBe(128);
    expect(totals.totalCents).toBe(2550 + 128);
  });

  it('skips unavailable and unknown items, and charges nothing for an empty cart', () => {
    const totals = computeCartTotals(
      { restaurantId: 'r', lines: [{ itemId: 'c', quantity: 1 }, { itemId: 'zzz', quantity: 1 }] },
      menu,
    );
    expect(totals.lines).toHaveLength(0);
    expect(totals.totalCents).toBe(0);
  });
});

describe('hours', () => {
  // 2026-11-05 is a Thursday.
  const at = (hh: number, mm = 0, day = 5) => new Date(2026, 10, day, hh, mm);

  it('parses and formats times', () => {
    expect(toMinutes('00:00')).toBe(0);
    expect(toMinutes('13:30')).toBe(810);
    expect(() => toMinutes('25:00')).toThrow();
    expect(formatTime('00:00')).toBe('12:00 AM');
    expect(formatTime('12:00')).toBe('12:00 PM');
    expect(formatTime('18:30')).toBe('6:30 PM');
    expect(TIME_SLOTS).toHaveLength(48);
    expect(formatTime('')).toBe('—');
    expect(isOpenAt({ workingDays: ['thursday'], openTime: '', closeTime: '' }, new Date())).toBe(false);
  });

  it('handles same-day hours', () => {
    const s = { workingDays: ['thursday' as const], openTime: '09:00', closeTime: '17:00' };
    expect(isOpenAt(s, at(8, 59))).toBe(false);
    expect(isOpenAt(s, at(9))).toBe(true);
    expect(isOpenAt(s, at(16, 59))).toBe(true);
    expect(isOpenAt(s, at(17))).toBe(false);
    expect(isOpenAt(s, at(12, 0, 6))).toBe(false); // Friday
  });

  it('handles overnight hours, crediting early morning to the previous day', () => {
    const s = { workingDays: ['thursday' as const], openTime: '20:00', closeTime: '02:00' };
    expect(isOpenAt(s, at(21))).toBe(true); // Thu 9pm
    expect(isOpenAt(s, at(1, 0, 6))).toBe(true); // Fri 1am, Thursday's shift
    expect(isOpenAt(s, at(1))).toBe(false); // Thu 1am belongs to Wednesday
    expect(isOpenAt(s, at(3, 0, 6))).toBe(false);
  });
});

describe('validation', () => {
  it('validates email, phone and zip', () => {
    expect(isValidEmail('chef@example.com')).toBe(true);
    expect(isValidEmail('nope')).toBe(false);
    expect(isValidUsPhone('(979) 379-3817')).toBe(true);
    expect(isValidUsPhone('12345')).toBe(false);
    expect(formatUsPhone('9793793817')).toBe('(979) 379-3817');
    expect(formatUsPhone('979')).toBe('979');
    expect(isValidZip('77002')).toBe(true);
    expect(isValidZip('7700')).toBe(false);
  });
});

describe('browse', () => {
  const now = new Date('2026-11-05T12:00:00.000Z');

  it('only lists live restaurants', () => {
    const draft: Restaurant = { ...SAMPLE_RESTAURANTS[0], id: 'draft', status: 'draft' };
    const ids = browseRestaurants([draft, ...SAMPLE_RESTAURANTS], DEFAULT_FILTERS, now).map((r) => r.id);
    expect(ids).not.toContain('draft');
    expect(ids).toHaveLength(SAMPLE_RESTAURANTS.length);
  });

  it('searches names, chefs and dishes', () => {
    const search = (query: string) =>
      browseRestaurants(SAMPLE_RESTAURANTS, { ...DEFAULT_FILTERS, query }, now).map((r) => r.name);
    expect(search('polenta')).toEqual(['Cafe Parmesan']);
    expect(search('mrs. susie')).toEqual(['Susie’s Sweets']);
    expect(search('GIZZADA')).toEqual(['Blue Mountain Bakehouse']);
    expect(search('no such food')).toEqual([]);
  });

  it('filters by category, cuisine, rating and offers', () => {
    const vegan = browseRestaurants(SAMPLE_RESTAURANTS, { ...DEFAULT_FILTERS, category: 'vegan' }, now);
    expect(vegan.map((r) => r.name)).toEqual(['The Green Pantry']);

    const italian = browseRestaurants(SAMPLE_RESTAURANTS, { ...DEFAULT_FILTERS, cuisines: ['Italian'] }, now);
    expect(italian.every((r) => cuisineTags(r).includes('Italian'))).toBe(true);

    const top = browseRestaurants(SAMPLE_RESTAURANTS, { ...DEFAULT_FILTERS, minRating: 4.7 }, now);
    expect(top.every((r) => r.rating >= 4.7)).toBe(true);

    const offers = browseRestaurants(SAMPLE_RESTAURANTS, { ...DEFAULT_FILTERS, offersOnly: true }, now);
    expect(offers.every((r) => r.hasOffer)).toBe(true);
  });

  it('shows only kitchens taking orders right now: open hours or an open bake day', () => {
    const thursdayDawn = new Date(2026, 10, 5, 6, 45);
    const open = browseRestaurants(SAMPLE_RESTAURANTS, { ...DEFAULT_FILTERS, openNow: true }, thursdayDawn);
    // Every hours kitchen is still closed at dawn; the three bake-day kitchens take orders ahead.
    expect(open.map((r) => r.name).sort()).toEqual(['Abuela Rosa’s Panadería', 'Sunrise Bakehouse', 'Susie’s Sweets']);
  });

  it('sorts by rating and flags new kitchens', () => {
    const byRating = browseRestaurants(SAMPLE_RESTAURANTS, { ...DEFAULT_FILTERS, sort: 'rating' }, now);
    for (let i = 1; i < byRating.length; i++) {
      expect(byRating[i - 1].rating).toBeGreaterThanOrEqual(byRating[i].rating);
    }
    const blueMountain = SAMPLE_RESTAURANTS.find((r) => r.id === 'sample_blue_mountain')!;
    expect(isNew(blueMountain, now)).toBe(true);
    const susie = SAMPLE_RESTAURANTS.find((r) => r.id === 'sample_susies_sweets')!;
    expect(isNew(susie, now)).toBe(false);
  });
});

describe('chef setup', () => {
  const user = {
    id: 'u1',
    name: 'Susie',
    email: 's@example.com',
    phone: '+15555550100',
    role: 'chef' as const,
    neighborhood: '',
  };

  it('walks through the steps in order', () => {
    const r = blankRestaurant(user, 'r1');
    expect(currentStep(undefined)).toBe('information');
    expect(currentStep(r)).toBe('information');

    const withInfo: Restaurant = {
      ...r,
      name: 'Susie’s',
      cuisine: 'Italian',
      neighborhood: 'College Park',
      address: '1 Main',
      city: 'Orlando',
      areaCode: '32804',
      bakeDays: [{ day: 'saturday', pickupStart: '09:00', pickupEnd: '12:00', closeDaysBefore: 1 }],
    };
    expect(r.orderMode).toBe('bake-days');
    expect(isInformationComplete(withInfo)).toBe(true);
    expect(isInformationComplete({ ...withInfo, neighborhood: '' })).toBe(false);
    expect(isInformationComplete({ ...withInfo, bakeDays: [] })).toBe(false);
    // Kitchens on set hours need days and hours instead.
    const hours: Restaurant = { ...withInfo, orderMode: 'hours', bakeDays: [] };
    expect(isInformationComplete(hours)).toBe(false);
    expect(isInformationComplete({ ...hours, workingDays: ['monday'], openTime: '09:00', closeTime: '17:00' })).toBe(true);
    expect(currentStep(withInfo)).toBe('documents');

    const withDocs: Restaurant = {
      ...withInfo,
      documents: [
        { kind: 'government-id', fileName: 'id.pdf', uri: 'file://id' },
        { kind: 'food-handler', fileName: 'card.pdf', uri: 'file://card' },
      ],
    };
    expect(currentStep(withDocs)).toBe('menu');

    const withMenu: Restaurant = {
      ...withDocs,
      menu: [normalizeMenuItem({ id: 'm', name: 'Lasagna', priceCents: 1500 })],
    };
    expect(currentStep(withMenu)).toBe('preview');
  });

  it('rejects matching open and close times', () => {
    const r: Restaurant = {
      ...blankRestaurant(user, 'r1'),
      name: 'X',
      cuisine: 'Thai',
      neighborhood: 'College Park',
      address: '1 Main',
      city: 'Orlando',
      areaCode: '32804',
      workingDays: ['monday'],
      openTime: '09:00',
      closeTime: '09:00',
    };
    expect(isInformationComplete(r)).toBe(false);
  });
});
