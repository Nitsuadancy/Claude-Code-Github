import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { formatRating, isOpenNow, RestaurantCover } from '@/components/restaurant-card';
import {
  BackButton,
  Badge,
  Body,
  Eyebrow,
  GoldButton,
  GoldRule,
  Heading,
  Screen,
} from '@/components/ui';
import { confirmAction } from '@/lib/alert';
import { capitalize, formatTime, WEEKDAYS } from '@/lib/hours';
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

  const open = isOpenNow(restaurant, new Date());
  const canOrder = open && !isPreview && state.user?.role === 'foodie';
  const inThisCart = state.cart.restaurantId === restaurant.id;
  const totals = computeCartTotals(inThisCart ? state.cart : { restaurantId: null, lines: [] }, restaurant.menu);
  const qty = (itemId: string) =>
    inThisCart ? (state.cart.lines.find((l) => l.itemId === itemId)?.quantity ?? 0) : 0;
  const favorite = state.favoriteRestaurantIds.includes(restaurant.id);

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
    .join(' · ');

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 140 }}>
        <View>
          <RestaurantCover restaurant={restaurant} style={styles.hero} monogramSize={120} />
          <LinearGradient colors={['rgba(10,9,7,0.5)', 'transparent', colors.bg]} locations={[0, 0.4, 1]} style={StyleSheet.absoluteFill} />
          <View style={[styles.heroBar, { top: insets.top + spacing.sm }]}>
            <BackButton />
            {!isPreview ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={favorite ? 'Remove from favorites' : 'Add to favorites'}
                onPress={() => dispatch({ type: 'toggleFavorite', restaurantId: restaurant.id })}
                style={styles.heroIcon}>
                <MaterialCommunityIcons
                  name={favorite ? 'heart' : 'heart-outline'}
                  size={21}
                  color={favorite ? colors.gold : colors.ivory}
                />
              </Pressable>
            ) : null}
          </View>
        </View>

        <View style={styles.body}>
          <View style={styles.titleRow}>
            {restaurant.logoUri ? <Image source={{ uri: restaurant.logoUri }} style={styles.logo} /> : null}
            <View style={{ flex: 1, gap: 4 }}>
              <Eyebrow>{restaurant.cuisine}</Eyebrow>
              <Heading size={32}>{restaurant.name}</Heading>
              <Text style={styles.chef}>by {restaurant.chefName}</Text>
            </View>
          </View>

          <View style={styles.facts}>
            <Fact icon="star" label={formatRating(restaurant)} />
            <View style={styles.factDivider} />
            <Fact
              icon="clock-outline"
              label={`${formatTime(restaurant.openTime)} – ${formatTime(restaurant.closeTime)}`}
            />
            <View style={styles.factDivider} />
            <Badge label={open ? 'Open now' : 'Closed'} tone={open ? 'success' : 'muted'} />
          </View>
          <Text style={styles.days}>{days}</Text>

          {isPreview ? (
            <View style={styles.notice}>
              <MaterialCommunityIcons name="eye-outline" size={18} color={colors.gold} />
              <Body style={{ flex: 1, fontSize: 14 }}>This is how foodies will see your kitchen.</Body>
            </View>
          ) : !open ? (
            <View style={styles.notice}>
              <MaterialCommunityIcons name="moon-waning-crescent" size={18} color={colors.gold} />
              <Body style={{ flex: 1, fontSize: 14 }}>
                This kitchen isn’t taking orders right now. Come back during its hours.
              </Body>
            </View>
          ) : null}

          <View style={styles.menuHeader}>
            <Eyebrow>The menu</Eyebrow>
            <GoldRule width={28} />
          </View>
          {restaurant.menu.length === 0 ? <Body muted>No dishes yet.</Body> : null}
          {restaurant.menu.map((item) => {
            const q = qty(item.id);
            return (
              <View key={item.id} style={[styles.item, !item.available && { opacity: 0.45 }]}>
                <View style={{ flex: 1, gap: 6 }}>
                  <Text style={styles.itemName}>{item.name}</Text>
                  {item.description ? (
                    <Body muted style={{ fontSize: 13, lineHeight: 19 }}>
                      {item.description}
                    </Body>
                  ) : null}
                  <Text style={styles.price}>{item.available ? formatCents(item.priceCents) : 'Sold out'}</Text>
                </View>
                {canOrder && item.available ? (
                  q > 0 ? (
                    <View style={styles.stepper}>
                      <Pressable
                        accessibilityLabel={`Remove one ${item.name}`}
                        onPress={() => dispatch({ type: 'setCartQuantity', itemId: item.id, quantity: q - 1 })}
                        hitSlop={8}>
                        <MaterialCommunityIcons name="minus" size={18} color={colors.gold} />
                      </Pressable>
                      <Text style={styles.qty}>{q}</Text>
                      <Pressable accessibilityLabel={`Add one ${item.name}`} onPress={() => add(item)} hitSlop={8}>
                        <MaterialCommunityIcons name="plus" size={18} color={colors.gold} />
                      </Pressable>
                    </View>
                  ) : (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Add ${item.name} to cart`}
                      onPress={() => add(item)}
                      style={({ pressed }) => [styles.addButton, pressed && { backgroundColor: colors.goldTint }]}>
                      <MaterialCommunityIcons name="plus" size={20} color={colors.gold} />
                    </Pressable>
                  )
                ) : null}
              </View>
            );
          })}
        </View>
      </ScrollView>

      {canOrder && totals.itemCount > 0 ? (
        <LinearGradient
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

function Fact({ icon, label }: { icon: 'star' | 'clock-outline'; label: string }) {
  return (
    <View style={styles.fact}>
      <MaterialCommunityIcons name={icon} size={15} color={colors.gold} />
      <Text style={styles.factText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { width: '100%', height: 320 },
  heroBar: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  heroIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: 'rgba(20, 18, 14, 0.85)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { paddingHorizontal: spacing.lg, gap: spacing.md, marginTop: -spacing.xl },
  titleRow: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.md },
  logo: { width: 64, height: 64, borderRadius: radius.md, borderWidth: 1, borderColor: colors.hairline },
  chef: { fontFamily: fonts.displayItalic, fontSize: 16, color: colors.textMuted },
  facts: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    flexWrap: 'wrap',
  },
  fact: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  factText: { fontFamily: fonts.medium, fontSize: 13, color: colors.text },
  factDivider: { width: 1, height: 14, backgroundColor: colors.border },
  days: { fontFamily: fonts.body, fontSize: 12, color: colors.textMuted, letterSpacing: 0.5, marginTop: -spacing.sm },
  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.goldTint,
    borderWidth: 1,
    borderColor: colors.hairline,
    padding: spacing.md,
    borderRadius: radius.md,
  },
  menuHeader: { gap: spacing.sm, marginTop: spacing.md },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md + 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  itemName: { fontFamily: fonts.display, fontSize: 19, color: colors.ivory },
  price: { fontFamily: fonts.semibold, fontSize: 14, color: colors.gold, letterSpacing: 0.4 },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.gold,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    minHeight: 44,
  },
  qty: { fontFamily: fonts.semibold, fontSize: 15, color: colors.ivory, minWidth: 14, textAlign: 'center' },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
  },
});
