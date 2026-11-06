import type { BakeDaySchedule, Order, Restaurant, Weekday } from '@/types';

import { capitalize, formatTime, isValidTime, toMinutes, WEEKDAYS } from './hours';
import { dayLabel } from './schedule';

/** Orders close at this time of day, one to three days before the bake day. */
export const CUTOFF_TIME = '20:00';
export const CLOSE_DAYS_OPTIONS = [1, 2, 3] as const;
export const DEFAULT_CLOSE_DAYS = 1;
/** How far ahead customers can order from a bake-day kitchen. */
export const BAKE_DAYS_AHEAD = 14;

/** JS Date#getDay() (0 = Sunday) to Weekday. */
const JS_DAY: Weekday[] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

/** One dated bake day: when pickup runs and when ordering closes. All ISO times. */
export interface BakeDay {
  /** Local date, e.g. "2026-11-08". */
  date: string;
  pickupStart: string;
  pickupEnd: string;
  closesAt: string;
}

type BakeKitchen = Pick<Restaurant, 'bakeDays' | 'skippedBakeDays'>;

/** A local date as "YYYY-MM-DD". */
export function localDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function isValidBakeDay(s: BakeDaySchedule): boolean {
  return (
    isValidTime(s.pickupStart) &&
    isValidTime(s.pickupEnd) &&
    toMinutes(s.pickupStart) < toMinutes(s.pickupEnd) &&
    Number.isInteger(s.closeDaysBefore) &&
    s.closeDaysBefore >= 1 &&
    s.closeDaysBefore <= 3
  );
}

function at(date: Date, time: string): Date {
  const minutes = toMinutes(time);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), Math.floor(minutes / 60), minutes % 60);
}

/**
 * Bake days from today through the next `days` days whose pickup hasn't
 * ended, soonest first. Skipped dates are left out unless `includeSkipped`.
 */
export function upcomingBakeDays(
  kitchen: BakeKitchen,
  now: Date,
  { days = BAKE_DAYS_AHEAD, includeSkipped = false } = {},
): BakeDay[] {
  const schedule = (kitchen.bakeDays ?? []).filter(isValidBakeDay);
  const skipped = new Set(kitchen.skippedBakeDays ?? []);
  const out: BakeDay[] = [];
  for (let d = 0; d <= days; d++) {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() + d);
    const key = localDateKey(date);
    if (!includeSkipped && skipped.has(key)) continue;
    for (const s of schedule) {
      if (s.day !== JS_DAY[date.getDay()]) continue;
      const start = at(date, s.pickupStart);
      const end = at(date, s.pickupEnd);
      if (end <= now) continue;
      const closeDate = new Date(date.getFullYear(), date.getMonth(), date.getDate() - s.closeDaysBefore);
      out.push({
        date: key,
        pickupStart: start.toISOString(),
        pickupEnd: end.toISOString(),
        closesAt: at(closeDate, CUTOFF_TIME).toISOString(),
      });
    }
  }
  return out.sort((a, b) => a.pickupStart.localeCompare(b.pickupStart));
}

/** Bake days still taking orders. */
export function openBakeDays(kitchen: BakeKitchen, now: Date): BakeDay[] {
  return upcomingBakeDays(kitchen, now).filter((b) => new Date(b.closesAt) > now);
}

/** The bake day an order's pickup time belongs to, if it's still open for orders. */
export function findOpenBakeDay(kitchen: BakeKitchen, pickupStart: string, now: Date): BakeDay | undefined {
  return openBakeDays(kitchen, now).find((b) => b.pickupStart === pickupStart);
}

const clock = (iso: string) => new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });

/** "Tomorrow" / "Sat, Nov 8" for a bake day's date. */
export function bakeDayDate(b: BakeDay, now: Date): string {
  const label = dayLabel(b.pickupStart, now);
  if (label === 'Today' || label === 'Tomorrow') return label;
  return new Date(b.pickupStart).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

/** "Sat, Nov 8 · 9:00 AM – 12:00 PM" */
export function formatBakeDay(b: BakeDay, now: Date): string {
  return `${bakeDayDate(b, now)} · ${clock(b.pickupStart)} – ${clock(b.pickupEnd)}`;
}

/** "Order by 8:00 PM today", "Order by 8:00 PM tomorrow" or "Order by Thu, 8:00 PM" */
export function formatCutoff(b: BakeDay, now: Date): string {
  const day = dayLabel(b.closesAt, now);
  if (day === 'Today' || day === 'Tomorrow') return `Order by ${clock(b.closesAt)} ${day.toLowerCase()}`;
  return `Order by ${day}, ${clock(b.closesAt)}`;
}

/** "9 AM", "10:30 AM" */
function shortTime(time: string): string {
  return formatTime(time).replace(':00', '');
}

/** "9–12 PM" style ranges: "9 AM–12 PM", "3–6 PM". */
export function timeRange(start: string, end: string): string {
  const a = shortTime(start);
  const b = shortTime(end);
  const [aTime, aHalf] = a.split(' ');
  return aHalf === b.split(' ')[1] ? `${aTime}–${b}` : `${a}–${b}`;
}

function sortByWeek(schedule: BakeDaySchedule[] | undefined): BakeDaySchedule[] {
  return (schedule ?? []).filter(isValidBakeDay).sort((a, b) => WEEKDAYS.indexOf(a.day) - WEEKDAYS.indexOf(b.day));
}

/** "Fri 3–6 PM, Sat 10 AM–1 PM" */
export function describeBakeDays(schedule: BakeDaySchedule[] | undefined): string {
  const valid = sortByWeek(schedule);
  if (!valid.length) return 'No bake days set';
  return valid.map((s) => `${capitalize(s.day).slice(0, 3)} ${timeRange(s.pickupStart, s.pickupEnd)}`).join(', ');
}

/** "Fridays 3–6 PM and Saturdays 10 AM–1 PM", for the About tab. */
export function describeBakeDaysLong(schedule: BakeDaySchedule[] | undefined): string {
  const parts = sortByWeek(schedule).map((s) => `${capitalize(s.day)}s ${timeRange(s.pickupStart, s.pickupEnd)}`);
  if (!parts.length) return 'No bake days set';
  return parts.length === 1 ? parts[0] : `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`;
}

/** "8 PM the day before" / "8 PM, 2 days before" */
export function describeCutoff(closeDaysBefore: number): string {
  const time = shortTime(CUTOFF_TIME);
  return closeDaysBefore === 1 ? `${time} the day before` : `${time}, ${closeDaysBefore} days before`;
}

export interface BakeDayStatus {
  day: BakeDay;
  /** Orders for this bake day that haven't been declined or cancelled. */
  orderCount: number;
  /** "open": taking orders. "baking": orders closed, before pickup. "pickup": the window is on. */
  phase: 'open' | 'baking' | 'pickup';
}

/** Where the kitchen's next bake day stands, for the cook's dashboard. */
export function nextBakeDayStatus(
  kitchen: BakeKitchen & Pick<Restaurant, 'id'>,
  orders: Pick<Order, 'restaurantId' | 'scheduledFor' | 'status'>[],
  now: Date,
): BakeDayStatus | null {
  const day = upcomingBakeDays(kitchen, now)[0];
  if (!day) return null;
  const orderCount = orders.filter(
    (o) =>
      o.restaurantId === kitchen.id &&
      o.scheduledFor === day.pickupStart &&
      o.status !== 'declined' &&
      o.status !== 'cancelled',
  ).length;
  const phase = now < new Date(day.closesAt) ? 'open' : now < new Date(day.pickupStart) ? 'baking' : 'pickup';
  return { day, orderCount, phase };
}
