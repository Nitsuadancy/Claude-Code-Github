import { router, useScrollToTop } from 'expo-router';
import { useRef } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { EmptyState } from '@/components/empty-state';
import { OrderCard } from '@/components/order-card';
import { usePullToRefresh } from '@/components/pull-to-refresh';
import { Stars } from '@/components/reviews';
import { TAB_BAR_SPACE } from '@/components/tab-bar';
import { Heading, Screen } from '@/components/ui';
import { useStore } from '@/state/store';
import { colors, fonts, spacing } from '@/theme';
import type { Order } from '@/types';

export default function Orders() {
  const { state } = useStore();
  const list = useRef<FlatList<Order>>(null);
  useScrollToTop(list);
  const refreshControl = usePullToRefresh();
  const orders = state.orders.filter((o) => o.customerId === state.user?.id);
  const reviewed = new Set(state.reviews.map((r) => r.orderId));

  return (
    <Screen edges={['top']}>
      <FlatList
        ref={list}
        refreshControl={refreshControl}
        data={orders}
        keyExtractor={(o) => o.id}
        contentContainerStyle={[styles.content, { paddingBottom: TAB_BAR_SPACE + spacing.lg }]}
        ListHeaderComponent={
          <View style={styles.header}>
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
          <EmptyState
            art="ticket"
            title="No orders yet"
            body="When you place an order, you can follow it here from the oven to pickup."
            action={{ title: 'Find something delicious', onPress: () => router.navigate('/foodie') }}
          />
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
});
