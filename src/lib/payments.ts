/**
 * Paying by card. Card payments switch on with the backend plus one more
 * setting in `.env`:
 *
 *   EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
 *
 * The publishable key is safe to ship; the secret key lives only in the
 * server functions (docs/GO_LIVE.md). The phone apps use Stripe's payment
 * sheet (payments.native.ts). This web build is the demo, where nothing is
 * charged, so it only explains where to pay.
 */
import { isBackendConfigured } from '@/lib/supabase';

const publishableKey = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? '';

/** True when orders are paid by card at checkout. */
export const cardPaymentsOn = isBackendConfigured && publishableKey.length > 0;

export type SheetResult = 'paid' | 'canceled';

/** Shows the card sheet for a payment the server started. */
export async function presentCardSheet(_clientSecret: string): Promise<SheetResult> {
  throw new Error('Card payments work in the Manna app for iPhone and Android.');
}
