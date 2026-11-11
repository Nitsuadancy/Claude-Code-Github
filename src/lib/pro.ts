import type { ProPlan, ProSubscription, Restaurant } from '@/types';

/**
 * Manna Pro: the optional plan for cooks. $19.99 a month or $199 a year,
 * and founding kitchens get it free for their first 3 months on Manna (the
 * same months they pay no kitchen fee). Pro is sold on the Manna website,
 * not as an in-app purchase, and billing isn't connected yet.
 */
export const PRO_PRICE_CENTS: Record<ProPlan, number> = { monthly: 1999, yearly: 19900 };
export const PRO_PRICE_LABEL: Record<ProPlan, string> = { monthly: '$19.99 a month', yearly: '$199 a year' };
/** What the yearly plan saves over 12 months of the monthly one, in whole dollars. */
export const PRO_YEARLY_SAVINGS_DOLLARS = Math.floor((PRO_PRICE_CENTS.monthly * 12 - PRO_PRICE_CENTS.yearly) / 100);
export const FOUNDING_PRO_FREE_MONTHS = 3;

type ProKitchen = Pick<Restaurant, 'founding' | 'createdAt' | 'pro'>;

function addMonths(from: Date, months: number): Date {
  const d = new Date(from);
  d.setUTCMonth(d.getUTCMonth() + months);
  return d;
}

/** When a founding kitchen's free Pro months end, or null if it isn't founding. */
export function foundingProUntil(r: Pick<Restaurant, 'founding' | 'createdAt'>): Date | null {
  return r.founding ? addMonths(new Date(r.createdAt), FOUNDING_PRO_FREE_MONTHS) : null;
}

const PERIOD_MONTHS: Record<ProPlan, number> = { monthly: 1, yearly: 12 };

/** The end of the billing period that `at` falls in (the next renewal date). */
export function periodEnd(sub: ProSubscription, at: Date): Date {
  const start = new Date(sub.billingStartsAt);
  if (at < start) return start;
  let n = 1;
  let end = addMonths(start, PERIOD_MONTHS[sub.plan]);
  while (end <= at) {
    n += 1;
    end = addMonths(start, PERIOD_MONTHS[sub.plan] * n);
  }
  return end;
}

export interface ProStatus {
  active: boolean;
  /** Why Pro is on: free founding months, or a subscription. */
  source: 'founding' | 'subscription' | null;
  /** Founding: when the free months end. Subscription: the next renewal, or when it ends if canceled. */
  until: Date | null;
  /** True when a canceled subscription is running out its last period. */
  ending: boolean;
}

export function proStatus(r: ProKitchen, now: Date): ProStatus {
  const sub = r.pro;
  if (sub) {
    // A canceled plan runs to the end of the period it was canceled in.
    const end = sub.canceledAt ? periodEnd(sub, new Date(sub.canceledAt)) : periodEnd(sub, now);
    if (!sub.canceledAt || now < end) {
      const founding = foundingProUntil(r);
      if (founding && now < founding) return { active: true, source: 'founding', until: founding, ending: false };
      return { active: true, source: 'subscription', until: end, ending: !!sub.canceledAt };
    }
  }
  const founding = foundingProUntil(r);
  if (founding && now < founding) return { active: true, source: 'founding', until: founding, ending: false };
  return { active: false, source: null, until: null, ending: false };
}

export function hasPro(r: ProKitchen | undefined | null, now: Date): boolean {
  return !!r && proStatus(r, now).active;
}

/** A new subscription. A founding kitchen's billing starts when its free months end. */
export function startSubscription(r: Pick<Restaurant, 'founding' | 'createdAt'>, plan: ProPlan, now: Date): ProSubscription {
  const founding = foundingProUntil(r);
  const billingStartsAt = founding && founding > now ? founding : now;
  return { plan, startedAt: now.toISOString(), billingStartsAt: billingStartsAt.toISOString() };
}

const day = (d: Date) => d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

/** One line about where the cook's Pro stands, for the Pro page and dashboard. */
export function proStatusLine(r: ProKitchen, now: Date): string {
  const s = proStatus(r, now);
  if (!s.active || !s.until) return 'Not on Pro';
  if (s.source === 'founding') {
    return r.pro && !r.pro.canceledAt
      ? `Free as a founding kitchen until ${day(s.until)}, then ${PRO_PRICE_LABEL[r.pro.plan]}`
      : `Free as a founding kitchen until ${day(s.until)}`;
  }
  if (s.ending) return `Canceled. Pro stays on until ${day(s.until)}`;
  return `${PRO_PRICE_LABEL[r.pro!.plan]} · renews ${day(s.until)}`;
}

/** Days since 1970 in local time, so the featured order changes once a day. */
function dayNumber(now: Date): number {
  return Math.floor((now.getTime() - now.getTimezoneOffset() * 60_000) / 86_400_000);
}

/**
 * The home screen's featured kitchens: Pro kitchens first, taking turns at
 * the top day by day, then the rest in their usual order. Kitchens taking
 * orders right now come before the ones that aren't, either way.
 */
export function featuredKitchens<T extends ProKitchen & { id: string }>(
  ranked: T[],
  now: Date,
  { count = 5, isOpen }: { count?: number; isOpen: (r: T) => boolean },
): T[] {
  const pro = ranked.filter((r) => hasPro(r, now));
  const shift = pro.length ? dayNumber(now) % pro.length : 0;
  const rotated = [...pro.slice(shift), ...pro.slice(0, shift)];
  const rest = ranked.filter((r) => !hasPro(r, now));
  const ordered = [...rotated.filter(isOpen), ...rest.filter(isOpen)];
  const fill = [...rotated, ...rest].filter((r) => !isOpen(r));
  return [...ordered, ...fill].slice(0, count);
}
