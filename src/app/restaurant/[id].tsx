import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { formatRating, RestaurantCover } from '@/components/restaurant-card';
import { BackButton, Body, GoldButton, Heading, Screen } from '@/components/ui';
import { confirmAction } from '@/lib/alert';
import { capitalize, formatTime, isOpenAt, WEEKDAYS } from '@/lib/hours';
import { formatCents } from '@/lib/money';
import { computeCartTotals } from '@/lib/pricing';
import { useRestaurant, useStore } from '@/state/store';
import { colors, fonts, radius, spacing } from '@/theme';
import type { MenuItem } from '@/types';

export default function RestaurantDetail() {
  const { id, preview } = useLocalSearchParams<{ id: string; preview?: string }>();
  const restaurant = useRestaurant(id);
  const { state, dispatch } = useStore();
  const insets = useSafeAreaInsets();
  const isPreview = preview === '1';

  if (!restaurant) {
    return (
      <Screen style={{ padding: spacing.lg, gap: spacing.lg }}>
        <BackButton />
        <Body>That kitchen couldn’t be found.</Body>
      </Screen>
    );
  }

  const open = restaurant.acceptingOrders && isOpenAt(restaurant, new Date());
  const canOrder = open && !isPreview && state.user?.role === 'foodie';
  const inThisCart = state.cart.restaurantId === restaurant.id;
  const totals = computeCartTotals(inThisCart ? state.cart : { restaurantId: null, lines: [] }, restaurant.menu);
  const qty = (itemId: string) =>
    inThisCart ? (state.cart.lines.find((l) => l.itemId === itemId)?.quantity ?? 0) : 0;

  const add = (item: MenuItem) => {
    const doAdd = () => dispatch({ type: 'addToCart', restaurantId: restaurant.id, itemId: item.id });
    if (state.cart.restaurantId && !inThisCart && state.cart.lines.length) {
      confirmAction(
        'Start a new cart?',
        'Your cart has food from another kitchen. Orders come from one kitchen at a time.',
        'Start new cart',
        doAdd,
        'Keep cart',
      );
      return;
    }
    doAdd();
  };

  const days = WEEKDAYS.filter((d) => restaurant.workingDays.includes(d))
    .map((d) => capitalize(d).slice(0, 3))
    .join(', ');

  return (
    <View style={{ flex: 1, backgroundColor: colors.white }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 140 }}>
        <View>
          <RestaurantCover restaurant={restaurant} style={styles.hero} iconSize={96} />
          <View style={[styles.heroBar, { top: insets.top + spacing.sm }]}>
            <BackButton tone="dark" />
          </View>
        </View>

        <View style={styles.body}>
          <View style={styles.titleRow}>
            {restaurant.logoUri ? (
              <Image source={{ uri: restaurant.logoUri }} style={styles.logo} />
            ) : null}
            <View style={{ flex: 1 }}>
              <Heading size={26} style={{ color: colors.text }}>
                {restaurant.name}
              </Heading>
              <Text style={styles.cuisine}>{restaurant.cuisine}</Text>
            </View>
          </View>
          <Body muted>by {restaurant.chefName}</Body>
          <View style={styles.metaRow}>
            <MaterialCommunityIcons name="star" size={18} color={colors.gold} />
            <Body>
              {formatRating(restaurant, true)}
            </Body>
          </View>
          <View style={styles.metaRow}>
            <MaterialCommunityIcons name="clock-outline" size={18} color={open ? colors.success : colors.textMuted} />
            <Body style={{ color: open ? colors.success : colors.textMuted }}>
              {open ? 'Open now' : 'Closed'} · {days} · {formatTime(restaurant.openTime)}–
              {formatTime(restaurant.closeTime)}
            </Body>
          </View>
          {isPreview ? (
            <View style={styles.notice}>
              <Body>This is how foodies will see your kitchen.</Body>
            </View>
          ) : !open ? (
            <View style={styles.notice}>
              <Body>This kitchen isn’t taking orders right now. Check back during its hours.</Body>
            </View>
          ) : null}

          <Heading size={22} style={{ marginTop: spacing.md }}>
            Menu
          </Heading>
          {restaurant.menu.length === 0 ? <Body muted>No dishes yet.</Body> : null}
          {restaurant.menu.map((item) => {
            const q = qty(item.id);
            return (
              <View key={item.id} style={[styles.item, !item.available && { opacity: 0.5 }]}>
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={styles.itemName}>{item.name}</Text>
                  {item.description ? <Body muted style={{ fontSize: 14 }}>{item.description}</Body> : null}
                  <Text style={styles.price}>{formatCents(item.priceCents)}</Text>
                  {!item.available ? <Body muted style={{ fontSize: 13 }}>Sold out</Body> : null}
                </View>
                {canOrder && item.available ? (
                  q > 0 ? (
                    <View style={styles.stepper}>
                      <Pressable
                        accessibilityLabel={`Remove one ${item.name}`}
                        onPress={() => dispatch({ type: 'setCartQuantity', itemId: item.id, quantity: q - 1 })}
                        hitSlop={6}>
                        <MaterialCommunityIcons name="minus" size={20} color={colors.text} />
                      </Pressable>
                      <Text style={styles.qty}>{q}</Text>
                      <Pressable accessibilityLabel={`Add one ${item.name}`} onPress={() => add(item)} hitSlop={6}>
                        <MaterialCommunityIcons name="plus" size={20} color={colors.text} />
                      </Pressable>
                    </View>
                  ) : (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Add ${item.name} to cart`}
                      onPress={() => add(item)}
                      style={styles.addButton}>
                      <Text style={styles.addText}>Add</Text>
                    </Pressable>
                  )
                ) : null}
              </View>
            );
          })}
        </View>
      </ScrollView>

      {canOrder && totals.itemCount > 0 ? (
        <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
          <GoldButton
            title={`View cart · ${totals.itemCount} item${totals.itemCount === 1 ? '' : 's'} · ${formatCents(totals.subtotalCents)}`}
            onPress={() => router.navigate('/foodie/cart')}
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { width: '100%', height: 240 },
  heroBar: { position: 'absolute', left: spacing.lg },
  body: { padding: spacing.lg, gap: spacing.sm },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  logo: { width: 56, height: 56, borderRadius: radius.md, borderWidth: 1, borderColor: colors.gold },
  cuisine: { fontFamily: fonts.body, fontSize: 16, color: colors.gold },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  notice: { backgroundColor: colors.goldTint, padding: spacing.md, borderRadius: radius.md, marginTop: spacing.sm },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  itemName: { fontFamily: fonts.headingSemi, fontSize: 17, color: colors.text },
  price: { fontFamily: fonts.bodySemi, fontSize: 15, color: colors.text },
  addButton: {
    borderWidth: 1.5,
    borderColor: colors.gold,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    minHeight: 44,
    justifyContent: 'center',
  },
  addText: { fontFamily: fonts.button, color: colors.text, fontSize: 16 },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1.5,
    borderColor: colors.gold,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    minHeight: 44,
  },
  qty: { fontFamily: fonts.bodySemi, fontSize: 16, color: colors.text, minWidth: 16, textAlign: 'center' },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    backgroundColor: 'rgba(255,255,255,0.96)',
  },
});
