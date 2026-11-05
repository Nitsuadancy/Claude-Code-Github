import { describe, expect, it } from '@jest/globals';
import { homeRouteFor } from '@/lib/routing';
import { type AppState, INITIAL_STATE, reducer, toPersisted } from '@/state/reducer';
import type { Order, Restaurant } from '@/types';

const hydrated: AppState = { ...INITIAL_STATE, hydrated: true };

function signedIn(role: 'foodie' | 'chef'): AppState {
  let s = reducer(hydrated, { type: 'completeWelcome' });
  s = reducer(s, { type: 'chooseRole', role });
  s = reducer(s, { type: 'signIn', userId: 'u1', phone: '+15555550100' });
  return reducer(s, { type: 'updateProfile', changes: { name: 'Ada', email: 'ada@example.com' } });
}

describe('onboarding routing', () => {
  it('moves through welcome, role, login and profile', () => {
    expect(homeRouteFor(hydrated, undefined)).toBe('/welcome');
    let s = reducer(hydrated, { type: 'completeWelcome' });
    expect(homeRouteFor(s, undefined)).toBe('/choose-role');
    s = reducer(s, { type: 'chooseRole', role: 'foodie' });
    expect(homeRouteFor(s, undefined)).toBe('/login');
    s = reducer(s, { type: 'signIn', userId: 'u1', phone: '+15555550100' });
    expect(s.user?.role).toBe('foodie');
    expect(homeRouteFor(s, undefined)).toBe('/about-you');
    s = reducer(s, { type: 'updateProfile', changes: { name: 'Ada', email: 'ada@example.com' } });
    expect(homeRouteFor(s, undefined)).toBe('/foodie');
  });

  it('sends chefs to setup until their restaurant is live', () => {
    const s = signedIn('chef');
    expect(homeRouteFor(s, undefined)).toBe('/chef/setup');
    const live = { status: 'live' } as Restaurant;
    expect(homeRouteFor(s, live)).toBe('/chef/dashboard');
  });

  it('keeps the profile when the same number signs in again', () => {
    let s = signedIn('foodie');
    s = reducer(s, { type: 'chooseRole', role: 'chef' });
    s = reducer(s, { type: 'signIn', userId: 'other', phone: '+15555550100' });
    expect(s.user?.id).toBe('u1');
    expect(s.user?.name).toBe('Ada');
    expect(s.user?.role).toBe('chef');
  });

  it('signs out without losing restaurants or orders', () => {
    const s = reducer(
      { ...signedIn('foodie'), restaurants: [{ id: 'r' } as Restaurant] },
      { type: 'signOut' },
    );
    expect(s.user).toBeNull();
    expect(s.restaurants).toHaveLength(1);
  });
});

describe('cart', () => {
  it('adds, increments and removes items', () => {
    let s = signedIn('foodie');
    s = reducer(s, { type: 'addToCart', restaurantId: 'r1', itemId: 'a' });
    s = reducer(s, { type: 'addToCart', restaurantId: 'r1', itemId: 'a' });
    s = reducer(s, { type: 'addToCart', restaurantId: 'r1', itemId: 'b' });
    expect(s.cart).toEqual({
      restaurantId: 'r1',
      lines: [
        { itemId: 'a', quantity: 2 },
        { itemId: 'b', quantity: 1 },
      ],
    });
    s = reducer(s, { type: 'setCartQuantity', itemId: 'a', quantity: 0 });
    s = reducer(s, { type: 'setCartQuantity', itemId: 'b', quantity: 0 });
    expect(s.cart).toEqual({ restaurantId: null, lines: [] });
  });

  it('starts a new cart when adding from a different kitchen', () => {
    let s = signedIn('foodie');
    s = reducer(s, { type: 'addToCart', restaurantId: 'r1', itemId: 'a' });
    s = reducer(s, { type: 'addToCart', restaurantId: 'r2', itemId: 'x' });
    expect(s.cart).toEqual({ restaurantId: 'r2', lines: [{ itemId: 'x', quantity: 1 }] });
  });
});

describe('orders', () => {
  const order: Order = {
    id: 'o1',
    customerId: 'u1',
    customerName: 'Ada',
    restaurantId: 'r1',
    restaurantName: 'Kitchen',
    lines: [],
    subtotalCents: 1000,
    serviceFeeCents: 100,
    deliveryFeeCents: 299,
    totalCents: 1399,
    deliveryAddress: '1 Main',
    status: 'placed',
    createdAt: '2026-11-05T12:00:00.000Z',
  };

  it('placing an order clears the cart', () => {
    let s = reducer(signedIn('foodie'), { type: 'addToCart', restaurantId: 'r1', itemId: 'a' });
    s = reducer(s, { type: 'placeOrder', order });
    expect(s.orders).toHaveLength(1);
    expect(s.cart.lines).toHaveLength(0);
  });

  it('only allows valid status changes', () => {
    let s = reducer(signedIn('chef'), { type: 'placeOrder', order });
    s = reducer(s, { type: 'setOrderStatus', orderId: 'o1', status: 'ready' });
    expect(s.orders[0].status).toBe('placed');
    for (const status of ['accepted', 'preparing', 'ready', 'completed'] as const) {
      s = reducer(s, { type: 'setOrderStatus', orderId: 'o1', status });
      expect(s.orders[0].status).toBe(status);
    }
    s = reducer(s, { type: 'setOrderStatus', orderId: 'o1', status: 'declined' });
    expect(s.orders[0].status).toBe('completed');
  });
});

describe('persistence', () => {
  it('drops the hydrated flag and restores it on load', () => {
    const persisted = toPersisted(signedIn('foodie'));
    expect('hydrated' in persisted).toBe(false);
    const restored = reducer(INITIAL_STATE, { type: 'hydrate', state: persisted });
    expect(restored.hydrated).toBe(true);
    expect(restored.user?.name).toBe('Ada');
  });

  it('toggles favorites', () => {
    let s = reducer(hydrated, { type: 'toggleFavorite', restaurantId: 'r1' });
    expect(s.favoriteRestaurantIds).toEqual(['r1']);
    s = reducer(s, { type: 'toggleFavorite', restaurantId: 'r1' });
    expect(s.favoriteRestaurantIds).toEqual([]);
  });
});
