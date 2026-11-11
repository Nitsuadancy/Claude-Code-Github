/**
 * Stripe's payment sheet on iPhone and Android: card, Apple Pay (once the
 * Apple merchant id is set) and Google Pay. See payments.ts for the switch.
 *
 * Stripe's native code loads only when card payments are on, so the demo
 * still runs in Expo Go.
 */
import type * as StripeSdk from '@stripe/stripe-react-native';

import { isBackendConfigured } from '@/lib/supabase';
import { colors } from '@/theme';

import type { SheetResult } from './payments';

export type { SheetResult } from './payments';

const publishableKey = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? '';
/** Apple Pay needs a merchant id from the Apple Developer account (docs/GO_LIVE.md). */
const appleMerchantId = process.env.EXPO_PUBLIC_APPLE_MERCHANT_ID ?? '';

export const cardPaymentsOn = isBackendConfigured && publishableKey.length > 0;

let sdk: Promise<typeof StripeSdk> | null = null;

function stripe(): Promise<typeof StripeSdk> {
  sdk ??= (async () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const loaded = require('@stripe/stripe-react-native') as typeof StripeSdk;
    await loaded.initStripe({
      publishableKey,
      ...(appleMerchantId ? { merchantIdentifier: appleMerchantId } : {}),
      urlScheme: 'manna',
    });
    return loaded;
  })();
  return sdk;
}

const appearance: StripeSdk.PaymentSheet.AppearanceParams = {
  colors: {
    primary: colors.gold,
    background: colors.bg,
    componentBackground: colors.surface,
    componentBorder: colors.border,
    componentDivider: colors.border,
    primaryText: colors.ivory,
    secondaryText: colors.textMuted,
    componentText: colors.text,
    placeholderText: colors.textFaint,
    icon: colors.textMuted,
    error: colors.danger,
  },
  shapes: { borderRadius: 14, borderWidth: 1 },
  primaryButton: { colors: { background: colors.gold, text: colors.onGold }, shapes: { borderRadius: 999 } },
};

/** Shows the card sheet for a payment the server started (create-payment). */
export async function presentCardSheet(clientSecret: string): Promise<SheetResult> {
  if (!cardPaymentsOn) throw new Error('Card payments aren’t switched on yet.');
  const { initPaymentSheet, presentPaymentSheet, PaymentSheetError } = await stripe();
  const init = await initPaymentSheet({
    merchantDisplayName: 'Manna',
    paymentIntentClientSecret: clientSecret,
    returnURL: 'manna://stripe-redirect',
    style: 'alwaysDark',
    appearance,
    ...(appleMerchantId ? { applePay: { merchantCountryCode: 'US' } } : {}),
    googlePay: { merchantCountryCode: 'US', currencyCode: 'USD', testEnv: publishableKey.startsWith('pk_test') },
  });
  if (init.error) throw new Error(init.error.message);
  const shown = await presentPaymentSheet();
  if (shown.error) {
    if (shown.error.code === PaymentSheetError.Canceled) return 'canceled';
    throw new Error(shown.error.message);
  }
  return 'paid';
}
