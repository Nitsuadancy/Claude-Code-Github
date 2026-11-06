import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { CartAllergyWarning } from '@/components/diet';
import { Ticket } from '@/components/ticket';
import { isOpenNow } from '@/components/restaurant-card';
import { TAB_BAR_SPACE } from '@/components/tab-bar';
import { OptionSheet } from '@/components/option-sheet';
import {
  Body,
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
import { computeCartTotals, TIP_RATES, tipFor } from '@/lib/pricing';
import { availableSlots, formatSlot } from '@/lib/schedule';
import { newId } from '@/lib/validation';
import { useRestaurant, useStore } from '@/state/store';
import { colors, fonts, radius, spacing } from '@/theme';
import { Icon } from '@/components/icon';

export default function Cart() {
  const { state, dispatch } = useStore();
  const restaurant = useRestaurant(state.cart.restaurantId ?? undefined);
  const [when, setWhen] = useState<'asap' | 'later'>('asap');
  const [slot, setSlot] = useState<string | null>(null);
  const [slotSheet, setSlotSheet] = useState(false);
  const [note, setNote] = useState('');
  const [tipRate, setTipRate] = useState(0);

  if (!restaurant || state.cart.lines.length === 0) {
    return (
      <Screen edges={['top']} style={styles.empty}>
        <View style={styles.emptyIcon}>
          <Icon name="shopping-outline" size={30} color={colors.gold} />
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
  const tip = tipFor(totals.subtotalCents, tipRate);
  const grandTotal = totals.totalCents + tip;
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
  const chefFirst = restaurant.chefName.replace(/\.$/, '');

  const placeOrder = () => {
    const user = state.user;
    if (!user) return;
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
        movementFeeCents: totals.movementFeeCents,
        tipCents: tip,
        totalCents: grandTotal,
        pickupAddress: [restaurant.address, restaurant.city].filter(Boolean).join(', '),
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
          <Heading>Your order</Heading>
          <Pressable
            accessibilityRole="link"
            onPress={() => router.push({ pathname: '/restaurant/[id]', params: { id: restaurant.id } })}>
            <Text style={styles.kitchen}>from {restaurant.name}</Text>
          </Pressable>
        </View>

        <View>
          {totals.lines.map((line, i) => (
            <View key={line.itemId}>
              <View style={[styles.line, i > 0 && styles.lineRule]}>
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
                    <Icon name="minus" size={18} color={colors.gold} />
                  </Pressable>
                  <Text style={styles.qty}>{line.quantity}</Text>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Add one ${line.name}`}
                    hitSlop={8}
                    onPress={() =>
                      dispatch({ type: 'setCartQuantity', itemId: line.itemId, quantity: line.quantity + 1 })
                    }>
                    <Icon name="plus" size={18} color={colors.gold} />
                  </Pressable>
                </View>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.pickup}>
          <Icon name="map-marker-outline" size={20} color={colors.gold} />
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={styles.pickupTitle}>
              Pickup in {restaurant.neighborhood || restaurant.city || 'the neighborhood'}
            </Text>
            <Text style={styles.pickupBody}>
              {chefFirst} shares the exact address once your order is accepted.
            </Text>
          </View>
        </View>

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
          <FieldLabel>Pickup time</FieldLabel>
          <View style={styles.segment}>
            <WhenOption
              icon="lightning-bolt-outline"
              title="When it’s ready"
              detail={open ? `About ${restaurant.prepMinutes} min` : 'Closed right now'}
              selected={mode === 'asap'}
              disabled={!open}
              onPress={() => setWhen('asap')}
            />
            <WhenOption
              icon="calendar-clock"
              title="Pick a time"
              detail={slots.length ? 'Today or tomorrow' : 'No times available'}
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
              label="Pick up at"
            />
          ) : null}
        </View>

        <View style={{ gap: spacing.sm }}>
          <FieldLabel>Tip for {restaurant.chefName}</FieldLabel>
          <View style={styles.tips}>
            {TIP_RATES.map((rate) => {
              const selected = rate === tipRate;
              return (
                <Pressable
                  key={rate}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: selected }}
                  accessibilityLabel={rate ? `${rate * 100}% tip, ${formatCents(tipFor(totals.subtotalCents, rate))}` : 'No tip'}
                  onPress={() => setTipRate(rate)}
                  style={[styles.tip, selected && styles.tipOn]}>
                  <Text style={[styles.tipPct, selected && { color: colors.gold }]}>{rate ? `${rate * 100}%` : 'None'}</Text>
                  {rate ? <Text style={styles.tipAmt}>{formatCents(tipFor(totals.subtotalCents, rate))}</Text> : null}
                </Pressable>
              );
            })}
          </View>
          <Text style={styles.tipNote}>100% of your tip goes to {chefFirst}.</Text>
        </View>

        <Ticket
          charges={[
            { label: 'Subtotal', cents: totals.subtotalCents },
            { label: 'Movement fee (5%)', cents: totals.movementFeeCents },
            ...(tip ? [{ label: `Tip for ${chefFirst}`, cents: tip }] : []),
          ]}
          totalCents={grandTotal}
          footer={
            <Text style={styles.movement}>
              Manna’s only fee is this 5%. {chefFirst} keeps every dollar of the menu price.
            </Text>
          }
        />

        <GoldButton
          title={mode === 'later' ? `Schedule pickup · ${formatCents(grandTotal)}` : `Place order · ${formatCents(grandTotal)}`}
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
        title="Pick up at"
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
      <Icon name={icon} size={20} color={selected ? colors.gold : colors.textMuted} />
      <Text style={[styles.whenTitle, selected && { color: colors.ivory }]}>{title}</Text>
      <Text style={styles.whenDetail}>{detail}</Text>
    </Pressable>
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
  kitchen: { fontFamily: fonts.displayItalic, fontSize: 18, color: colors.gold },
  lineRule: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border, paddingTop: spacing.md, marginTop: spacing.sm },
  itemName: { fontFamily: fonts.display, fontSize: 19, color: colors.ivory },
  each: { fontFamily: fonts.body, fontSize: 12, color: colors.textMuted },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.hairline,
    borderRadius: radius.sm,
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
  tips: { flexDirection: 'row', gap: spacing.sm },
  tip: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    minHeight: 54,
    justifyContent: 'center',
  },
  tipOn: { borderColor: colors.gold, backgroundColor: colors.goldTint },
  tipPct: { fontFamily: fonts.semibold, fontSize: 14, color: colors.text },
  tipAmt: { fontFamily: fonts.body, fontSize: 11, color: colors.textMuted },
  tipNote: { fontFamily: fonts.displayItalic, fontSize: 14, color: colors.textMuted },
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
  pickup: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'flex-start',
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  pickupTitle: { fontFamily: fonts.semibold, fontSize: 14, color: colors.ivory },
  pickupBody: { fontFamily: fonts.body, fontSize: 13, lineHeight: 19, color: colors.textMuted },
  movement: { fontFamily: fonts.displayItalic, fontSize: 14, lineHeight: 18, color: colors.textMuted, marginTop: spacing.xs },
  clear: { fontFamily: fonts.medium, color: colors.textMuted, fontSize: 14 },
});
