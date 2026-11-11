import { describe, expect, it } from '@jest/globals';

import { chunk, notesFor, type Change, type Context } from '../../supabase/functions/_shared/notifications';

const ctx: Context = { paymentsRequired: false, kitchen: { id: 'k1', name: 'Susie’s Sweets', ownerId: 'cook' } };
const order = { id: 'o1', customer_id: 'ada', customer_name: 'Ada', restaurant_id: 'k1', status: 'placed', payment_status: 'unpaid', arrived_at: null };
const update = (before: object, after: object, table = 'orders'): Change => ({
  type: 'UPDATE',
  table,
  old_record: { ...order, ...before },
  record: { ...order, ...after },
});
const to = (c: Change, context = ctx) => notesFor(c, context).map((n) => `${String(n.to)}: ${n.title}`);

describe('who hears about orders', () => {
  it('tells the kitchen about a new order right away while card payments are off', () => {
    expect(to({ type: 'INSERT', table: 'orders', record: order, old_record: null })).toEqual(['cook: New order']);
  });

  it('with payments on, tells the kitchen only once the order is paid', () => {
    const paying = { ...ctx, paymentsRequired: true };
    expect(to({ type: 'INSERT', table: 'orders', record: order, old_record: null }, paying)).toEqual([]);
    expect(to(update({}, { payment_status: 'paid' }), paying)).toEqual(['cook: New order']);
    expect(to(update({}, { status: 'cancelled' }), paying)).toEqual([]);
  });

  it('follows the order through to pickup', () => {
    expect(to(update({}, { status: 'accepted' }))).toEqual(['ada: Susie’s Sweets accepted your order']);
    expect(to(update({ status: 'preparing' }, { status: 'ready' }))).toEqual(['ada: Your order is ready']);
    expect(to(update({ status: 'ready' }, { status: 'ready', arrived_at: '2026-11-11T18:00:00Z' }))).toEqual(['cook: Ada is here']);
    expect(to(update({}, { status: 'cancelled' }))).toEqual(['cook: Order cancelled']);
    const declined = notesFor(update({ payment_status: 'paid' }, { status: 'declined', payment_status: 'paid' }), ctx)[0];
    expect(declined.body).toBe('Your payment is refunded in full.');
  });

  it('confirms a custom order once its price is accepted and paid', () => {
    const paid = update({}, { status: 'accepted', payment_status: 'paid' });
    expect(to(paid, { ...ctx, paymentsRequired: true })).toEqual(['cook: Custom order confirmed', 'ada: Susie’s Sweets has your order']);
    expect(to({ type: 'INSERT', table: 'orders', record: { ...order, status: 'accepted' }, old_record: null })).toHaveLength(2);
  });
});

describe('messages, updates, alerts and custom requests', () => {
  const withOrder = { ...ctx, order: { id: 'o1', customerId: 'ada', customerName: 'Ada' } };

  it('sends a chat message to the other side', () => {
    const msg = (sender: string): Change => ({
      type: 'INSERT',
      table: 'order_messages',
      record: { order_id: 'o1', sender_id: sender, body: 'Running 5 minutes late!' },
      old_record: null,
    });
    expect(notesFor(msg('ada'), withOrder)[0]).toMatchObject({ to: 'cook', title: 'Ada', url: '/chat/o1' });
    expect(notesFor(msg('cook'), withOrder)[0]).toMatchObject({ to: 'ada', title: 'Susie’s Sweets' });
  });

  it('sends oven updates to the customer and alerts to everyone who saved the kitchen', () => {
    const photo: Change = { type: 'INSERT', table: 'order_updates', record: { order_id: 'o1', body: '', photo_path: 'x.jpg' }, old_record: null };
    expect(notesFor(photo, withOrder)[0]).toMatchObject({ to: 'ada', body: 'A new photo of your order.' });
    const alert: Change = { type: 'INSERT', table: 'kitchen_alerts', record: { restaurant_id: 'k1', body: 'Saturday is open' }, old_record: null };
    expect(notesFor(alert, ctx)[0]).toMatchObject({ to: { followersOf: 'k1' }, url: '/restaurant/k1' });
  });

  it('keeps both sides of a custom request in the loop', () => {
    const request = { id: 'r1', restaurant_id: 'k1', customer_id: 'ada', customer_name: 'Ada', occasion: 'Birthday cake', servings: 20, status: 'open', decline_note: '' };
    expect(to({ type: 'INSERT', table: 'custom_requests', record: request, old_record: null })).toEqual(['cook: New custom order request']);
    const change = (status: string): Change => ({ type: 'UPDATE', table: 'custom_requests', old_record: request, record: { ...request, status } });
    expect(to(change('quoted'))).toEqual(['ada: Susie’s Sweets sent a price']);
    expect(to(change('declined'))).toEqual(['ada: Susie’s Sweets can’t take this one']);
    expect(to(change('withdrawn'))).toEqual(['cook: Request withdrawn']);
    expect(to(change('open'))).toEqual([]);
  });

  it('sends to Expo in batches of 100', () => {
    expect(chunk(Array.from({ length: 250 }, (_, i) => i)).map((b) => b.length)).toEqual([100, 100, 50]);
  });
});
