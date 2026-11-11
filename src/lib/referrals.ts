import type { Restaurant } from '@/types';

import { formatMonthDay } from './orders';

/**
 * Cook referrals: every kitchen has an invite code. When a new cook enters
 * it while setting up and their kitchen opens, both kitchens get a month with
 * no kitchen fee. Months stack, up to a year ahead.
 */
export const REFERRAL_MONTHS = 1;
export const MAX_CREDIT_MONTHS = 12;

const CODE_PATTERN = /^[A-Z]{2,6}-[A-Z0-9]{4}$/;

/** A small, stable hash of an id, as 4 base-36 characters. */
function shortHash(id: string): string {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h.toString(36).toUpperCase().padStart(4, '0').slice(-4);
}

/** "SUSIES-7K2Q": up to six letters of the kitchen's name and four from its id. */
export function makeReferralCode(name: string, id: string): string {
  const letters = name.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 6);
  return `${letters.length >= 2 ? letters : 'COOK'}-${shortHash(id)}`;
}

/** The kitchen's invite code: the one it was given, or one made from its name and id. */
export function referralCodeOf(r: Pick<Restaurant, 'id' | 'name' | 'referralCode'>): string {
  return r.referralCode ?? makeReferralCode(r.name, r.id);
}

export function normalizeReferralCode(text: string): string {
  const clean = text.toUpperCase().replace(/[^A-Z0-9-]/g, '');
  // People often leave out the dash.
  if (!clean.includes('-') && clean.length > 4) return `${clean.slice(0, -4)}-${clean.slice(-4)}`;
  return clean;
}

export function isReferralCode(text: string): boolean {
  return CODE_PATTERN.test(text);
}

/** The kitchen an invite code belongs to, among those known. */
export function kitchenForCode<T extends Pick<Restaurant, 'id' | 'name' | 'referralCode'>>(
  kitchens: T[],
  code: string,
): T | undefined {
  const c = normalizeReferralCode(code);
  return kitchens.find((k) => referralCodeOf(k) === c);
}

/** A fee-free month added on top of any the kitchen already has, at most a year ahead. */
export function addFeeCredit(until: string | undefined, now: Date, months = REFERRAL_MONTHS): string {
  const base = until && new Date(until) > now ? new Date(until) : new Date(now);
  base.setUTCMonth(base.getUTCMonth() + months);
  const cap = new Date(now);
  cap.setUTCMonth(cap.getUTCMonth() + MAX_CREDIT_MONTHS);
  return (base > cap ? cap : base).toISOString();
}

/** Kitchens that opened with this code. */
export function kitchensInvitedBy<T extends Pick<Restaurant, 'referredBy' | 'status'>>(kitchens: T[], code: string): T[] {
  return kitchens.filter((k) => k.referredBy === code && k.status === 'live');
}

/** What a cook sends to invite another cook. */
export function cookReferralMessage(kitchenName: string, code: string): string {
  return `I sell my food on Manna, and you should too: a free storefront, orders paid upfront, pickup at your door. Download Manna, choose “I cook”, and enter my code ${code} when you set up. When your kitchen opens, we both get a month with no Manna fee. – ${kitchenName}`;
}

/** "No Manna fee until Mar 3" */
export function creditLine(until: string | undefined, now: Date): string | null {
  return until && new Date(until) > now ? `No Manna fee until ${formatMonthDay(until)}` : null;
}
