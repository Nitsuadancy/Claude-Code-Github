/**
 * Refunds an order in full when the kitchen declines it or the customer
 * cancels before the kitchen accepts. The cook's share and Manna's fees are
 * both returned. Called by the app right after the decline or cancel; safe to
 * call twice.
 *
 * POST { order_id }
 */
import { admin, requireUser, stripe } from '../_shared/clients.ts';
import { handle, json, Refusal } from '../_shared/http.ts';
import { refundsInFull } from '../_shared/money.ts';

Deno.serve(
  handle(async (req) => {
    const user = await requireUser(req);
    const { order_id } = await req.json();
    const { data: order } = await admin.from('orders').select('*').eq('id', order_id).maybeSingle();
    if (!order) throw new Refusal('Order not found.', 404);
    const { data: kitchen } = await admin.from('restaurants').select('owner_id').eq('id', order.restaurant_id).single();
    if (order.customer_id !== user.id && kitchen?.owner_id !== user.id) throw new Refusal('Order not found.', 404);
    if (!refundsInFull(order.status)) throw new Refusal('Only declined or cancelled orders are refunded here.');
    if (order.payment_status !== 'paid' || !order.payment_intent_id) return json({ refunded: false });

    await stripe.refunds.create(
      { payment_intent: order.payment_intent_id, reverse_transfer: true, refund_application_fee: true },
      { idempotencyKey: `refund-${order.id}` },
    );
    await admin.from('orders').update({ payment_status: 'refunded' }).eq('id', order.id);
    return json({ refunded: true });
  }),
);
