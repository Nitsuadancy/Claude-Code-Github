import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { CartAllergyWarning } from '@/components/diet';
import { isOpenNow } from '@/components/restaurant-card';
import { TAB_BAR_SPACE } from '@/components/tab-bar';
import { OptionSheet } from '@/components/option-sheet';
import {
  Body,
  Card,
  Divider,
  Eyebrow,
  FieldLabel,
  GoldButton,
  Heading,
  type IconName,
  PickerField,
  Screen,
  TextField,
} from '@/components/ui';
import { notify } from '@/lib/alert';
import { allergenConflicts } from '@/lib/diet';
import { remainingToday } from '@/lib/limits';
import { formatCents } from '@/lib/money';
import { estimateReadyAt } from '@/lib/orders';
import { computeCartTotals } from '@/lib/pricing';
import { availableSlots, formatSlot } from '@/lib/schedule';
import { newId } from '@/lib/validation';
import { useRestaurant, useStore } from '@/state/store';
import { colors, fonts, radius, spacing } from '@/theme';

export default function Cart() {
  const { state, dispatch } = useStore();
  const restaurant = useRestaurant(state.cart.restaurantId ?? undefined);
  const [address, setAddress] = useState(state.user?.deliveryAddress ?? '');
  const [when, setWhen] = useState<'asap' | 'later'>('asap');
  const [slot, setSlot] = useState<string | null>(null);
  const [slotSheet, setSlotSheet] = useState(false);
  const [note, setNote] = useState('');

  if (!restaurant || state.cart.lines.length === 0) {
    return (
      <Screen edges={['top']} style={styles.empty}>
        <View style={styles.emptyIcon}>
          <MaterialCommunityIcons name="shopping-outline" size={30} color={colors.gold} />
        </View>
        <Heading size={24} style={{ textAlign: 'center' }}>
          Your cart is empty
        </Heading>
        <Body muted style={{ textAlign: 'center' }}>
          Find a kitchen you love and add a few dishes.
        </Body>
        <GoldButton title="Browse kitchens" fullWidth={false} onPress={() => router.navigate('/foodie')} />
      </Screen>
    );
  }

  const totals = computeCartTotals(state.cart, restaurant.menu);
  const avoid = state.user?.avoidAllergens ?? [];
  const risky = totals.lines
    .filter((line) => {
      const item = restaurant.menu.find((m) => m.id === line.itemId);
      return item ? allergenConflicts(item, avoid).length > 0 : false;
    })
    .map((line) => line.name);
  const now = new Date();
  const open = isOpenNow(restaurant, now);
  const slots = availableSlots(restaurant, now);
  const mode = open ? when : 'later';
  const chosen = slot && slots.includes(slot) ? slot : (slots[0] ?? null);

  const placeOrder = () => {
    const user = state.user;
    if (!user) return;
    if (!address.trim()) {
      notify('Delivery address', 'Add where we should bring your food.');
      return;
    }
    if (mode === 'later' && !chosen) {
      notify('No times available', `${restaurant.name} isn’t taking orders for the next two days.`);
      return;
    }
    const placedAt = new Date();
    const scheduledFor = mode === 'later' ? chosen : null;
    const cookDay = scheduledFor ? new Date(scheduledFor) : placedAt;
    const short = totals.lines.find((line) => {
      const item = restaurant.menu.find((m) => m.id === line.itemId);
      const left = item ? remainingToday(item, state.orders, restaurant.id, cookDay) : null;
      return left !== null && line.quantity > left;
    });
    if (short) {
      notify(
        'Almost gone',
        `${restaurant.name} doesn’t have enough ${short.name} left for that day. Lower the quantity or pick another day.`,
      );
      return;
    }
    const createdAt = placedAt.toISOString();
    const orderId = newId('order');
    // Payments aren't connected yet: orders are recorded as placed without charging a card.
    dispatch({ type: 'updateProfile', changes: { deliveryAddress: address.trim() } });
    dispatch({
      type: 'placeOrder',
      order: {
        id: orderId,
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
        statusHistory: [{ status: 'placed', at: createdAt }],
        chefNote: '',
        customerNote: note.trim().slice(0, 280),
        createdAt,
        estimatedReadyAt: scheduledFor ?? estimateReadyAt(createdAt, restaurant.prepMinutes),
        scheduledFor,
      },
    });
    router.push({ pathname: '/order/[id]', params: { id: orderId, celebrate: '1' } });
  };

  return (
    <Screen edges={['top']}>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: TAB_BAR_SPACE + spacing.lg }]}>
        <View style={{ gap: spacing.xs }}>
          <Eyebrow>Your order from</Eyebrow>
          <Pressable
            accessibilityRole="link"
            onPress={() => router.push({ pathname: '/restaurant/[id]', params: { id: restaurant.id } })}>
            <Heading>{restaurant.name}</Heading>
          </Pressable>
        </View>

        <Card>
          {totals.lines.map((line, i) => (
            <View key={line.itemId}>
              {i > 0 ? <Divider style={{ marginBottom: spacing.sm }} /> : null}
              <View style={styles.line}>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={styles.itemName}>{line.name}</Text>
                  <Text style={styles.each}>{formatCents(line.priceCents)} each</Text>
                </View>
                <View style={styles.stepper}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Remove one ${line.name}`}
                    hitSlop={8}
                    onPress={() =>
                      dispatch({ type: 'setCartQuantity', itemId: line.itemId, quantity: line.quantity - 1 })
                    }>
                    <MaterialCommunityIcons name="minus" size={18} color={colors.gold} />
                  </Pressable>
                  <Text style={styles.qty}>{line.quantity}</Text>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Add one ${line.name}`}
                    hitSlop={8}
                    onPress={() =>
                      dispatch({ type: 'setCartQuantity', itemId: line.itemId, quantity: line.quantity + 1 })
                    }>
                    <MaterialCommunityIcons name="plus" size={18} color={colors.gold} />
                  </Pressable>
                </View>
              </View>
            </View>
          ))}
        </Card>

        <TextField
          label="Deliver to"
          placeholder="Street address, apt, city"
          icon="map-marker-outline"
          value={address}
          onChangeText={setAddress}
          textContentType="fullStreetAddress"
        />

        <CartAllergyWarning names={risky} />

        <TextField
          label="Note for the chef (optional)"
          placeholder="Allergies, spice level, no onions…"
          icon="message-text-outline"
          value={note}
          onChangeText={setNote}
          maxLength={280}
        />

        <View style={{ gap: spacing.sm }}>
          <FieldLabel>When</FieldLabel>
          <View style={styles.segment}>
            <WhenOption
              icon="lightning-bolt-outline"
              title="As soon as possible"
              detail={open ? `About ${restaurant.prepMinutes} min` : 'Closed right now'}
              selected={mode === 'asap'}
              disabled={!open}
              onPress={() => setWhen('asap')}
            />
            <WhenOption
              icon="calendar-clock"
              title="Schedule"
              detail={slots.length ? 'Pick a time' : 'No times available'}
              selected={mode === 'later'}
              disabled={!slots.length}
              onPress={() => setWhen('later')}
            />
          </View>
          {mode === 'later' && chosen ? (
            <PickerField
              placeholder="Choose a time"
              icon="clock-outline"
              value={formatSlot(chosen, now)}
              onPress={() => setSlotSheet(true)}
              label="Ready at"
            />
          ) : null}
        </View>

        <Card>
          <Row label="Subtotal" value={formatCents(totals.subtotalCents)} />
          <Row label="Service fee" value={formatCents(totals.serviceFeeCents)} />
          <Row label="Delivery" value={formatCents(totals.deliveryFeeCents)} />
          <Divider style={{ marginVertical: spacing.xs }} />
          <View style={styles.row}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>{formatCents(totals.totalCents)}</Text>
          </View>
        </Card>

        <GoldButton
          title={mode === 'later' ? `Schedule order · ${formatCents(totals.totalCents)}` : `Place order · ${formatCents(totals.totalCents)}`}
          onPress={placeOrder}
        />
        <Body muted style={styles.note}>
          Payments aren’t connected yet. Placing an order sends it to the kitchen without charging a card.
        </Body>
        <Pressable onPress={() => dispatch({ type: 'clearCart' })} style={{ alignSelf: 'center' }} hitSlop={8}>
          <Text style={styles.clear}>Clear cart</Text>
        </Pressable>
      </ScrollView>
      <OptionSheet
        visible={slotSheet}
        title="Ready at"
        options={slots.map((value) => ({ value, label: formatSlot(value, now) }))}
        selected={chosen ? [chosen] : []}
        onSelect={([value]) => {
          setSlot(value ?? null);
          setWhen('later');
        }}
        onClose={() => setSlotSheet(false)}
      />
    </Screen>
  );
}

function WhenOption({
  icon,
  title,
  detail,
  selected,
  disabled,
  onPress,
}: {
  icon: IconName;
  title: string;
  detail: string;
  selected: boolean;
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[styles.when, selected && styles.whenOn, disabled && { opacity: 0.45 }]}>
      <MaterialCommunityIcons name={icon} size={20} color={selected ? colors.gold : colors.textMuted} />
      <Text style={[styles.whenTitle, selected && { color: colors.ivory }]}>{title}</Text>
      <Text style={styles.whenDetail}>{detail}</Text>
    </Pressable>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowText}>{label}</Text>
      <Text style={styles.rowText}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  empty: { alignItems: 'center', justifyContent: 'center', gap: spacing.md, padding: spacing.lg },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 1,
    borderColor: colors.hairline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: { padding: spacing.lg, gap: spacing.lg },
  line: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xs },
  itemName: { fontFamily: fonts.display, fontSize: 17, color: colors.ivory },
  each: { fontFamily: fonts.body, fontSize: 12, color: colors.textMuted },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.hairline,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    minHeight: 40,
  },
  qty: { fontFamily: fonts.semibold, fontSize: 15, color: colors.ivory, minWidth: 14, textAlign: 'center' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  rowText: { fontFamily: fonts.body, fontSize: 14, color: colors.textMuted },
  totalLabel: { fontFamily: fonts.display, fontSize: 20, color: colors.ivory },
  totalValue: { fontFamily: fonts.semibold, fontSize: 18, color: colors.gold },
  note: { fontSize: 12, textAlign: 'center', lineHeight: 18 },
  segment: { flexDirection: 'row', gap: spacing.sm },
  when: {
    flex: 1,
    gap: 4,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  whenOn: { borderColor: colors.gold, backgroundColor: colors.goldTint },
  whenTitle: { fontFamily: fonts.semibold, fontSize: 13, color: colors.text },
  whenDetail: { fontFamily: fonts.body, fontSize: 12, color: colors.textMuted },
  clear: { fontFamily: fonts.medium, color: colors.textMuted, fontSize: 14 },
});
