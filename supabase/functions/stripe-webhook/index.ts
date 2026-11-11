/**
 * Stripe tells Manna what happened, and this keeps the database in step:
 *
 * - payment_intent.succeeded / payment_failed: the order is paid (and shows up
 *   for the kitchen) or failed. An order cancelled mid-payment is refunded.
 * - charge.refunded: the order is marked refunded.
 * - account.updated (Connect): a cook's payouts are ready.
 * - customer.subscription.*: Manna Pro turns on, changes plan or is canceled.
 *
 * Every event is checked against the signing secret before anything changes.
 * Set STRIPE_WEBHOOK_SECRET for the account endpoint and, if Connect events go
 * to a separate endpoint, STRIPE_CONNECT_WEBHOOK_SECRET for that one.
 */
import Stripe from 'npm:stripe@17';

import { admin, env, stripe } from '../_shared/clients.ts';
import { json } from '../_shared/http.ts';
import { payoutsReady, planForPrice, proColumns, refundsInFull, subscriptionStarted } from '../_shared/money.ts';

const crypto = Stripe.createSubtleCryptoProvider();
const secrets = [Deno.env.get('STRIPE_WEBHOOK_SECRET'), Deno.env.get('STRIPE_CONNECT_WEBHOOK_SECRET')].filter(
  (s): s is string => !!s,
);

async function verify(body: string, signature: string): Promise<Stripe.Event | null> {
  for (const secret of secrets) {
    try {
      return await stripe.webhooks.constructEventAsync(body, signature, secret, undefined, crypto);
    } catch {
      // Try the next endpoint's secret.
    }
  }
  return null;
}

/** The card went through: the order shows up for the kitchen (and a priced custom order is accepted). */
async function paid(intent: Stripe.PaymentIntent) {
  const orderId = intent.metadata?.order_id;
  if (!orderId) return;
  const { data: status, error } = await admin.rpc('mark_order_paid', { p_order_id: orderId });
  if (error) throw error;
  // Cancelled while the payment was going through: give it all back.
  if (refundsInFull(status as string)) {
    await stripe.refunds.create(
      { payment_intent: intent.id, reverse_transfer: true, refund_application_fee: true },
      { idempotencyKey: `refund-${orderId}` },
    );
  }
}

async function failed(intent: Stripe.PaymentIntent) {
  const orderId = intent.metadata?.order_id;
  if (!orderId) return;
  // A late "failed" never overwrites a payment that went through.
  const { error } = await admin.from('orders').update({ payment_status: 'failed' }).eq('id', orderId).eq('payment_status', 'unpaid');
  if (error) throw error;
}

async function syncSubscription(sub: Stripe.Subscription) {
  const restaurantId = sub.metadata?.restaurant_id;
  if (!restaurantId || !subscriptionStarted(sub.status)) return;
  const plan = planForPrice(sub.items.data[0]?.price.id ?? '', {
    monthly: Deno.env.get('STRIPE_PRICE_MONTHLY'),
    yearly: Deno.env.get('STRIPE_PRICE_YEARLY'),
  });
  if (!plan) return;
  const columns = proColumns({
    status: sub.status,
    created: sub.created,
    start_date: sub.start_date,
    trial_end: sub.trial_end,
    cancel_at_period_end: sub.cancel_at_period_end,
    canceled_at: sub.canceled_at,
    ended_at: sub.ended_at,
    plan,
  });
  const { error } = await admin.from('restaurants').update(columns).eq('id', restaurantId);
  if (error) throw error;
}

Deno.serve(async (req) => {
  env('STRIPE_WEBHOOK_SECRET');
  const event = await verify(await req.text(), req.headers.get('Stripe-Signature') ?? '');
  if (!event) return json({ error: 'Bad signature' }, 400);

  try {
    switch (event.type) {
      case 'payment_intent.succeeded':
        await paid(event.data.object);
        break;
      case 'payment_intent.payment_failed':
        await failed(event.data.object);
        break;
      case 'charge.refunded': {
        const charge = event.data.object;
        if (!charge.refunded || typeof charge.payment_intent !== 'string') break;
        const { error } = await admin
          .from('orders')
          .update({ payment_status: 'refunded' })
          .eq('payment_intent_id', charge.payment_intent);
        if (error) throw error;
        break;
      }
      case 'account.updated': {
        const account = event.data.object;
        const { error } = await admin
          .from('payment_accounts')
          .update({ payouts_ready: payoutsReady(account), updated_at: new Date().toISOString() })
          .eq('stripe_account_id', account.id);
        if (error) throw error;
        break;
      }
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        await syncSubscription(event.data.object);
        break;
      default:
        break;
    }
  } catch (e) {
    // A 500 makes Stripe retry the event later.
    console.error(event.type, e);
    return json({ error: 'Not saved' }, 500);
  }
  return json({ received: true });
});
