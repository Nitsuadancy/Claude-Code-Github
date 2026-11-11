/**
 * The last step of deleting an account, after the app has run
 * delete_my_account() (which clears the person's details from Manna's tables).
 * Cancels any Manna Pro subscription and removes the sign-in. The sign-in is
 * soft-deleted: Supabase scrubs the phone and email but keeps the id, so past
 * orders kitchens rely on for their records stay intact.
 *
 * POST {}
 */
import { admin, requireUser, stripe } from '../_shared/clients.ts';
import { handle, json, Refusal } from '../_shared/http.ts';

Deno.serve(
  handle(async (req) => {
    const user = await requireUser(req);
    const { data: profile } = await admin.from('profiles').select('deleted_at').eq('id', user.id).maybeSingle();
    if (profile && !profile.deleted_at) throw new Refusal('Delete your account from the app first.');

    const { data: account } = await admin
      .from('payment_accounts')
      .select('stripe_customer_id')
      .eq('profile_id', user.id)
      .maybeSingle();
    if (account?.stripe_customer_id) {
      const subs = await stripe.subscriptions.list({ customer: account.stripe_customer_id, status: 'all', limit: 10 });
      for (const sub of subs.data) {
        if (!['canceled', 'incomplete_expired'].includes(sub.status)) await stripe.subscriptions.cancel(sub.id);
      }
    }

    const { error } = await admin.auth.admin.deleteUser(user.id, true);
    if (error) throw error;
    return json({ deleted: true });
  }),
);
