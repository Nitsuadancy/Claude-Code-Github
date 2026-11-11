import type { Drop, MenuItem, Restaurant } from '@/types';

import { CUTOFF_TIME, localDateKey } from './bake-days';
import { toMinutes } from './hours';
import { dayLabel } from './schedule';

/**
 * Drops: a Pro kitchen's one-off menu with its own pickup window and order
 * deadline ("Thanksgiving pies, order by Tuesday"). A drop keeps running if
 * the kitchen's Pro plan lapses; only making new ones needs Pro.
 */
export const DROP_TITLE_MAX = 40;
export const DROP_NOTE_MAX = 140;
/** How far ahead a drop's pickup can be. */
export const DROP_DAYS_AHEAD = 30;

/** Drops still taking orders, soonest deadline first. */
export function openDrops(r: Pick<Restaurant, 'drops' | 'acceptingOrders'>, now: Date): Drop[] {
  if (!r.acceptingOrders) return [];
  return (r.drops ?? [])
    .filter((d) => new Date(d.closesAt) > now && new Date(d.pickupEnd) > now)
    .sort((a, b) => a.closesAt.localeCompare(b.closesAt));
}

/** Drops whose pickup hasn't ended (open, or closed and waiting for pickup), soonest first. */
export function upcomingDrops(r: Pick<Restaurant, 'drops'>, now: Date): Drop[] {
  return (r.drops ?? [])
    .filter((d) => new Date(d.pickupEnd) > now)
    .sort((a, b) => a.pickupStart.localeCompare(b.pickupStart));
}

export function findDrop(r: Pick<Restaurant, 'drops'> | undefined, dropId: string | undefined): Drop | undefined {
  return dropId ? r?.drops?.find((d) => d.id === dropId) : undefined;
}

/** The dishes in a drop, in menu order. */
export function dropItems(menu: MenuItem[], drop: Drop): MenuItem[] {
  const ids = new Set(drop.itemIds);
  return menu.filter((m) => ids.has(m.id));
}

/** The everyday menu: everything except dishes sold only in drops. */
export function everydayMenu(menu: MenuItem[]): MenuItem[] {
  return menu.filter((m) => !m.dropOnly);
}

const clock = (iso: string) => new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
const date = (iso: string, now: Date) => {
  const label = dayLabel(iso, now);
  if (label === 'Today' || label === 'Tomorrow') return label;
  return new Date(iso).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
};

/** "Pickup Wed, Nov 25 · 10:00 AM – 2:00 PM" */
export function formatDropPickup(d: Drop, now: Date): string {
  return `Pickup ${date(d.pickupStart, now)} · ${clock(d.pickupStart)} – ${clock(d.pickupEnd)}`;
}

/** "Order by Tue, 8:00 PM" */
export function formatDropDeadline(d: Drop, now: Date): string {
  return `Order by ${date(d.closesAt, now)}, ${clock(d.closesAt)}`;
}

export interface DropDraft {
  title: string;
  note: string;
  itemIds: string[];
  /** Local date "YYYY-MM-DD". */
  date: string;
  /** 24h "HH:MM". */
  pickupStart: string;
  pickupEnd: string;
  /** Orders close at 8 PM this many days before pickup (1 to 3). */
  closeDaysBefore: number;
}

function at(dateKey: string, time: string): Date {
  const [y, m, d] = dateKey.split('-').map(Number);
  const minutes = toMinutes(time);
  return new Date(y, m - 1, d, Math.floor(minutes / 60), minutes % 60);
}

/** The draft's times, or why it can't be saved yet. */
export function checkDrop(
  draft: DropDraft,
  menu: MenuItem[],
  now: Date,
): { ok: true; pickupStart: Date; pickupEnd: Date; closesAt: Date } | { ok: false; error: string } {
  if (!draft.title.trim()) return { ok: false, error: 'Give your drop a name.' };
  if (!draft.itemIds.some((id) => menu.some((m) => m.id === id))) return { ok: false, error: 'Pick at least one dish.' };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(draft.date)) return { ok: false, error: 'Pick a pickup day.' };
  if (toMinutes(draft.pickupStart) >= toMinutes(draft.pickupEnd)) {
    return { ok: false, error: 'Pickup has to end after it starts.' };
  }
  const pickupStart = at(draft.date, draft.pickupStart);
  const pickupEnd = at(draft.date, draft.pickupEnd);
  const [y, m, d] = draft.date.split('-').map(Number);
  const closesAt = at(localDateKey(new Date(y, m - 1, d - draft.closeDaysBefore)), CUTOFF_TIME);
  if (closesAt <= now) return { ok: false, error: 'That deadline has already passed. Pick a later day.' };
  if (pickupStart.getTime() - now.getTime() > (DROP_DAYS_AHEAD + 1) * 86_400_000) {
    return { ok: false, error: `Drops can be up to ${DROP_DAYS_AHEAD} days ahead.` };
  }
  return { ok: true, pickupStart, pickupEnd, closesAt };
}

/** The editable form of a saved drop. */
export function draftFromDrop(d: Drop): DropDraft {
  const start = new Date(d.pickupStart);
  const end = new Date(d.pickupEnd);
  const close = new Date(d.closesAt);
  const hhmm = (x: Date) => `${String(x.getHours()).padStart(2, '0')}:${String(x.getMinutes()).padStart(2, '0')}`;
  const days = Math.round(
    (new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime() -
      new Date(close.getFullYear(), close.getMonth(), close.getDate()).getTime()) /
      86_400_000,
  );
  return {
    title: d.title,
    note: d.note ?? '',
    itemIds: d.itemIds,
    date: localDateKey(start),
    pickupStart: hhmm(start),
    pickupEnd: hhmm(end),
    closeDaysBefore: Math.min(3, Math.max(1, days)),
  };
}

/** Pickup days a cook can choose for a new drop: tomorrow through 30 days out. */
export function dropDateOptions(now: Date): string[] {
  return Array.from({ length: DROP_DAYS_AHEAD }, (_, i) =>
    localDateKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() + i + 1)),
  );
}
