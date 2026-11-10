import type { Order, OrderMessage, OrderStatus } from '@/types';

import { orderUpdates } from './order-updates';

export interface ActivityItem {
  id: string;
  orderId: string;
  at: string;
  kind: OrderStatus | 'note' | 'message';
  title: string;
  body: string;
  /** A photo from the kitchen, shown as a thumbnail. */
  photoUri?: string;
}

const TITLES: Record<OrderStatus, (kitchen: string) => string> = {
  placed: (k) => `Order sent to ${k}`,
  accepted: (k) => `${k} accepted your order`,
  preparing: (k) => `${k} is baking your order`,
  ready: (k) => `Your order is ready at ${k}`,
  completed: () => 'Picked up. Enjoy!',
  declined: (k) => `${k} couldn’t take your order`,
  cancelled: (k) => `You cancelled your order from ${k}`,
};

/** A customer's order updates, chef notes and messages from kitchens, newest first. */
export function buildActivity(orders: Order[], customerId: string, messages: OrderMessage[] = []): ActivityItem[] {
  const items: ActivityItem[] = [];
  for (const order of orders) {
    if (order.customerId !== customerId) continue;
    const dishes = order.lines.map((l) => `${l.quantity} × ${l.name}`).join(', ');
    for (const change of order.statusHistory) {
      items.push({
        id: `${order.id}:${change.status}`,
        orderId: order.id,
        at: change.at,
        kind: change.status,
        title: TITLES[change.status](order.restaurantName),
        body: change.status === 'completed' ? 'Tap to rate your meal.' : dishes,
      });
    }
    for (const update of orderUpdates(order)) {
      items.push({
        id: `${order.id}:update:${update.id}`,
        orderId: order.id,
        at: update.at,
        kind: 'note',
        title: update.photoUri ? `A photo from ${order.restaurantName}` : `A note from ${order.restaurantName}`,
        body: update.text ? `“${update.text}”` : 'Fresh from the kitchen.',
        photoUri: update.photoUri,
      });
    }
  }
  const mine = new Map(orders.filter((o) => o.customerId === customerId).map((o) => [o.id, o]));
  for (const m of messages) {
    const order = mine.get(m.orderId);
    if (!order || m.side !== 'kitchen') continue;
    items.push({
      id: `${m.orderId}:message:${m.id}`,
      orderId: m.orderId,
      at: m.at,
      kind: 'message',
      title: `Message from ${order.restaurantName}`,
      body: m.text.length > 120 ? `${m.text.slice(0, 117)}…` : m.text,
    });
  }
  return items.sort((a, b) => b.at.localeCompare(a.at));
}

export function unseenCount(items: ActivityItem[], seenAt: string | null): number {
  if (!seenAt) return items.length;
  return items.filter((i) => i.at > seenAt).length;
}
