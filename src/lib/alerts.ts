import type { KitchenAlert, Restaurant } from '@/types';

import { openBakeDays, bakeDayDate } from './bake-days';

/**
 * Alerts: a Pro kitchen tells everyone who saved it that something is ready
 * to order. Kept short and rare so they stay worth opening.
 */
export const ALERT_MAX = 140;
export const ALERTS_PER_WEEK = 2;
/** How long an alert stays in a customer's Activity. */
export const ALERT_DAYS = 14;

const WEEK_MS = 7 * 86_400_000;

/** Alerts this kitchen sent in the last 7 days, newest first. */
export function recentAlerts(alerts: KitchenAlert[], restaurantId: string, now: Date): KitchenAlert[] {
  return alerts
    .filter((a) => a.restaurantId === restaurantId && now.getTime() - new Date(a.at).getTime() < WEEK_MS)
    .sort((a, b) => b.at.localeCompare(a.at));
}

export function alertsLeft(alerts: KitchenAlert[], restaurantId: string, now: Date): number {
  return Math.max(0, ALERTS_PER_WEEK - recentAlerts(alerts, restaurantId, now).length);
}

/** When the oldest alert of the week drops out, freeing a slot. */
export function nextAlertAt(alerts: KitchenAlert[], restaurantId: string, now: Date): Date | null {
  const recent = recentAlerts(alerts, restaurantId, now);
  if (recent.length < ALERTS_PER_WEEK) return null;
  return new Date(new Date(recent[recent.length - 1].at).getTime() + WEEK_MS);
}

export function cleanAlert(text: string): string {
  return text.replace(/\s+/g, ' ').trim().slice(0, ALERT_MAX);
}

export function canSendAlert(alerts: KitchenAlert[], restaurantId: string, text: string, now: Date): boolean {
  return cleanAlert(text).length > 0 && alertsLeft(alerts, restaurantId, now) > 0;
}

/** Alerts from kitchens this customer saved, from the last two weeks, newest first. */
export function followedAlerts(alerts: KitchenAlert[], savedIds: string[], now: Date): KitchenAlert[] {
  const saved = new Set(savedIds);
  const since = now.getTime() - ALERT_DAYS * 86_400_000;
  return alerts
    .filter((a) => saved.has(a.restaurantId) && new Date(a.at).getTime() >= since && new Date(a.at) <= now)
    .sort((a, b) => b.at.localeCompare(a.at));
}

/** Ready-made alerts from what the kitchen has coming up. */
export function alertSuggestions(r: Pick<Restaurant, 'bakeDays' | 'skippedBakeDays' | 'menu' | 'signatureItemId'>, now: Date): string[] {
  const out: string[] = [];
  const next = openBakeDays(r, now)[0];
  if (next) out.push(`Orders are open for ${bakeDayDate(next, now)}’s bake day. Get yours in before they’re gone.`);
  const signature = r.menu.find((m) => m.id === r.signatureItemId && m.available);
  if (signature) out.push(`${signature.name} is back this week.`);
  out.push('Fresh batch just came out of the oven. Order now for pickup today.');
  return out.map(cleanAlert);
}
