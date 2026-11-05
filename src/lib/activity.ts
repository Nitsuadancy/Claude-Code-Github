import type { Order, OrderStatus } from '@/types';

export interface ActivityItem {
  id: string;
  orderId: string;
  at: string;
  kind: OrderStatus | 'note';
  title: string;
  body: string;
}

const TITLES: Record<OrderStatus, (kitchen: string) => string> = {
  placed: (k) => `Order sent to ${k}`,
  accepted: (k) => `${k} accepted your order`,
  preparing: (k) => `${k} is cooking`,
  ready: () => 'Your order is on its way',
  completed: () => 'Delivered. Enjoy!',
  declined: (k) => `${k} couldn’t take your order`,
};

/** A customer's order updates and chef notes, newest first. */
export function buildActivity(orders: Order[], customerId: string): ActivityItem[] {
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
    if (order.chefNote) {
      const last = order.statusHistory[order.statusHistory.length - 1];
      items.push({
        id: `${order.id}:note`,
        orderId: order.id,
        // Notes come with or after the latest status change.
        at: new Date(new Date(last?.at ?? order.createdAt).getTime() + 1).toISOString(),
        kind: 'note',
        title: `A note from ${order.restaurantName}`,
        body: `“${order.chefNote}”`,
      });
    }
  }
  return items.sort((a, b) => b.at.localeCompare(a.at));
}

export function unseenCount(items: ActivityItem[], seenAt: string | null): number {
  if (!seenAt) return items.length;
  return items.filter((i) => i.at > seenAt).length;
}
