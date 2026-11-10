/**
 * What an order shows on the iPhone lock screen and in the Dynamic Island
 * while it's in progress, and when that Live Activity starts, updates and
 * ends. Pure logic, so it's tested here; the native part is switched on in
 * the first iPhone build (see docs/LIVE_ACTIVITY.md).
 */
import type { Order, OrderStatus } from '@/types';

import { formatClock, isActive, isAddressShared, ORDER_PROGRESS } from './orders';

export interface LiveActivityContent {
  /** "Susie's Sweets" */
  kitchen: string;
  /** "Being prepared" */
  status: string;
  /** 0 to 1 along placed → picked up, for the progress bar. */
  progress: number;
  /** "Ready about 3:15 PM" or "Pick up by 6:00 PM" */
  detail: string;
  /** Shown once the kitchen has shared it; empty before. */
  address: string;
  /** Short words for the Dynamic Island's small spaces. */
  compact: string;
}

const STATUS: Record<OrderStatus, string> = {
  placed: 'Sent to the kitchen',
  accepted: 'Accepted',
  preparing: 'Being prepared',
  ready: 'Ready for pickup',
  completed: 'Picked up',
  declined: 'Couldn’t be made',
  cancelled: 'Cancelled',
};

const COMPACT: Record<OrderStatus, string> = {
  placed: 'Sent',
  accepted: 'Accepted',
  preparing: 'Baking',
  ready: 'Ready',
  completed: 'Done',
  declined: 'Declined',
  cancelled: 'Cancelled',
};

export function liveActivityContent(
  order: Pick<Order, 'restaurantName' | 'status' | 'estimatedReadyAt' | 'scheduledFor' | 'pickupBy' | 'pickupAddress'>,
): LiveActivityContent {
  const step = ORDER_PROGRESS.indexOf(order.status);
  const progress = step < 0 ? 1 : step / (ORDER_PROGRESS.length - 1);
  const detail =
    order.status === 'ready'
      ? order.pickupBy
        ? `Pick up by ${formatClock(order.pickupBy)}`
        : 'Ready now'
      : order.scheduledFor
        ? `Pickup from ${formatClock(order.scheduledFor)}`
        : `Ready about ${formatClock(order.estimatedReadyAt)}`;
  return {
    kitchen: order.restaurantName,
    status: STATUS[order.status],
    progress,
    detail: isActive(order.status) ? detail : STATUS[order.status],
    address: isAddressShared(order.status) ? order.pickupAddress : '',
    compact: COMPACT[order.status],
  };
}

/** What to do with an order's Live Activity when its status changes. */
export function liveActivityAction(
  previous: OrderStatus | undefined,
  next: OrderStatus,
): 'start' | 'update' | 'end' | null {
  if (previous === next) return null;
  if (previous === undefined) return isActive(next) ? 'start' : null;
  if (!isActive(next)) return isActive(previous) ? 'end' : null;
  return 'update';
}
