import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { FlatList, StyleSheet, View } from 'react-native';

import { OrderCard } from '@/components/order-card';
import { TAB_BAR_SPACE } from '@/components/tab-bar';
import { Body, Eyebrow, GoldButton, Heading, Screen } from '@/components/ui';
import { useStore } from '@/state/store';
import { colors, spacing } from '@/theme';

export default function Orders() {
  const { state } = useStore();
  const orders = state.orders.filter((o) => o.customerId === state.user?.id);

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
        renderItem={({ item }) => <OrderCard order={item} title={item.restaurantName} />}
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
