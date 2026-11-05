import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { TAB_BAR_SPACE } from '@/components/tab-bar';
import { Body, Divider, GoldButton, Heading, Screen, TextField } from '@/components/ui';
import { notify } from '@/lib/alert';
import { isOpenAt } from '@/lib/hours';
import { formatCents } from '@/lib/money';
import { computeCartTotals } from '@/lib/pricing';
import { newId } from '@/lib/validation';
import { useRestaurant, useStore } from '@/state/store';
import { colors, fonts, radius, spacing } from '@/theme';

export default function Cart() {
  const { state, dispatch } = useStore();
  const restaurant = useRestaurant(state.cart.restaurantId ?? undefined);
  const [address, setAddress] = useState(state.user?.deliveryAddress ?? '');
  const [placing, setPlacing] = useState(false);

  if (!restaurant || state.cart.lines.length === 0) {
    return (
      <Screen edges={['top']} style={styles.empty}>
        <MaterialCommunityIcons name="cart-outline" size={64} color={colors.border} />
        <Heading size={24}>Your cart is empty</Heading>
        <Body muted style={{ textAlign: 'center' }}>
          Find a kitchen you love and add a few dishes.
        </Body>
        <GoldButton title="Browse kitchens" fullWidth={false} onPress={() => router.navigate('/foodie')} />
      </Screen>
    );
  }

  const totals = computeCartTotals(state.cart, restaurant.menu);
  const open = restaurant.acceptingOrders && isOpenAt(restaurant, new Date());

  const placeOrder = () => {
    const user = state.user;
    if (!user) return;
    if (!address.trim()) {
      notify('Delivery address', 'Add where we should bring your food.');
      return;
    }
    if (!open) {
      notify('Kitchen closed', `${restaurant.name} isn’t taking orders right now.`);
      return;
    }
    setPlacing(true);
    // Payments aren't connected yet: orders are recorded as placed without charging a card.
    dispatch({ type: 'updateProfile', changes: { deliveryAddress: address.trim() } });
    dispatch({
      type: 'placeOrder',
      order: {
        id: newId('order'),
        customerId: user.id,
        customerName: user.name,
        restaurantId: restaurant.id,
        restaurantName: restaurant.name,
        lines: totals.lines,
        subtotalCents: totals.subtotalCents,
        serviceFeeCents: totals.serviceFeeCents,
        deliveryFeeCents: totals.deliveryFeeCents,
        totalCents: totals.totalCents,
        deliveryAddress: address.trim(),
        status: 'placed',
        createdAt: new Date().toISOString(),
      },
    });
    setPlacing(false);
    router.navigate('/foodie/orders');
  };

  return (
    <Screen edges={['top']}>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: TAB_BAR_SPACE + spacing.lg }]}>
        <Heading>Your Cart</Heading>
        <Pressable
          onPress={() => router.push({ pathname: '/restaurant/[id]', params: { id: restaurant.id } })}>
          <Text style={styles.kitchen}>{restaurant.name} ›</Text>
        </Pressable>

        <View style={styles.card}>
          {totals.lines.map((line) => (
            <View key={line.itemId} style={styles.line}>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemName}>{line.name}</Text>
                <Body muted style={{ fontSize: 14 }}>
                  {formatCents(line.priceCents)} each
                </Body>
              </View>
              <View style={styles.stepper}>
                <Pressable
                  accessibilityLabel={`Remove one ${line.name}`}
                  hitSlop={6}
                  onPress={() =>
                    dispatch({ type: 'setCartQuantity', itemId: line.itemId, quantity: line.quantity - 1 })
                  }>
                  <MaterialCommunityIcons name="minus" size={20} color={colors.text} />
                </Pressable>
                <Text style={styles.qty}>{line.quantity}</Text>
                <Pressable
                  accessibilityLabel={`Add one ${line.name}`}
                  hitSlop={6}
                  onPress={() =>
                    dispatch({ type: 'setCartQuantity', itemId: line.itemId, quantity: line.quantity + 1 })
                  }>
                  <MaterialCommunityIcons name="plus" size={20} color={colors.text} />
                </Pressable>
              </View>
            </View>
          ))}
        </View>

        <TextField
          label="Deliver to"
          placeholder="Street address, apt, city"
          icon="map-marker"
          value={address}
          onChangeText={setAddress}
          textContentType="fullStreetAddress"
        />

        <View style={styles.card}>
          <Row label="Subtotal" value={formatCents(totals.subtotalCents)} />
          <Row label="Service fee" value={formatCents(totals.serviceFeeCents)} />
          <Row label="Delivery" value={formatCents(totals.deliveryFeeCents)} />
          <Divider style={{ marginVertical: spacing.sm }} />
          <Row label="Total" value={formatCents(totals.totalCents)} bold />
        </View>

        <Body muted style={{ fontSize: 13 }}>
          Payments aren’t connected yet. Placing an order sends it to the kitchen without charging a card.
        </Body>
        <GoldButton title={`Place order · ${formatCents(totals.totalCents)}`} loading={placing} onPress={placeOrder} />
        <Pressable onPress={() => dispatch({ type: 'clearCart' })} style={{ alignSelf: 'center' }}>
          <Text style={styles.clear}>Clear cart</Text>
        </Pressable>
      </ScrollView>
    </Screen>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <View style={styles.row}>
      <Text style={[styles.rowText, bold && styles.bold]}>{label}</Text>
      <Text style={[styles.rowText, bold && styles.bold]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  empty: { alignItems: 'center', justifyContent: 'center', gap: spacing.md, padding: spacing.lg },
  content: { padding: spacing.lg, gap: spacing.lg },
  kitchen: { fontFamily: fonts.headingSemi, fontSize: 18, color: colors.text, marginTop: -spacing.sm },
  card: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  line: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xs },
  itemName: { fontFamily: fonts.headingSemi, fontSize: 16, color: colors.text },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1.5,
    borderColor: colors.gold,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    minHeight: 40,
  },
  qty: { fontFamily: fonts.bodySemi, fontSize: 16, color: colors.text, minWidth: 16, textAlign: 'center' },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  rowText: { fontFamily: fonts.body, fontSize: 16, color: colors.text },
  bold: { fontFamily: fonts.headingSemi, fontSize: 18 },
  clear: { fontFamily: fonts.bodySemi, color: colors.textMuted, fontSize: 15 },
});
