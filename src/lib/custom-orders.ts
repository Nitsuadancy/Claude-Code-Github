import type { CustomQuote, CustomRequest, Order, Restaurant } from '@/types';

import { localDateKey } from './bake-days';
import { toMinutes } from './hours';
import { kitchenFee, kitchenFeeRate, movementFee } from './pricing';
import { hasPro } from './pro';

/**
 * Custom orders: a customer asks a Pro kitchen for something off the menu (a
 * birthday cake, a party tray, catering), the kitchen sends a price and a
 * pickup window, and the customer accepts it as an order.
 */
export const OCCASIONS = ['Birthday cake', 'Party tray', 'Catering', 'Wedding or shower', 'Something else'] as const;
export const CUSTOM_DETAILS_MAX = 500;
export const CUSTOM_NOTE_MAX = 280;
/** Cooks need a few days to plan and shop. */
export const MIN_LEAD_DAYS = 3;
export const MAX_AHEAD_DAYS = 60;
export const MAX_SERVINGS = 300;
/** A quote must cover at least this much, so card fees don't eat it. */
export const MIN_QUOTE_CENTS = 1000;

export function acceptsCustomOrders(r: Pick<Restaurant, 'founding' | 'createdAt' | 'pro' | 'status'>, now: Date): boolean {
  return r.status === 'live' && hasPro(r, now);
}

/** Dates a customer can ask for: 3 to 60 days out. */
export function requestDateOptions(now: Date): string[] {
  return Array.from({ length: MAX_AHEAD_DAYS - MIN_LEAD_DAYS + 1 }, (_, i) =>
    localDateKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() + MIN_LEAD_DAYS + i)),
  );
}

export interface RequestDraft {
  occasion: string;
  details: string;
  servings: string;
  neededBy: string;
  budget: string;
}

export function checkRequest(draft: RequestDraft, now: Date): string | null {
  if (!draft.occasion) return 'Choose what it’s for.';
  if (draft.details.trim().length < 10) return 'Describe what you’d like, so the cook can price it.';
  const servings = Number(draft.servings);
  if (!Number.isInteger(servings) || servings < 1 || servings > MAX_SERVINGS) return 'How many people is it for?';
  if (!requestDateOptions(now).includes(draft.neededBy)) return `Pick a date at least ${MIN_LEAD_DAYS} days away.`;
  return null;
}

/** "Sat, Nov 22" for a "YYYY-MM-DD" date. */
export function formatNeededBy(dateKey: string): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

/** The quote's pickup window on the date the customer asked for, or an error. */
export function quoteWindow(
  dateKey: string,
  start: string,
  end: string,
  now: Date,
): { ok: true; pickupStart: string; pickupEnd: string } | { ok: false; error: string } {
  if (toMinutes(start) >= toMinutes(end)) return { ok: false, error: 'Pickup has to end after it starts.' };
  const [y, m, d] = dateKey.split('-').map(Number);
  const at = (t: string) => new Date(y, m - 1, d, Math.floor(toMinutes(t) / 60), toMinutes(t) % 60);
  if (at(start) <= now) return { ok: false, error: 'That pickup time has passed.' };
  return { ok: true, pickupStart: at(start).toISOString(), pickupEnd: at(end).toISOString() };
}

export function canQuote(r: CustomRequest): boolean {
  return r.status === 'open' || r.status === 'quoted';
}

/** A quote can be accepted until its pickup starts. */
export function canAcceptQuote(r: CustomRequest, now: Date): boolean {
  return r.status === 'quoted' && !!r.quote && new Date(r.quote.pickupStart) > now;
}

/** What the customer pays for a quote: the price plus the movement fee. */
export function quoteTotals(quote: Pick<CustomQuote, 'priceCents'>): { movementFeeCents: number; totalCents: number } {
  const fee = movementFee(quote.priceCents);
  return { movementFeeCents: fee, totalCents: quote.priceCents + fee };
}

/** The order made when the customer accepts a quote. The kitchen already said yes, so it starts accepted. */
export function orderFromQuote(
  request: CustomRequest,
  quote: CustomQuote,
  kitchen: Pick<Restaurant, 'founding' | 'createdAt' | 'address' | 'city' | 'pickupInstructions' | 'pickupPhotoUri'>,
  orderId: string,
  now: Date,
): Order {
  const at = now.toISOString();
  const { movementFeeCents, totalCents } = quoteTotals(quote);
  return {
    id: orderId,
    customerId: request.customerId,
    customerName: request.customerName,
    restaurantId: request.restaurantId,
    restaurantName: request.restaurantName,
    lines: [{ itemId: `custom:${request.id}`, name: `Custom: ${request.occasion}`, priceCents: quote.priceCents, quantity: 1 }],
    subtotalCents: quote.priceCents,
    movementFeeCents,
    kitchenFeeCents: kitchenFee(quote.priceCents, kitchenFeeRate(kitchen, now)),
    tipCents: 0,
    totalCents,
    pickupAddress: [kitchen.address, kitchen.city].filter(Boolean).join(', '),
    ...(kitchen.pickupInstructions?.trim() ? { pickupInstructions: kitchen.pickupInstructions.trim() } : {}),
    ...(kitchen.pickupPhotoUri ? { pickupPhotoUri: kitchen.pickupPhotoUri } : {}),
    status: 'accepted',
    statusHistory: [
      { status: 'placed', at },
      { status: 'accepted', at },
    ],
    chefNote: '',
    customerNote: request.details.slice(0, 280),
    createdAt: at,
    estimatedReadyAt: quote.pickupStart,
    scheduledFor: quote.pickupStart,
    pickupBy: quote.pickupEnd,
  };
}

/** Requests waiting on the kitchen (new ones), newest first. */
export function newRequests(requests: CustomRequest[], restaurantId: string): CustomRequest[] {
  return requests
    .filter((r) => r.restaurantId === restaurantId && r.status === 'open')
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export const REQUEST_STATUS_LABEL: Record<CustomRequest['status'], string> = {
  open: 'Waiting for the kitchen',
  quoted: 'Price sent',
  accepted: 'Ordered',
  declined: 'Declined',
  withdrawn: 'Withdrawn',
};

/** The same statuses, from the kitchen's side. */
export const KITCHEN_REQUEST_LABEL: Record<CustomRequest['status'], string> = {
  open: 'New request',
  quoted: 'Price sent · waiting on the customer',
  accepted: 'Ordered',
  declined: 'You declined',
  withdrawn: 'Withdrawn by the customer',
};
