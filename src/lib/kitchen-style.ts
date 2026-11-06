/** Limits and clean-up for what a cook writes on their kitchen page. */
export const TAGLINE_MAX = 60;
export const UPDATE_MAX = 140;
/** A pinned update disappears from the kitchen page after this many days. */
export const UPDATE_DAYS = 7;

/** "@Susies.Sweets " or a profile URL → "susies.sweets". Empty when it isn't a valid username. */
export function cleanInstagram(input: string): string {
  const handle = input
    .trim()
    .replace(/^https?:\/\/(www\.)?instagram\.com\//i, '')
    .replace(/^@/, '')
    .replace(/[/?#].*$/, '')
    .toLowerCase();
  return /^[a-z0-9._]{1,30}$/.test(handle) ? handle : '';
}

export function instagramUrl(handle: string): string {
  return `https://instagram.com/${handle}`;
}

/** The update to show, or null once it's older than UPDATE_DAYS (or empty). */
export function visibleUpdate(
  update: { text: string; postedAt: string } | undefined,
  now: Date,
): { text: string; postedAt: string } | null {
  if (!update || !update.text.trim()) return null;
  const age = now.getTime() - new Date(update.postedAt).getTime();
  return age >= 0 && age <= UPDATE_DAYS * 86_400_000 ? update : null;
}
