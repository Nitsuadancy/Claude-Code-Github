import { describe, expect, it } from '@jest/globals';

import { kitchenFee, kitchenPayout, movementFee } from '@/lib/pricing';

import {
  applicationFeeCents,
  checkAmounts,
  cookTransferCents,
  planForPrice,
  proColumns,
  proTrialEnd,
  payoutsReady,
  refundsInFull,
  subscriptionStarted,
} from '../../supabase/functions/_shared/money';

/** An order's amounts as place_order stores them. */
function order(subtotal: number, discount = 0, tip = 0, kitchenRate = 0.05) {
  const movement = movementFee(subtotal - discount);
  const kitchen = Math.round((subtotal - discount) * kitchenRate);
  return {
    subtotal_cents: subtotal,
    discount_cents: discount,
    movement_fee_cents: movement,
    kitchen_fee_cents: kitchen,
    tip_cents: tip,
    total_cents: subtotal - discount + movement + tip,
  };
}

describe('charging an order', () => {
  it('keeps both fees for Manna and sends the rest, tip included, to the cook', () => {
    const o = order(4000, 0, 500);
    expect(o.movement_fee_cents).toBe(400);
    expect(applicationFeeCents(o)).toBe(400 + 200);
    expect(cookTransferCents(o)).toBe(4000 - 200 + 500);
    expect(checkAmounts(o)).toBeNull();
  });

  it('matches what the app shows the cook', () => {
    const o = order(3000, 300, 200);
    expect(o.kitchen_fee_cents).toBe(kitchenFee(2700, 0.05));
    expect(cookTransferCents(o)).toBe(
      kitchenPayout({ subtotalCents: 3000, discountCents: 300, tipCents: 200, kitchenFeeCents: o.kitchen_fee_cents }),
    );
  });

  it('charges no kitchen fee in a fee-free stretch', () => {
    const o = order(2000, 0, 0, 0);
    expect(applicationFeeCents(o)).toBe(o.movement_fee_cents);
    expect(cookTransferCents(o)).toBe(2000);
  });

  it('refuses totals that don’t add up or are too small', () => {
    expect(checkAmounts({ ...order(2000), total_cents: 1 })).toMatch(/add up/);
    expect(
      checkAmounts({ subtotal_cents: 0, discount_cents: 0, movement_fee_cents: 0, kitchen_fee_cents: 0, tip_cents: 0, total_cents: 0 }),
    ).toMatch(/too small/);
    expect(checkAmounts({ ...order(2000), kitchen_fee_cents: 99999 })).toMatch(/larger/);
  });

  it('refunds declined and cancelled orders in full, nothing else', () => {
    expect(refundsInFull('declined')).toBe(true);
    expect(refundsInFull('cancelled')).toBe(true);
    expect(refundsInFull('picked_up')).toBe(false);
    expect(refundsInFull('accepted')).toBe(false);
  });

  it('treats a cook’s account as ready only when it can charge and pay out', () => {
    expect(payoutsReady({ charges_enabled: true, payouts_enabled: true })).toBe(true);
    expect(payoutsReady({ charges_enabled: true, payouts_enabled: false })).toBe(false);
  });
});

describe('Pro billing', () => {
  const prices = { monthly: 'price_m', yearly: 'price_y' };

  it('knows the plan from the price', () => {
    expect(planForPrice('price_m', prices)).toBe('monthly');
    expect(planForPrice('price_y', prices)).toBe('yearly');
    expect(planForPrice('price_other', prices)).toBeNull();
    expect(planForPrice('', {})).toBeNull();
  });

  it('starts charging a founding kitchen when its free months end', () => {
    const now = new Date('2026-11-11T00:00:00Z');
    const founding = { founding: true, live_since: '2026-10-01T00:00:00Z', created_at: '2026-09-01T00:00:00Z' };
    expect(proTrialEnd(founding, now)).toBe(Date.parse('2027-01-01T00:00:00Z') / 1000);
    expect(proTrialEnd({ ...founding, founding: false }, now)).toBeNull();
    expect(proTrialEnd({ ...founding, live_since: '2026-08-12T00:00:00Z' }, now)).toBeNull();
  });

  it('turns a subscription into the kitchen’s Pro columns', () => {
    const t = (iso: string) => Date.parse(iso) / 1000;
    const base = {
      status: 'active',
      created: t('2026-11-01T00:00:00Z'),
      start_date: t('2026-11-01T00:00:00Z'),
      trial_end: null,
      cancel_at_period_end: false,
      canceled_at: null,
      ended_at: null,
      plan: 'monthly' as const,
    };
    expect(proColumns(base)).toEqual({
      pro_plan: 'monthly',
      pro_started_at: '2026-11-01T00:00:00.000Z',
      pro_billing_starts_at: '2026-11-01T00:00:00.000Z',
      pro_canceled_at: null,
    });
    expect(proColumns({ ...base, trial_end: t('2027-01-01T00:00:00Z') }).pro_billing_starts_at).toBe('2027-01-01T00:00:00.000Z');
    expect(
      proColumns({ ...base, cancel_at_period_end: true, canceled_at: t('2026-11-20T00:00:00Z') }).pro_canceled_at,
    ).toBe('2026-11-20T00:00:00.000Z');
    expect(subscriptionStarted('incomplete')).toBe(false);
    expect(subscriptionStarted('trialing')).toBe(true);
  });
});
