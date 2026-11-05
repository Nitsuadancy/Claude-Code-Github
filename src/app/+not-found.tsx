import { router } from 'expo-router';

import { FallbackScreen } from '@/components/fallback';

export default function NotFound() {
  return (
    <FallbackScreen
      eyebrow="Off the menu"
      title="We couldn’t find that page"
      body="It may have moved, or the link might be old. Let’s get you back to the kitchen."
      action={{ title: 'Back to Manna', onPress: () => router.replace('/') }}
    />
  );
}
