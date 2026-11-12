import { router, useLocalSearchParams } from 'expo-router';
import { Linking, Platform } from 'react-native';

import { FallbackScreen } from '@/components/fallback';

/**
 * Where Stripe sends people after payout setup or Pro checkout, on the Manna
 * website (the web build at SITE_URL). It says what happened and opens the
 * app again. Paths are set in supabase/functions/stripe-connect and pro-billing.
 */
const STEPS: Record<string, { eyebrow: string; title: string; body: string; to: '/chef/dashboard' | '/chef/pro' }> = {
  'payouts-done': {
    eyebrow: 'Payouts',
    title: 'You’re set up with Stripe',
    body: 'Close this page and go back to Manna. Your dashboard shows “Payouts” once Stripe has checked your details, usually within minutes.',
    to: '/chef/dashboard',
  },
  'payouts-refresh': {
    eyebrow: 'Payouts',
    title: 'That link expired',
    body: 'Go back to Manna and tap “Set up payouts” again. Stripe keeps what you already entered.',
    to: '/chef/dashboard',
  },
  'pro-done': {
    eyebrow: 'Manna Pro',
    title: 'All set',
    body: 'Close this page and go back to Manna. Your Pro page updates in a moment.',
    to: '/chef/pro',
  },
  'pro-cancel': {
    eyebrow: 'Manna Pro',
    title: 'Nothing was charged',
    body: 'You left checkout before paying. Start Pro again from your Pro page whenever you’re ready.',
    to: '/chef/pro',
  },
};

export default function StripeReturn() {
  const { step } = useLocalSearchParams<{ step: string }>();
  const page = STEPS[step] ?? STEPS['pro-done'];
  const back = () => {
    if (Platform.OS === 'web') void Linking.openURL(`manna:/${page.to}`).catch(() => router.replace(page.to));
    else router.replace(page.to);
  };
  return (
    <FallbackScreen
      eyebrow={page.eyebrow}
      title={page.title}
      body={page.body}
      action={{ title: 'Back to Manna', onPress: back }}
    />
  );
}

export function generateStaticParams(): { step: string }[] {
  return Object.keys(STEPS).map((step) => ({ step }));
}
