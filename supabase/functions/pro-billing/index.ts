/**
 * Manna Pro billing for a cook's kitchen. Without a subscription, returns a
 * Stripe Checkout link for the plan they picked (founding kitchens aren't
 * charged until their free months end). With one, returns a link to Stripe's
 * billing portal to switch plans, update the card or cancel. Stripe reports
 * the result to stripe-webhook, which turns Pro on or off.
 *
 * POST { plan?: 'monthly' | 'yearly' }  ->  { url }
 */
import { admin, env, requireUser, SITE_URL, stripe } from '../_shared/clients.ts';
import { handle, json, Refusal } from '../_shared/http.ts';
import { proTrialEnd } from '../_shared/money.ts';

Deno.serve(
  handle(async (req) => {
    const user = await requireUser(req);
    const { plan } = (await req.json().catch(() => ({}))) as { plan?: string };
    const { data: kitchen } = await admin
      .from('restaurants')
      .select('id, name, founding, live_since, created_at, status')
      .eq('owner_id', user.id)
      .maybeSingle();
    if (!kitchen) throw new Refusal('Set up your kitchen first.');

    const { data: account } = await admin
      .from('payment_accounts')
      .select('stripe_customer_id')
      .eq('profile_id', user.id)
      .maybeSingle();
    let customerId = account?.stripe_customer_id as string | undefined;
    if (!customerId) {
      const customer = await stripe.customers.create({
        name: kitchen.name,
        email: user.email,
        phone: user.phone,
        metadata: { profile_id: user.id, restaurant_id: kitchen.id },
      });
      customerId = customer.id;
      await admin
        .from('payment_accounts')
        .upsert({ profile_id: user.id, stripe_customer_id: customerId, updated_at: new Date().toISOString() });
    }

    const current = await stripe.subscriptions.list({ customer: customerId, status: 'all', limit: 10 });
    const live = current.data.find((s) => ['active', 'trialing', 'past_due', 'unpaid'].includes(s.status));
    if (live) {
      const portal = await stripe.billingPortal.sessions.create({ customer: customerId, return_url: `${SITE_URL}/return/pro-done` });
      return json({ url: portal.url });
    }

    const price = plan === 'yearly' ? env('STRIPE_PRICE_YEARLY') : env('STRIPE_PRICE_MONTHLY');
    const trialEnd = proTrialEnd(kitchen, new Date());
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price, quantity: 1 }],
      subscription_data: {
        metadata: { restaurant_id: kitchen.id, profile_id: user.id },
        ...(trialEnd ? { trial_end: trialEnd } : {}),
      },
      payment_method_collection: 'always',
      success_url: `${SITE_URL}/return/pro-done`,
      cancel_url: `${SITE_URL}/return/pro-cancel`,
    });
    return json({ url: session.url });
  }),
);
