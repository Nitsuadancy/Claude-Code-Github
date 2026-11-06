import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AccountSettings } from '@/components/account-settings';
import { DietPreferences } from '@/components/diet';
import { TAB_BAR_SPACE } from '@/components/tab-bar';
import { Heading, Screen } from '@/components/ui';
import { useStore } from '@/state/store';
import { colors, fonts, radius, spacing } from '@/theme';

export default function Profile() {
  const { state } = useStore();
  const userId = state.user?.id;
  const orders = state.orders.filter((o) => o.customerId === userId && o.status !== 'declined').length;
  const kitchens = new Set(state.orders.filter((o) => o.customerId === userId).map((o) => o.restaurantId)).size;
  const reviews = state.reviews.filter((r) => r.customerId === userId).length;

  return (
    <Screen edges={['top']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={{ padding: spacing.lg, gap: spacing.xl, paddingBottom: TAB_BAR_SPACE + spacing.lg }}
          keyboardShouldPersistTaps="handled">
          <View style={{ gap: spacing.xs }}>
            <Heading>Profile</Heading>
          </View>
          <View style={styles.stats}>
            <Stat value={orders} label={orders === 1 ? 'Order' : 'Orders'} />
            <Stat value={kitchens} label={kitchens === 1 ? 'Kitchen tried' : 'Kitchens tried'} />
            <Stat value={state.favoriteRestaurantIds.length} label="Favorites" />
            <Stat value={reviews} label={reviews === 1 ? 'Review' : 'Reviews'} />
          </View>
          <DietPreferences />
          <AccountSettings />
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <View style={styles.stat} accessible accessibilityLabel={`${value} ${label}`}>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.label} numberOfLines={2}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  stats: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: colors.hairline,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    paddingVertical: spacing.md,
  },
  stat: { flex: 1, alignItems: 'center', gap: 4, paddingHorizontal: 4 },
  value: { fontFamily: fonts.display, fontSize: 24, color: colors.ivory },
  label: {
    fontFamily: fonts.semibold,
    fontSize: 9,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: colors.gold,
    textAlign: 'center',
  },
});
