import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { OrderCard } from '@/components/order-card';
import { Stars } from '@/components/reviews';
import { TAB_BAR_SPACE } from '@/components/tab-bar';
import { Body, Eyebrow, GoldButton, Heading, Screen } from '@/components/ui';
import { useStore } from '@/state/store';
import { colors, fonts, spacing } from '@/theme';

export default function Orders() {
  const { state } = useStore();
  const orders = state.orders.filter((o) => o.customerId === state.user?.id);
  const reviewed = new Set(state.reviews.map((r) => r.orderId));

  return (
    <Screen edges={['top']}>
      <FlatList
        data={orders}
        keyExtractor={(o) => o.id}
        contentContainerStyle={[styles.content, { paddingBottom: TAB_BAR_SPACE + spacing.lg }]}
        ListHeaderComponent={
          <View style={styles.header}>
            <Eyebrow>Your table</Eyebrow>
            <Heading>Orders</Heading>
          </View>
        }
        ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
        renderItem={({ item }) => (
          <Pressable
            accessibilityRole="button"
            accessibilityHint="Opens live tracking"
            onPress={() => router.push({ pathname: '/order/[id]', params: { id: item.id } })}
            style={({ pressed }) => pressed && { opacity: 0.85 }}>
            <OrderCard order={item} title={item.restaurantName}>
              {item.status === 'completed' && !reviewed.has(item.id) ? (
                <View style={styles.rate}>
                  <Stars value={0} size={16} />
                  <Text style={styles.rateText}>Rate your meal</Text>
                </View>
              ) : null}
            </OrderCard>
          </Pressable>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <View style={styles.emptyIcon}>
              <MaterialCommunityIcons name="receipt-text-outline" size={30} color={colors.gold} />
            </View>
            <Heading size={22} style={{ textAlign: 'center' }}>
              No orders yet
            </Heading>
            <Body muted style={{ textAlign: 'center' }}>
              When you place an order, you can follow it here from kitchen to doorstep.
            </Body>
            <GoldButton title="Find something delicious" fullWidth={false} onPress={() => router.navigate('/foodie')} />
          </View>
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg },
  header: { gap: spacing.xs, marginBottom: spacing.lg },
  rate: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  rateText: { fontFamily: fonts.semibold, fontSize: 13, color: colors.gold },
  empty: { alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xxl },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 1,
    borderColor: colors.hairline,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
