import type { OrderStatus } from '@/types';

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  placed: 'Waiting for the kitchen',
  accepted: 'Accepted',
  preparing: 'Being prepared',
  ready: 'Ready / on the way',
  completed: 'Delivered',
  declined: 'Declined by kitchen',
};

/** Button text a kitchen sees for moving an order to `status`. */
export const KITCHEN_ACTION_LABEL: Record<OrderStatus, string> = {
  placed: 'Placed',
  accepted: 'Accept',
  preparing: 'Start preparing',
  ready: 'Mark ready',
  completed: 'Mark delivered',
  declined: 'Decline',
};

/** The happy path, in order, for progress bars. */
export const ORDER_PROGRESS: OrderStatus[] = ['placed', 'accepted', 'preparing', 'ready', 'completed'];

export function isActive(status: OrderStatus): boolean {
  return status !== 'completed' && status !== 'declined';
}

export function formatOrderTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/** ISO time the food should be ready, from when it was ordered plus the kitchen's prep time. */
export function estimateReadyAt(createdAt: string, prepMinutes: number): string {
  return new Date(new Date(createdAt).getTime() + prepMinutes * 60_000).toISOString();
}

/** "7:45 PM" in the device's locale. */
export function formatClock(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

/** Customer-facing headline for each status on the tracking screen. */
export const ORDER_HEADLINE: Record<OrderStatus, string> = {
  placed: 'Order sent to the kitchen',
  accepted: 'The chef accepted your order',
  preparing: 'Your food is being prepared',
  ready: 'Ready and on its way',
  completed: 'Delivered. Enjoy!',
  declined: 'The kitchen couldn’t take this order',
};

/** "Nov 5" in the device's locale. */
export function formatMonthDay(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}
