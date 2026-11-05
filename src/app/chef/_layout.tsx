import { Redirect, Stack } from 'expo-router';

import { useStore } from '@/state/store';
import { colors } from '@/theme';

export default function ChefLayout() {
  const { state } = useStore();
  if (!state.user) return <Redirect href="/" />;
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.white },
        animation: 'slide_from_right',
      }}
    />
  );
}
