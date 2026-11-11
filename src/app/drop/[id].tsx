import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Countdown } from '@/components/countdown';
import { DietaryIcons, StockNote } from '@/components/dish';
import { Icon } from '@/components/icon';
import { Pop, SpringIn } from '@/components/motion';
import { Photo } from '@/components/photo';
import { BackButton, Body, GoldButton, Screen } from '@/components/ui';
import { accentColor } from '@/data/accents';
import { dropItems, findDrop, formatDropDeadline, formatDropPickup } from '@/lib/drops';
import * as haptics from '@/lib/haptics';
import { formatCents } from '@/lib/money';
import { computeCartTotals } from '@/lib/pricing';
import { useRestaurant, useStore } from '@/state/store';
import { useAddToCart } from '@/state/use-add-to-cart';
import { colors, fonts, radius, spacing } from '@/theme';

/** A kitchen's drop: its own little menu, pickup window and deadline. */
export default function DropScreen() {
  const { id, kitchen } = useLocalSearchParams<{ id: string; kitchen: string }>();
  const restaurant = useRestaurant(kitchen);
  const { state, dispatch } = useStore();
  const cart = useAddToCart();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const drop = findDrop(restaurant, id);

  if (!restaurant || !drop) {
    return (
      <Screen style={{ padding: spacing.lg, gap: spacing.lg }}>
        <BackButton />
        <Body>That drop couldn’t be found.</Body>
      </Screen>
    );
  }

  const now = new Date();
  const open = new Date(drop.closesAt) > now && restaurant.acceptingOrders;
  const canOrder = open && state.user?.role === 'foodie';
  const items = dropItems(restaurant.menu, drop);
  const accent = accentColor(restaurant.accent);
  const inThisCart = state.cart.restaurantId === restaurant.id && state.cart.dropId === drop.id;
  const totals = computeCartTotals(inThisCart ? state.cart : { restaurantId: null, lines: [] }, restaurant.menu);
  const hero = items.find((m) => m.photoUri)?.photoUri ?? restaurant.coverUris[0];

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 140 }}>
        <View style={{ width, height: Math.round(width * 0.8) }}>
          {hero ? <Photo uri={hero} size="full" style={StyleSheet.absoluteFill} priority="high" /> : null}
          <LinearGradient colors={['transparent', colors.bg]} locations={[0.45, 1]} style={StyleSheet.absoluteFill} />
        </View>

        <View style={styles.body}>
          <Pressable
            accessibilityRole="link"
            onPress={() => router.push({ pathname: '/restaurant/[id]', params: { id: restaurant.id } })}>
            <Text style={[styles.eyebrow, { color: accent }]}>Drop · {restaurant.name}</Text>
          </Pressable>
          <Text style={styles.title}>{drop.title}</Text>
          {drop.note ? <Text style={styles.note}>{drop.note}</Text> : null}

          <View style={[styles.when, { borderColor: accent }]}>
            <View style={styles.whenRow}>
              <Icon name="calendar-clock" size={16} color={accent} />
              <Text style={styles.whenText}>{formatDropPickup(drop, now)}</Text>
            </View>
            <View style={styles.whenRow}>
              <Icon name="timer-sand" size={16} color={accent} />
              {open ? (
                <Text style={styles.whenText}>
                  {formatDropDeadline(drop, now)} · <Countdown to={drop.closesAt} prefix="closes in " />
                </Text>
              ) : (
                <Text style={[styles.whenText, { color: colors.textMuted }]}>Orders for this drop have closed.</Text>
              )}
            </View>
          </View>

          {items.map((item) => {
            const q = inThisCart ? (state.cart.lines.find((l) => l.itemId === item.id)?.quantity ?? 0) : 0;
            const left = cart.remaining(restaurant, item, now, drop);
            const soldOut = !item.available || left === 0;
            const atLimit = left !== null && q >= left;
            return (
              <View key={item.id} style={[styles.item, soldOut && { opacity: 0.5 }]}>
                {item.photoUri ? <Photo uri={item.photoUri} size="thumb" style={styles.thumb} /> : null}
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={styles.itemName}>{item.name}</Text>
                  {item.description ? (
                    <Text style={styles.description} numberOfLines={3}>
                      {item.description}
                    </Text>
                  ) : null}
                  <View style={styles.itemFoot}>
                    <Text style={styles.price}>{item.available ? formatCents(item.priceCents) : 'Unavailable'}</Text>
                    <DietaryIcons tags={item.dietary} />
                  </View>
                  <StockNote remaining={item.available ? left : null} />
                </View>
                {canOrder && !soldOut ? (
                  q > 0 ? (
                    <SpringIn style={styles.stepper}>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`Remove one ${item.name}`}
                        onPress={() => {
                          haptics.tap();
                          dispatch({ type: 'setCartQuantity', itemId: item.id, quantity: q - 1 });
                        }}
                        hitSlop={10}>
                        <Icon name="minus" size={15} color={colors.bg} />
                      </Pressable>
                      <Pop trigger={q} to={1.3}>
                        <Text style={styles.qty}>{q}</Text>
                      </Pop>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`Add one ${item.name}`}
                        disabled={atLimit}
                        onPress={() => cart.add(restaurant, item, now, drop)}
                        hitSlop={10}>
                        <Icon name="plus" size={15} color={atLimit ? colors.textMuted : colors.bg} />
                      </Pressable>
                    </SpringIn>
                  ) : (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Add ${item.name} to cart`}
                      onPress={() => cart.add(restaurant, item, now, drop)}
                      hitSlop={8}
                      style={({ pressed }) => [styles.addButton, pressed && { opacity: 0.7 }]}>
                      <Icon name="plus" size={18} color={colors.bg} />
                    </Pressable>
                  )
                ) : null}
              </View>
            );
          })}
          <Text style={styles.fine}>
            Drop orders are made fresh for this pickup window. {restaurant.chefName} shares the pickup address once your
            order is accepted.
          </Text>
        </View>
      </ScrollView>

      <View style={[styles.heroBar, { top: insets.top + spacing.sm }]} pointerEvents="box-none">
        <BackButton />
      </View>

      {canOrder && totals.itemCount > 0 ? (
        <LinearGradient
          pointerEvents="box-none"
          colors={['transparent', colors.bg]}
          locations={[0, 0.35]}
          style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
          <GoldButton
            title={`View cart · ${totals.itemCount} · ${formatCents(totals.subtotalCents)}`}
            icon="shopping-outline"
            onPress={() => router.navigate('/foodie/cart')}
          />
        </LinearGradient>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: spacing.lg, gap: spacing.md, marginTop: -spacing.xl },
  eyebrow: { fontFamily: fonts.semibold, fontSize: 13, letterSpacing: 0.4, textTransform: 'uppercase' },
  title: { fontFamily: fonts.display, fontSize: 34, lineHeight: 38, color: colors.ivory, letterSpacing: -0.6 },
  note: { fontFamily: fonts.body, fontSize: 16, lineHeight: 23, color: colors.text },
  when: { borderLeftWidth: 2, paddingLeft: spacing.md, gap: 6, marginVertical: spacing.xs },
  whenRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  whenText: { flex: 1, fontFamily: fonts.medium, fontSize: 14, color: colors.ivory },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  thumb: { width: 76, height: 76, borderRadius: radius.md },
  itemName: { fontFamily: fonts.semibold, fontSize: 17, color: colors.ivory },
  description: { fontFamily: fonts.body, fontSize: 14, lineHeight: 20, color: colors.textMuted },
  itemFoot: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  price: { fontFamily: fonts.medium, fontSize: 15, color: colors.ivory, fontVariant: ['tabular-nums'] },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.ivory,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.ivory,
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    height: 36,
  },
  qty: { fontFamily: fonts.semibold, fontSize: 15, color: colors.bg, minWidth: 14, textAlign: 'center' },
  fine: { fontFamily: fonts.body, fontSize: 12, lineHeight: 18, color: colors.textFaint, marginTop: spacing.md },
  heroBar: { position: 'absolute', left: spacing.lg, right: spacing.lg, flexDirection: 'row' },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: spacing.lg, paddingTop: spacing.xl },
});
