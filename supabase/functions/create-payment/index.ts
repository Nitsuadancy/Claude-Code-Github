/**
 * Charges a customer for an order they just placed. The order's amounts come
 * from the database (place_order worked them out); Manna keeps the movement
 * fee and the kitchen fee, and the rest goes straight to the cook's Stripe
 * account. Returns the client secret for the app's payment sheet. The order
 * shows up for the kitchen once Stripe confirms the payment (stripe-webhook).
 *
 * POST { order_id }
 */
import { admin, requireUser, stripe } from '../_shared/clients.ts';
import { handle, json, Refusal } from '../_shared/http.ts';
import { applicationFeeCents, checkAmounts } from '../_shared/money.ts';

Deno.serve(
  handle(async (req) => {
    const user = await requireUser(req);
    const { order_id } = await req.json();
    const { data: order } = await admin.from('orders').select('*').eq('id', order_id).maybeSingle();
    if (!order || order.customer_id !== user.id) throw new Refusal('Order not found.', 404);
    if (order.status !== 'placed') throw new Refusal('This order can’t be paid now.');
    if (order.payment_status === 'paid') throw new Refusal('This order is already paid.');
    const problem = checkAmounts(order);
    if (problem) throw new Refusal(problem);

    const { data: kitchen } = await admin.from('restaurants').select('owner_id, name').eq('id', order.restaurant_id).single();
    const { data: payout } = await admin
      .from('payment_accounts')
      .select('stripe_account_id, payouts_ready')
      .eq('profile_id', kitchen!.owner_id)
      .maybeSingle();
    if (!payout?.stripe_account_id || !payout.payouts_ready) throw new Refusal('This kitchen can’t take payments yet.');

    // Reuse the payment if the customer opens the sheet again.
    if (order.payment_intent_id) {
      const existing = await stripe.paymentIntents.retrieve(order.payment_intent_id);
      if (existing.status !== 'canceled') return json({ clientSecret: existing.client_secret });
    }

    const intent = await stripe.paymentIntents.create(
      {
        amount: order.total_cents,
        currency: 'usd',
        automatic_payment_methods: { enabled: true },
        application_fee_amount: applicationFeeCents(order),
        transfer_data: { destination: payout.stripe_account_id },
        description: `Manna order from ${kitchen!.name}`,
        metadata: { order_id: order.id, restaurant_id: order.restaurant_id, customer_id: user.id },
      },
      { idempotencyKey: `order-${order.id}` },
    );
    await admin.from('orders').update({ payment_intent_id: intent.id }).eq('id', order.id);
    return json({ clientSecret: intent.client_secret });
  }),
);
