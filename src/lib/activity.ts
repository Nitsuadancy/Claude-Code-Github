import type { CustomRequest, KitchenAlert, Order, OrderMessage, OrderStatus } from '@/types';

import { orderUpdates } from './order-updates';

export interface ActivityItem {
  id: string;
  /** What tapping opens: an order (or its chat), a kitchen, or a custom request. */
  orderId?: string;
  restaurantId?: string;
  requestId?: string;
  at: string;
  kind: OrderStatus | 'note' | 'message' | 'alert' | 'quote';
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

/**
 * A customer's order updates, chef notes, messages from kitchens, alerts from
 * kitchens they saved and replies to their custom requests, newest first.
 */
export function buildActivity(
  orders: Order[],
  customerId: string,
  messages: OrderMessage[] = [],
  { alerts = [], requests = [] }: { alerts?: KitchenAlert[]; requests?: CustomRequest[] } = {},
): ActivityItem[] {
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
  for (const a of alerts) {
    items.push({
      id: `alert:${a.id}`,
      restaurantId: a.restaurantId,
      at: a.at,
      kind: 'alert',
      title: a.restaurantName,
      body: a.text,
    });
  }
  for (const r of requests) {
    if (r.customerId !== customerId) continue;
    if (r.status === 'quoted' && r.quote) {
      items.push({
        id: `request:${r.id}:quote`,
        requestId: r.id,
        at: r.quote.at,
        kind: 'quote',
        title: `${r.restaurantName} sent a price for your ${r.occasion.toLowerCase()}`,
        body: 'Tap to see it and order.',
      });
    } else if (r.status === 'declined') {
      items.push({
        id: `request:${r.id}:declined`,
        requestId: r.id,
        at: r.createdAt,
        kind: 'declined',
        title: `${r.restaurantName} can’t take your ${r.occasion.toLowerCase()} request`,
        body: r.declineNote ? `“${r.declineNote}”` : 'Try another kitchen, or a different date.',
      });
    }
  }
  return items.sort((a, b) => b.at.localeCompare(a.at));
}

export function unseenCount(items: ActivityItem[], seenAt: string | null): number {
  if (!seenAt) return items.length;
  return items.filter((i) => i.at > seenAt).length;
}
