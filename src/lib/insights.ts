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

/* ---------- Pro insights ---------- */

export interface KitchenInsights {
  /** Completed orders and what the kitchen received, this calendar month and last. */
  month: { payoutCents: number; orders: number; avgOrderCents: number };
  lastMonth: { payoutCents: number; orders: number };
  /** Customers with 2 or more completed orders, most orders first (top 5). */
  regulars: { name: string; orders: number; lastAt: string }[];
  /** Share of customers in the last 90 days who ordered more than once (0 to 1). */
  repeatRate: number;
  /** Dishes by portions sold in the last 30 days (top 5). */
  bestSellers: { name: string; quantity: number }[];
  /** Take-home by weekday over the last 90 days, Monday first. */
  weekdays: { label: string; cents: number }[];
  /** Pickups by hour of day over the last 90 days, only hours with pickups, earliest first. */
  pickupHours: { hour: number; count: number }[];
}

const DAY_MS = 86_400_000;
const MONDAY_FIRST = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function kitchenInsights(orders: Order[], restaurantId: string, now: Date): KitchenInsights {
  const done = orders.filter((o) => o.restaurantId === restaurantId && o.status === 'completed');
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const inMonth = done.filter((o) => new Date(o.createdAt) >= monthStart);
  const inLast = done.filter((o) => new Date(o.createdAt) >= lastStart && new Date(o.createdAt) < monthStart);
  const sum = (list: Order[]) => list.reduce((t, o) => t + kitchenPayout(o), 0);
  const recent = (days: number) => done.filter((o) => now.getTime() - new Date(o.createdAt).getTime() <= days * DAY_MS);

  const byCustomer = new Map<string, { name: string; orders: number; lastAt: string }>();
  for (const o of done) {
    const c = byCustomer.get(o.customerId) ?? { name: o.customerName || 'Customer', orders: 0, lastAt: o.createdAt };
    c.orders += 1;
    if (o.createdAt > c.lastAt) c.lastAt = o.createdAt;
    byCustomer.set(o.customerId, c);
  }
  const regulars = [...byCustomer.values()]
    .filter((c) => c.orders >= 2)
    .sort((a, b) => b.orders - a.orders || b.lastAt.localeCompare(a.lastAt))
    .slice(0, 5);

  const last90 = recent(90);
  const counts90 = new Map<string, number>();
  for (const o of last90) counts90.set(o.customerId, (counts90.get(o.customerId) ?? 0) + 1);
  const repeatRate = counts90.size ? [...counts90.values()].filter((n) => n > 1).length / counts90.size : 0;

  const sold = new Map<string, number>();
  for (const o of recent(30)) for (const l of o.lines) sold.set(l.name, (sold.get(l.name) ?? 0) + l.quantity);
  const bestSellers = [...sold.entries()]
    .map(([name, quantity]) => ({ name, quantity }))
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 5);

  const weekdays = MONDAY_FIRST.map((label) => ({ label, cents: 0 }));
  const hours = new Map<number, number>();
  for (const o of last90) {
    const placed = new Date(o.createdAt);
    weekdays[(placed.getDay() + 6) % 7].cents += kitchenPayout(o);
    const pickup = new Date(o.scheduledFor ?? o.estimatedReadyAt);
    hours.set(pickup.getHours(), (hours.get(pickup.getHours()) ?? 0) + 1);
  }

  return {
    month: { payoutCents: sum(inMonth), orders: inMonth.length, avgOrderCents: inMonth.length ? Math.round(sum(inMonth) / inMonth.length) : 0 },
    lastMonth: { payoutCents: sum(inLast), orders: inLast.length },
    regulars,
    repeatRate,
    bestSellers,
    weekdays,
    pickupHours: [...hours.entries()].map(([hour, count]) => ({ hour, count })).sort((a, b) => a.hour - b.hour),
  };
}

/** "9 AM", "12 PM", "3 PM" */
export function hourLabel(hour: number): string {
  const h = hour % 12 || 12;
  return `${h} ${hour < 12 ? 'AM' : 'PM'}`;
}
