import type { DiscountCode, Order, Restaurant } from '@/types';

import { formatCents } from './money';

/**
 * Discount codes: a Pro kitchen's way to thank regulars or run a launch
 * special. The kitchen pays for the discount; Manna's fees are worked out on
 * what the customer actually pays for the food.
 */
export const CODE_PATTERN = /^[A-Z0-9]{3,15}$/;
export const PERCENT_MIN = 5;
export const PERCENT_MAX = 50;
export const MAX_ACTIVE_CODES = 10;

export function normalizeCode(text: string): string {
  return text.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 15);
}

/** Orders that used this code at this kitchen and weren't declined or cancelled. */
export function codeUses(orders: Order[], restaurantId: string, code: string): number {
  return orders.filter(
    (o) => o.restaurantId === restaurantId && o.discountCode === code && o.status !== 'declined' && o.status !== 'cancelled',
  ).length;
}

export function isCodeLive(c: DiscountCode, orders: Order[], restaurantId: string, now: Date): boolean {
  if (c.paused) return false;
  if (c.endsAt && new Date(c.endsAt) <= now) return false;
  if (c.maxUses !== null && codeUses(orders, restaurantId, c.code) >= c.maxUses) return false;
  return true;
}

/** How much a code takes off a food subtotal. Never more than the food. */
export function discountFor(c: Pick<DiscountCode, 'kind' | 'value'>, subtotalCents: number): number {
  if (subtotalCents <= 0) return 0;
  const off = c.kind === 'percent' ? Math.round((subtotalCents * c.value) / 100) : c.value;
  return Math.min(off, subtotalCents);
}

/** "15% off" / "$5 off" */
export function describeCode(c: Pick<DiscountCode, 'kind' | 'value' | 'newCustomersOnly'>): string {
  const off = c.kind === 'percent' ? `${c.value}% off` : `${formatCents(c.value).replace('.00', '')} off`;
  return c.newCustomersOnly ? `${off} a first order` : off;
}

export type ApplyResult = { ok: true; code: DiscountCode; discountCents: number } | { ok: false; error: string };

/** Checks a code a customer typed at checkout. */
export function applyCode(
  kitchen: Pick<Restaurant, 'id' | 'discountCodes'>,
  typed: string,
  subtotalCents: number,
  customerId: string,
  orders: Order[],
  now: Date,
): ApplyResult {
  const text = normalizeCode(typed);
  const code = (kitchen.discountCodes ?? []).find((c) => c.code === text);
  if (!code) return { ok: false, error: 'That code doesn’t work here.' };
  if (code.endsAt && new Date(code.endsAt) <= now) return { ok: false, error: 'That code has ended.' };
  if (!isCodeLive(code, orders, kitchen.id, now)) return { ok: false, error: 'That code isn’t available anymore.' };
  if (
    code.newCustomersOnly &&
    orders.some(
      (o) => o.customerId === customerId && o.restaurantId === kitchen.id && o.status !== 'declined' && o.status !== 'cancelled',
    )
  ) {
    return { ok: false, error: 'That code is for a first order from this kitchen.' };
  }
  return { ok: true, code, discountCents: discountFor(code, subtotalCents) };
}

export type CodeDraft = Pick<DiscountCode, 'code' | 'kind' | 'value' | 'newCustomersOnly' | 'maxUses' | 'endsAt'>;

export function checkCodeDraft(draft: CodeDraft, existing: DiscountCode[], editingId: string | null): string | null {
  if (!CODE_PATTERN.test(draft.code)) return 'Use 3 to 15 letters and numbers, like WELCOME10.';
  if (existing.some((c) => c.code === draft.code && c.id !== editingId)) return 'You already have that code.';
  if (draft.kind === 'percent' && (draft.value < PERCENT_MIN || draft.value > PERCENT_MAX)) {
    return `Choose ${PERCENT_MIN}% to ${PERCENT_MAX}% off.`;
  }
  if (draft.kind === 'amount' && (draft.value < 100 || draft.value > 5000)) return 'Choose $1 to $50 off.';
  if (draft.maxUses !== null && (!Number.isInteger(draft.maxUses) || draft.maxUses < 1)) return 'Use at least 1, or no limit.';
  return null;
}
