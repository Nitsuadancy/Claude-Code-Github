/**
 * Oven updates: while an order is being made, the cook can send the customer
 * a line and a photo ("Rolls are proofing", a tray fresh out of the oven).
 */
import type { Order, OrderUpdate } from '@/types';

import { isActive } from './orders';

/** Longest update, in characters. */
export const ORDER_UPDATE_MAX = 280;
/** Updates per order, so the order screen stays a short story, not a chat. */
export const ORDER_UPDATES_MAX = 8;

/** Every update on an order, oldest first, including a note sent before updates had photos. */
export function orderUpdates(order: Pick<Order, 'id' | 'chefNote' | 'updates' | 'statusHistory' | 'createdAt'>): OrderUpdate[] {
  const updates = [...(order.updates ?? [])].sort((a, b) => a.at.localeCompare(b.at));
  if (!order.chefNote.trim()) return updates;
  const last = order.statusHistory[order.statusHistory.length - 1];
  // Older notes came with or just after the latest status change.
  const at = new Date(new Date(last?.at ?? order.createdAt).getTime() + 1).toISOString();
  const legacy: OrderUpdate = { id: `${order.id}:note`, text: order.chefNote, at };
  return [legacy, ...updates];
}

/** An update needs words or a photo, and only goes to orders still in progress. */
export function canPostOrderUpdate(
  order: Pick<Order, 'status' | 'updates'>,
  update: { text: string; photoUri?: string },
): boolean {
  if (!isActive(order.status) || order.status === 'placed') return false;
  if ((order.updates ?? []).length >= ORDER_UPDATES_MAX) return false;
  return update.text.trim().length > 0 || !!update.photoUri;
}
