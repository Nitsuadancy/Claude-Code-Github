import type { OrderStatus } from '@/types';

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  placed: 'Waiting for kitchen',
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
