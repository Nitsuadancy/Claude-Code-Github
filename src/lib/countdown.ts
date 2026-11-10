/** Countdowns to a bake day's order cutoff: "1d 6h", "5h 12m", "42 min". */

/** The countdown turns gold for this many hours before orders close. */
export const URGENT_HOURS = 6;

/** Time left, rounded down to the minute, in the most useful two units; null once it's passed. */
export function timeLeft(to: string | Date, now: Date): string | null {
  const ms = new Date(to).getTime() - now.getTime();
  if (ms <= 0) return null;
  const minutes = Math.floor(ms / 60_000);
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  const mins = minutes % 60;
  if (days > 0) return hours ? `${days}d ${hours}h` : `${days}d`;
  if (hours > 0) return mins ? `${hours}h ${mins}m` : `${hours}h`;
  return `${Math.max(1, mins)} min`;
}

export function isUrgent(to: string | Date, now: Date, hours = URGENT_HOURS): boolean {
  const ms = new Date(to).getTime() - now.getTime();
  return ms > 0 && ms <= hours * 3_600_000;
}
