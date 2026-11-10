import type { CartLine, MenuItem, Order, Restaurant } from '@/types';

import { remainingToday } from './limits';
import { endedWithoutSale } from './orders';
import { kitchenPayout } from './pricing';

/* ---------- Order again ---------- */

/** The customer's most recent order from each kitchen, newest first. */
export function recentKitchenOrders(orders: Order[], customerId: string, limit = 6): Order[] {
  const seen = new Set<string>();
  const result: Order[] = [];
  const mine = orders
    .filter((o) => o.customerId === customerId && !endedWithoutSale(o.status))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  for (const o of mine) {
    if (seen.has(o.restaurantId)) continue;
    seen.add(o.restaurantId);
    result.push(o);
    if (result.length === limit) break;
  }
  return result;
}

export interface ReorderResult {
  lines: CartLine[];
  /** Dish names that couldn't be added in full (removed from the menu, sold out or limited). */
  missing: string[];
}

/** Rebuilds a past order as a cart, respecting what the kitchen can still make today. */
export function buildReorder(order: Order, restaurant: Restaurant, allOrders: Order[], now: Date): ReorderResult {
  const lines: CartLine[] = [];
  const missing: string[] = [];
  for (const line of order.lines) {
    const item = restaurant.menu.find((m) => m.id === line.itemId);
    if (!item || !item.available) {
      missing.push(line.name);
      continue;
    }
    const left = remainingToday(item, allOrders, restaurant.id, now);
    const quantity = left === null ? line.quantity : Math.min(line.quantity, left);
    if (quantity < line.quantity) missing.push(line.name);
    if (quantity > 0) lines.push({ itemId: item.id, quantity });
  }
  return { lines, missing };
}

/* ---------- Dish search ---------- */

export interface DishMatch {
  restaurant: Restaurant;
  item: MenuItem;
}

/** Dishes whose name or description matches the query, from live kitchens. */
export function searchDishes(restaurants: Restaurant[], query: string, limit = 8): DishMatch[] {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];
  const matches: (DishMatch & { score: number })[] = [];
  for (const restaurant of restaurants) {
    if (restaurant.status !== 'live') continue;
    for (const item of restaurant.menu) {
      if (!item.available) continue;
      const name = item.name.toLowerCase();
      const score = name.startsWith(q) ? 3 : name.includes(q) ? 2 : item.description.toLowerCase().includes(q) ? 1 : 0;
      if (score) matches.push({ restaurant, item, score });
    }
  }
  return matches
    .sort((a, b) => b.score - a.score || a.item.name.localeCompare(b.item.name))
    .slice(0, limit)
    .map(({ restaurant, item }) => ({ restaurant, item }));
}

/* ---------- Chef dashboard ---------- */

export interface PrepItem {
  itemId: string;
  name: string;
  /** Portions still to cook across accepted and in-progress orders. */
  toCook: number;
  /** Portions waiting on the chef to accept. */
  pending: number;
}

/** What the kitchen needs to cook right now, summed across open orders. */
export function prepList(orders: Order[], restaurantId: string): PrepItem[] {
  const byItem = new Map<string, PrepItem>();
  for (const order of orders) {
    if (order.restaurantId !== restaurantId) continue;
    const cooking = order.status === 'accepted' || order.status === 'preparing';
    const pending = order.status === 'placed';
    if (!cooking && !pending) continue;
    for (const line of order.lines) {
      const entry = byItem.get(line.itemId) ?? { itemId: line.itemId, name: line.name, toCook: 0, pending: 0 };
      if (cooking) entry.toCook += line.quantity;
      else entry.pending += line.quantity;
      byItem.set(line.itemId, entry);
    }
  }
  return [...byItem.values()].sort((a, b) => b.toCook + b.pending - (a.toCook + a.pending));
}

export interface DayEarnings {
  /** "Mon", "Tue", … */
  label: string;
  cents: number;
  isToday: boolean;
}

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/**
 * The chef's earnings (food and tips, after the kitchen fee) for the last 7 days,
 * oldest first. Only completed orders count.
 */
export function weeklyEarnings(orders: Order[], restaurantId: string, now: Date): DayEarnings[] {
  const days: DayEarnings[] = [];
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  for (let i = 6; i >= 0; i--) {
    const day = new Date(start);
    day.setDate(start.getDate() - i);
    days.push({ label: DAY_LABELS[day.getDay()], cents: 0, isToday: i === 0 });
  }
  for (const order of orders) {
    if (order.restaurantId !== restaurantId || order.status !== 'completed') continue;
    const created = new Date(order.createdAt);
    const createdDay = new Date(created.getFullYear(), created.getMonth(), created.getDate());
    const diff = Math.round((start.getTime() - createdDay.getTime()) / 86_400_000);
    if (diff >= 0 && diff <= 6) days[6 - diff].cents += kitchenPayout(order);
  }
  return days;
}
