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

export interface Schedule {
  workingDays: Weekday[];
  openTime: string;
  closeTime: string;
}

/**
 * Whether a kitchen is open at `now`. Supports overnight hours
 * (e.g. 20:00-02:00): the early-morning part belongs to the previous day's shift.
 */
export function isOpenAt(schedule: Schedule, now: Date): boolean {
  // A kitchen that hasn't set its hours yet is never open.
  if (!isValidTime(schedule.openTime) || !isValidTime(schedule.closeTime)) return false;
  const open = toMinutes(schedule.openTime);
  const close = toMinutes(schedule.closeTime);
  if (open === close) return false;
  const minutes = now.getHours() * 60 + now.getMinutes();
  const today = JS_DAY[now.getDay()];
  const yesterday = JS_DAY[(now.getDay() + 6) % 7];

  if (open < close) {
    return schedule.workingDays.includes(today) && minutes >= open && minutes < close;
  }
  // Overnight shift.
  if (minutes >= open) return schedule.workingDays.includes(today);
  if (minutes < close) return schedule.workingDays.includes(yesterday);
  return false;
}

export function capitalize(word: string): string {
  return word.charAt(0).toUpperCase() + word.slice(1);
}
