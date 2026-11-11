/**
 * A cook's payouts. Creates their Stripe Express account the first time and
 * returns a link to Stripe's onboarding (bank account, identity, tax info).
 * Once onboarded, returns a link to their Stripe dashboard instead. Stripe
 * tells us when the account is ready through stripe-webhook (account.updated).
 *
 * POST {}  ->  { url, ready }
 */
import { admin, requireUser, SITE_URL, stripe } from '../_shared/clients.ts';
import { handle, json } from '../_shared/http.ts';

Deno.serve(
  handle(async (req) => {
    const user = await requireUser(req);
    const { data: existing } = await admin
      .from('payment_accounts')
      .select('stripe_account_id, payouts_ready')
      .eq('profile_id', user.id)
      .maybeSingle();

    let accountId = existing?.stripe_account_id as string | undefined;
    if (!accountId) {
      const account = await stripe.accounts.create({
        type: 'express',
        country: 'US',
        email: user.email,
        business_type: 'individual',
        capabilities: { card_payments: { requested: true }, transfers: { requested: true } },
        metadata: { profile_id: user.id },
      });
      accountId = account.id;
      await admin
        .from('payment_accounts')
        .upsert({ profile_id: user.id, stripe_account_id: accountId, updated_at: new Date().toISOString() });
    }

    if (existing?.payouts_ready) {
      const login = await stripe.accounts.createLoginLink(accountId);
      return json({ url: login.url, ready: true });
    }
    const link = await stripe.accountLinks.create({
      account: accountId,
      type: 'account_onboarding',
      refresh_url: `${SITE_URL}/payouts/refresh`,
      return_url: `${SITE_URL}/payouts/done`,
    });
    return json({ url: link.url, ready: false });
  }),
);
