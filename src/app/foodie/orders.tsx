import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { FlatList, StyleSheet, View } from 'react-native';

import { OrderCard } from '@/components/order-card';
import { TAB_BAR_SPACE } from '@/components/tab-bar';
import { Body, GoldButton, Heading, Screen } from '@/components/ui';
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
        ListHeaderComponent={<Heading style={{ marginBottom: spacing.sm }}>Your Orders</Heading>}
        ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
        renderItem={({ item }) => <OrderCard order={item} title={item.restaurantName} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <MaterialCommunityIcons name="receipt-text-outline" size={64} color={colors.border} />
            <Body muted style={{ textAlign: 'center' }}>
              No orders yet. When you place one, you can follow it here.
            </Body>
            <GoldButton title="Find something to eat" fullWidth={false} onPress={() => router.navigate('/foodie')} />
          </View>
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg },
  empty: { alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xxl },
});
