import { describe, expect, it } from '@jest/globals';

import {
  addressRow,
  averageRating,
  menuItemRow,
  orderFromRow,
  placeOrderArgs,
  profileFromRow,
  profileUpdate,
  restaurantFromRow,
  restaurantUpdate,
  reviewFromRow,
  toAppTime,
} from '@/lib/db/mappers';
import type { MenuItemRow, OrderWithChildren, ProfileRow, RestaurantRow } from '@/lib/db/rows';

const url = (path: string) => `https://cdn.example/${path}`;

const restaurantRow: RestaurantRow = {
  id: 'r1',
  owner_id: 'u1',
  name: 'Susie’s Sweets',
  chef_name: 'Mrs. Susie',
  chef_bio: 'Forty years of bake sales.',
  chef_photo_path: 'r1/chef.jpg',
  cuisine: 'Bakery',
  categories: ['bakery', 'meal-preppers'],
  logo_path: null,
  cover_paths: ['r1/a.jpg', 'r1/b.jpg'],
  neighborhood: 'College Park',
  city: 'Orlando',
  state: 'FL',
  zip: '32804',
  timezone: 'America/New_York',
  working_days: ['tuesday', 'saturday', 'funday'],
  open_time: '09:00:00',
  close_time: '17:30:00',
  day_hours: { saturday: { open: '10:00:00', close: '14:00:00' }, funday: { open: '01:00', close: '02:00' } },
  prep_minutes: 35,
  verified: true,
  founding: true,
  licensed: true,
  law_attested_at: '2026-11-02T12:00:00Z',
  in_person: [{ place: 'Lantern Coffee', when: 'Saturdays' }],
  accent: 'berry',
  tagline: 'Pound cakes, the Macon way',
  update_text: 'Sweet potato pie is back',
  update_posted_at: '2026-11-05T12:00:00Z',
  update_photo_path: 'r1/update.jpg',
  intro_video_path: 'r1/hello.mp4',
  instagram: 'susiessweets',
  order_mode: 'bake-days',
  bake_days: [
    { day: 'saturday', pickupStart: '09:00', pickupEnd: '12:00', closeDaysBefore: 1 },
    { day: 'someday', pickupStart: '09:00', pickupEnd: '12:00', closeDaysBefore: 1 },
  ],
  skipped_bake_days: ['2026-11-28'],
  accepting_orders: true,
  has_offer: false,
  status: 'pending_review',
  signature_item_id: 'm2',
  rating_sum: 47,
  rating_count: 10,
  live_since: '2026-04-10T12:00:00Z',
  pro_plan: 'yearly',
  pro_started_at: '2026-10-01T12:00:00Z',
  pro_billing_starts_at: '2026-10-01T12:00:00Z',
  pro_canceled_at: null,
  created_at: '2026-04-03T12:00:00Z',
};

const menuRow = (id: string, position: number, extra: Partial<MenuItemRow> = {}): MenuItemRow => ({
  id,
  restaurant_id: 'r1',
  name: `Dish ${id}`,
  description: '',
  price_cents: 1200,
  available: true,
  photo_path: null,
  dietary: ['vegetarian', 'keto'],
  allergens: ['eggs', 'glitter'],
  daily_limit: null,
  section: null,
  position,
  drop_only: false,
  ingredients: '',
  net_weight: '',
  created_at: '2026-04-03T12:00:00Z',
  ...extra,
});

describe('database mappers', () => {
  it('reads times and ratings the way the app stores them', () => {
    expect(toAppTime('09:00:00')).toBe('09:00');
    expect(toAppTime(null)).toBe('');
    expect(averageRating(47, 10)).toBe(4.7);
    expect(averageRating(0, 0)).toBe(0);
  });

  it('builds a kitchen from its rows and drops values the app does not know', () => {
    const r = restaurantFromRow(restaurantRow, url, {
      menu: [menuRow('m2', 1, { photo_path: 'r1/m2.jpg' }), menuRow('m1', 0)],
      address: { restaurant_id: 'r1', address: '5 Willow Way', instructions: 'Cooler on the porch', photo_path: 'r1/porch.jpg' },
      privateUrl: (path) => `https://signed.example/${path}`,
      popularItemIds: new Set(['m1']),
    });
    expect(r).toMatchObject({
      ownerId: 'u1',
      chefPhotoUri: 'https://cdn.example/r1/chef.jpg',
      coverUris: ['https://cdn.example/r1/a.jpg', 'https://cdn.example/r1/b.jpg'],
      categories: ['bakery'],
      workingDays: ['tuesday', 'saturday'],
      openTime: '09:00',
      closeTime: '17:30',
      dayHours: { saturday: { open: '10:00', close: '14:00' } },
      rating: 4.7,
      ratingCount: 10,
      areaCode: '32804',
      address: '5 Willow Way',
      state: 'FL',
      licensed: true,
      lawAttestedAt: '2026-11-02T12:00:00Z',
      pickupInstructions: 'Cooler on the porch',
      orderMode: 'bake-days',
      bakeDays: [{ day: 'saturday', pickupStart: '09:00', pickupEnd: '12:00', closeDaysBefore: 1 }],
      skippedBakeDays: ['2026-11-28'],
      signatureItemId: 'm2',
      status: 'draft',
      accent: 'berry',
      tagline: 'Pound cakes, the Macon way',
      update: { text: 'Sweet potato pie is back', postedAt: '2026-11-05T12:00:00Z' },
      instagram: 'susiessweets',
    });
    expect(restaurantFromRow({ ...restaurantRow, accent: 'neon', update_text: '', update_photo_path: null }, url)).toMatchObject({
      accent: undefined,
      update: undefined,
    });
    expect(r.logoUri).toBeUndefined();
    expect(r.menu.map((m) => m.id)).toEqual(['m1', 'm2']);
    expect(r.menu[0]).toMatchObject({ popular: true, dietary: ['vegetarian'], allergens: ['eggs'], section: '' });
    expect(r.menu[1].popular).toBeUndefined();
    expect(r.menu[1].photoUri).toBe('https://cdn.example/r1/m2.jpg');
    expect(restaurantFromRow({ ...restaurantRow, status: 'live' }, url).status).toBe('live');
  });

  it('round-trips the fields a chef can edit, and never writes protected ones', () => {
    const r = restaurantFromRow(restaurantRow, url);
    const update = restaurantUpdate(r, { coverPaths: ['a', 'b', 'c', 'd'], logoPath: null, chefPhotoPath: 'r1/chef.jpg' });
    expect(update).toMatchObject({
      name: 'Susie’s Sweets',
      zip: '32804',
      open_time: '09:00',
      cover_paths: ['a', 'b', 'c'],
      accent: 'berry',
      update_text: 'Sweet potato pie is back',
      instagram: 'susiessweets',
      order_mode: 'bake-days',
      bake_days: [{ day: 'saturday', pickupStart: '09:00', pickupEnd: '12:00', closeDaysBefore: 1 }],
      state: 'FL',
      timezone: 'America/New_York',
    });
    expect(addressRow({ ...r, address: ' 5 Willow Way ', pickupInstructions: ' Ring once ' })).toEqual({
      restaurant_id: 'r1',
      address: '5 Willow Way',
      instructions: 'Ring once',
      photo_path: null,
    });
    expect(restaurantUpdate({ ...r, accent: undefined, update: { text: ' ', postedAt: 'x' }, instagram: '@Bad Handle!' }, {
      coverPaths: [],
      logoPath: null,
      chefPhotoPath: null,
    })).toMatchObject({ accent: 'champagne', update_text: '', update_posted_at: null, instagram: '' });
    expect(update.law_attested_at).toBe('2026-11-02T12:00:00Z');
    for (const key of ['verified', 'founding', 'licensed', 'status', 'rating_sum', 'rating_count', 'owner_id']) {
      expect(update).not.toHaveProperty(key);
    }
  });

  it('saves a menu item with its position and an empty section as null', () => {
    const item = restaurantFromRow(restaurantRow, url, { menu: [menuRow('m1', 0)] }).menu[0];
    expect(menuItemRow({ ...item, name: '  Pie ' }, 'r1', 3, 'r1/pie.jpg')).toMatchObject({
      restaurant_id: 'r1',
      name: 'Pie',
      position: 3,
      section: null,
      photo_path: 'r1/pie.jpg',
    });
  });

  it('builds an order with its history in time order', () => {
    const row: OrderWithChildren = {
      id: 'o1',
      customer_id: 'c1',
      restaurant_id: 'r1',
      status: 'accepted',
      customer_name: 'Bea F.',
      restaurant_name: 'Susie’s Sweets',
      subtotal_cents: 3300,
      movement_fee_cents: 165,
      kitchen_fee_cents: 83,
      discount_code: null,
      discount_cents: 0,
      drop_id: null,
      tip_cents: 300,
      total_cents: 3765,
      pickup_address: '5 Willow Way, Orlando',
      pickup_instructions: 'Cooler on the porch',
      pickup_photo_path: 'r1/porch.jpg',
      pickup_by: '2026-11-07T19:00:00Z',
      arrived_at: null,
      customer_note: 'No nuts',
      chef_note: '',
      scheduled_for: null,
      estimated_ready_at: '2026-11-07T16:00:00Z',
      created_at: '2026-11-07T15:20:00Z',
      order_lines: [{ order_id: 'o1', menu_item_id: 'm1', name: 'Pie', price_cents: 1650, quantity: 2 }],
      order_status_events: [
        { status: 'accepted', at: '2026-11-07T15:22:00Z' },
        { status: 'placed', at: '2026-11-07T15:20:00Z' },
      ],
    };
    const o = orderFromRow(row);
    expect(o.statusHistory.map((h) => h.status)).toEqual(['placed', 'accepted']);
    expect(o.lines).toEqual([{ itemId: 'm1', name: 'Pie', priceCents: 1650, quantity: 2 }]);
    expect(o).toMatchObject({
      customerName: 'Bea F.',
      restaurantName: 'Susie’s Sweets',
      movementFeeCents: 165,
      tipCents: 300,
      pickupInstructions: 'Cooler on the porch',
      pickupBy: '2026-11-07T19:00:00Z',
    });
    expect(o.arrivedAt).toBeUndefined();
    expect(orderFromRow({ ...row, order_status_events: [] }).statusHistory).toEqual([
      { status: 'placed', at: '2026-11-07T15:20:00Z' },
    ]);
  });

  it('sends only ids and quantities when placing an order', () => {
    const args = placeOrderArgs({
      restaurantId: 'r1',
      lines: [{ itemId: 'm1', quantity: 2 }],
      customerNote: '  Extra crispy  ',
      scheduledFor: null,
      tipCents: 200,
    });
    expect(args).toEqual({
      p_restaurant_id: 'r1',
      p_lines: [{ menu_item_id: 'm1', quantity: 2 }],
      p_customer_note: 'Extra crispy',
      p_scheduled_for: null,
      p_tip_cents: 200,
      p_drop_id: null,
      p_discount_code: null,
    });
  });

  it('maps profiles and reviews', () => {
    const row: ProfileRow = {
      id: 'u1',
      name: 'Bea Foodie',
      email: null,
      phone: '+14075550100',
      role: 'foodie',
      neighborhood: 'College Park',
      dietary: ['vegan'],
      avoid_allergens: ['peanuts'],
      is_admin: false,
      deleted_at: null,
      created_at: '2026-11-01T00:00:00Z',
    };
    expect(profileFromRow(row)).toEqual({
      id: 'u1',
      name: 'Bea Foodie',
      email: '',
      phone: '+14075550100',
      role: 'foodie',
      neighborhood: 'College Park',
      dietary: ['vegan'],
      avoidAllergens: ['peanuts'],
    });
    expect(profileUpdate({ email: '  ', avoidAllergens: [] })).toEqual({ email: null, avoid_allergens: [] });
    expect(
      reviewFromRow({
        id: 'v1',
        order_id: 'o1',
        restaurant_id: 'r1',
        customer_id: 'c1',
        customer_name: 'Bea F.',
        stars: 5,
        tags: ['Tasted like home'],
        text: 'Wonderful',
        created_at: '2026-11-07T18:00:00Z',
      }),
    ).toMatchObject({ orderId: 'o1', customerName: 'Bea F.', stars: 5 });
  });
});

describe('photos and video from the backend', () => {
  it('reads the update photo and intro video from public storage, and the pickup photo from private storage', () => {
    const r = restaurantFromRow(restaurantRow, url, {
      address: { restaurant_id: 'r1', address: '5 Willow Way', instructions: '', photo_path: 'r1/porch.jpg' },
      privateUrl: (path) => `https://signed.example/${path}`,
    });
    expect(r.update?.photoUri).toBe('https://cdn.example/r1/update.jpg');
    expect(r.introVideoUri).toBe('https://cdn.example/r1/hello.mp4');
    expect(r.pickupPhotoUri).toBe('https://signed.example/r1/porch.jpg');
    expect(restaurantFromRow(restaurantRow, url, { address: { restaurant_id: 'r1', address: '', instructions: '', photo_path: 'x' } }).pickupPhotoUri).toBeUndefined();
  });

  it('stores the pickup photo path only when the kitchen has a pickup photo', () => {
    const r = restaurantFromRow(restaurantRow, url);
    expect(addressRow({ ...r, pickupPhotoUri: 'file:///porch.jpg' }, 'r1/porch.jpg').photo_path).toBe('r1/porch.jpg');
    expect(addressRow({ ...r, pickupPhotoUri: undefined }, 'r1/porch.jpg').photo_path).toBeNull();
  });
});
