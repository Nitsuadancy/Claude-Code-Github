import type { Weekday } from '@/types';

export const WEEKDAYS: Weekday[] = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
];

/** JS Date#getDay() index (0 = Sunday) to Weekday. */
const JS_DAY: Weekday[] = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
];

export function toMinutes(time: string): number {
  const match = /^(\d{1,2}):(\d{2})$/.exec(time);
  if (!match) throw new Error(`Invalid time "${time}", expected HH:MM`);
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) throw new Error(`Invalid time "${time}"`);
  return hours * 60 + minutes;
}

export function isValidTime(time: string): boolean {
  const match = /^(\d{1,2}):(\d{2})$/.exec(time);
  return !!match && Number(match[1]) <= 23 && Number(match[2]) <= 59;
}

/** "13:30" -> "1:30 PM". Unset or invalid times show as "—". */
export function formatTime(time: string): string {
  if (!isValidTime(time)) return '—';
  const total = toMinutes(time);
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  const suffix = hours < 12 ? 'AM' : 'PM';
  const h12 = hours % 12 === 0 ? 12 : hours % 12;
  return `${h12}:${String(minutes).padStart(2, '0')} ${suffix}`;
}

/** Every half hour of the day, "00:00" .. "23:30". */
export const TIME_SLOTS: string[] = Array.from({ length: 48 }, (_, i) => {
  const h = Math.floor(i / 2);
  return `${String(h).padStart(2, '0')}:${i % 2 === 0 ? '00' : '30'}`;
});

/** One day's hours, 24h "HH:MM". Close may be earlier than open for overnight hours. */
export interface DayHours {
  open: string;
  close: string;
}

export interface Schedule {
  workingDays: Weekday[];
  /** The usual hours. */
  openTime: string;
  closeTime: string;
  /** Days with different hours, e.g. shorter Saturdays. Other working days use the usual hours. */
  dayHours?: Partial<Record<Weekday, DayHours>>;
}

function validHours(h: DayHours | undefined): h is DayHours {
  return !!h && isValidTime(h.open) && isValidTime(h.close) && h.open !== h.close;
}

/** A working day's hours (its own, or the usual ones), or null when the kitchen is closed that day. */
export function hoursOn(schedule: Schedule, day: Weekday): DayHours | null {
  if (!schedule.workingDays.includes(day)) return null;
  const own = schedule.dayHours?.[day];
  if (validHours(own)) return own;
  const usual = { open: schedule.openTime, close: schedule.closeTime };
  return validHours(usual) ? usual : null;
}

/**
 * Whether a kitchen is open at `now`. Supports overnight hours
 * (e.g. 20:00-02:00): the early-morning part belongs to the previous day's shift.
 */
export function isOpenAt(schedule: Schedule, now: Date): boolean {
  const minutes = now.getHours() * 60 + now.getMinutes();
  const today = hoursOn(schedule, JS_DAY[now.getDay()]);
  if (today) {
    const open = toMinutes(today.open);
    const close = toMinutes(today.close);
    if (open < close ? minutes >= open && minutes < close : minutes >= open) return true;
  }
  // The tail of last night's shift, if it ran past midnight.
  const yesterday = hoursOn(schedule, JS_DAY[(now.getDay() + 6) % 7]);
  if (yesterday && toMinutes(yesterday.open) > toMinutes(yesterday.close)) {
    return minutes < toMinutes(yesterday.close);
  }
  return false;
}

const shortDay = (d: Weekday) => capitalize(d).slice(0, 3);

/**
 * "Every day, 9:00 AM – 5:00 PM", or with different hours on some days
 * "Mon–Fri, 9:00 AM – 5:00 PM · Sat, Sun, 10:00 AM – 2:00 PM".
 */
export function describeHours(schedule: Schedule): string {
  const runs: { days: Weekday[]; key: string; hours: DayHours }[] = [];
  for (const day of WEEKDAYS) {
    const h = hoursOn(schedule, day);
    if (!h) continue;
    const key = `${h.open}-${h.close}`;
    const run = runs.find((r) => r.key === key);
    if (run) run.days.push(day);
    else runs.push({ days: [day], key, hours: h });
  }
  if (!runs.length) return 'Hours not set';
  return runs.map((r) => `${formatDays(r.days)}, ${formatTime(r.hours.open)} – ${formatTime(r.hours.close)}`).join(' · ');
}

/** "Opens 9:00 AM" today, "Opens tomorrow 10:00 AM", or "Opens Sat 10:00 AM". */
export function nextOpening(schedule: Schedule, now: Date): string | null {
  const minutes = now.getHours() * 60 + now.getMinutes();
  for (let d = 0; d <= 7; d++) {
    const day = JS_DAY[(now.getDay() + d) % 7];
    const h = hoursOn(schedule, day);
    if (!h || (d === 0 && toMinutes(h.open) <= minutes)) continue;
    const when = d === 0 ? '' : d === 1 ? 'tomorrow ' : `${shortDay(day)} `;
    return `Opens ${when}${formatTime(h.open)}`;
  }
  return null;
}

/** "Every day", "Tue–Sun" for a run of days, or "Mon, Wed, Fri". */
export function formatDays(days: Weekday[]): string {
  const idx = WEEKDAYS.map((d, i) => (days.includes(d) ? i : -1)).filter((i) => i >= 0);
  if (idx.length === 0) return 'No days set';
  if (idx.length === 7) return 'Every day';
  const short = (i: number) => capitalize(WEEKDAYS[i]).slice(0, 3);
  const consecutive = idx.every((v, k) => k === 0 || v === idx[k - 1] + 1);
  if (consecutive && idx.length >= 3) return `${short(idx[0])}–${short(idx[idx.length - 1])}`;
  return idx.map(short).join(', ');
}

export function capitalize(word: string): string {
  return word.charAt(0).toUpperCase() + word.slice(1);
}
