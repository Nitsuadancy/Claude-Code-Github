/**
 * Paying for an order the server just created. Without card payments switched
 * on this does nothing and the order goes through as before.
 *
 * If the person closes the card sheet or the card fails, the order is called
 * off at once (cancel_order), so it never sits waiting for the kitchen. For a
 * custom order, that puts the kitchen's price back up so they can try again.
 */
import { cardPaymentsOn, presentCardSheet } from '@/lib/payments';

import * as api from './api';

/** Returns true when the order is paid (or payments are off), false when the person backed out. */
export async function payForOrder(db: api.Db, orderId: string): Promise<boolean> {
  if (!cardPaymentsOn) return true;
  let result: 'paid' | 'canceled';
  try {
    result = await presentCardSheet(await api.startPayment(db, orderId));
  } catch (e) {
    await api.cancelOrder(db, orderId).catch(() => undefined);
    throw e;
  }
  if (result === 'canceled') await api.cancelOrder(db, orderId).catch(() => undefined);
  return result === 'paid';
}

/** The line under the checkout button. */
export const CHECKOUT_PAYMENT_NOTE = cardPaymentsOn
  ? 'You pay now. If the kitchen can’t take your order, you get every cent back.'
  : 'Payments aren’t connected yet. Placing an order sends it to the kitchen without charging a card.';
