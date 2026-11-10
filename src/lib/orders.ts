import type { Order, OrderStatus } from '@/types';

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  placed: 'Waiting for the kitchen',
  accepted: 'Accepted',
  preparing: 'Being prepared',
  ready: 'Ready for pickup',
  completed: 'Picked up',
  declined: 'Declined by kitchen',
  cancelled: 'Cancelled',
};

/** Button text a kitchen sees for moving an order to `status`. */
export const KITCHEN_ACTION_LABEL: Record<OrderStatus, string> = {
  placed: 'Placed',
  accepted: 'Accept',
  preparing: 'Start preparing',
  ready: 'Mark ready',
  completed: 'Mark picked up',
  declined: 'Decline',
  cancelled: 'Cancel',
};

/** The happy path, in order, for progress bars. */
export const ORDER_PROGRESS: OrderStatus[] = ['placed', 'accepted', 'preparing', 'ready', 'completed'];

/** The order ended without a sale: the kitchen declined it or the customer cancelled. */
export function endedWithoutSale(status: OrderStatus): boolean {
  return status === 'declined' || status === 'cancelled';
}

/** After the order is ready, or once a bake day's pickup window opens, the customer can say "I'm here". */
export function canSayArrived(
  order: { status: OrderStatus; scheduledFor: string | null; pickupBy?: string; arrivedAt?: string },
  now: Date,
): boolean {
  if (order.arrivedAt || !isActive(order.status) || order.status === 'placed') return false;
  if (order.status === 'ready') return true;
  return !!order.pickupBy && !!order.scheduledFor && now >= new Date(order.scheduledFor) && now <= new Date(order.pickupBy);
}

/** Grace period after the pickup window before an uncollected order counts as a no-show. */
export const NO_SHOW_GRACE_MINUTES = 30;
/** On-demand orders should be picked up within this long of being ready. */
export const PICKUP_WITHIN_HOURS = 2;

/**
 * The line under an active order's headline. A ready order says when to
 * pick it up by, instead of still estimating when it will be ready.
 */
export function pickupStatusLine(
  order: Pick<Order, 'status' | 'statusHistory' | 'estimatedReadyAt' | 'pickupBy'>,
): string {
  if (order.status !== 'ready') return `Estimated ready by ${formatClock(order.estimatedReadyAt)}`;
  const readyAt = [...order.statusHistory].reverse().find((h) => h.status === 'ready')?.at;
  const by =
    order.pickupBy ??
    (readyAt ? new Date(new Date(readyAt).getTime() + PICKUP_WITHIN_HOURS * 3_600_000).toISOString() : null);
  return by ? `Ready now · pick up by ${formatClock(by)}` : 'Ready now';
}

/** Customers can cancel only while the kitchen hasn't said yes yet. */
export function canCustomerCancel(status: OrderStatus): boolean {
  return status === 'placed';
}

/** Home kitchens share their exact address only once they've said yes to an order. */
export function isAddressShared(status: OrderStatus): boolean {
  return status !== 'placed' && !endedWithoutSale(status);
}

/** A short number to say at pickup, e.g. "0472". Stable for an order. */
export function orderNumber(id: string): string {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return String((h >>> 0) % 10000).padStart(4, '0');
}

export function isActive(status: OrderStatus): boolean {
  return status !== 'completed' && !endedWithoutSale(status);
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
  ready: 'Ready for pickup',
  completed: 'Picked up. Enjoy!',
  declined: 'The kitchen couldn’t take this order',
  cancelled: 'You cancelled this order',
};

/** "Nov 5" in the device's locale. */
export function formatMonthDay(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}
