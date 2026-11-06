import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ChefCard, VerifiedSeal } from '@/components/chef';
import { DietNote } from '@/components/diet';
import { DietaryIcons, DishSheet, StockNote } from '@/components/dish';
import { NATIVE_DRIVER } from '@/components/motion';
import { RatingSummary, ReviewCard } from '@/components/reviews';
import { CoverGallery, formatRating, isOpenNow } from '@/components/restaurant-card';
import {
  BackButton,
  Body,
  GoldButton,
  Heading,
  type IconName,
  Screen,
} from '@/components/ui';
import { confirmAction } from '@/lib/alert';
import * as haptics from '@/lib/haptics';
import { formatDays, formatTime } from '@/lib/hours';
import { remainingToday } from '@/lib/limits';
import { formatCents } from '@/lib/money';
import { computeCartTotals } from '@/lib/pricing';
import { groupMenu } from '@/lib/menu';
import { availableSlots, formatSlot } from '@/lib/schedule';
import { shareKitchen } from '@/lib/share';
import { useDietProfile, useRestaurant, useReviews, useStore } from '@/state/store';
import { colors, fonts, radius, spacing } from '@/theme';
import type { MenuItem } from '@/types';
import { Icon } from '@/components/icon';
import { photoSource } from '@/lib/photo';

const HERO_HEIGHT = 320;

export default function RestaurantDetail() {
  const { id, preview } = useLocalSearchParams<{ id: string; preview?: string }>();
  const restaurant = useRestaurant(id);
  const { state, dispatch } = useStore();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [openItemId, setOpenItemId] = useState<string | null>(null);
  const [scrollY] = useState(() => new Animated.Value(0));
  const reviews = useReviews(id);
  const diet = useDietProfile();
  const isPreview = preview === '1';

  if (!restaurant) {
    return (
      <Screen style={{ padding: spacing.lg, gap: spacing.lg }}>
        <BackButton />
        <Body>That kitchen couldn’t be found.</Body>
      </Screen>
    );
  }

  const now = new Date();
  const open = isOpenNow(restaurant, now);
  const slots = open ? [] : availableSlots(restaurant, now);
  // Closed kitchens still take pre-orders for their next opening.
  const canOrder = (open || slots.length > 0) && !isPreview && state.user?.role === 'foodie';
  const inThisCart = state.cart.restaurantId === restaurant.id;
  const totals = computeCartTotals(inThisCart ? state.cart : { restaurantId: null, lines: [] }, restaurant.menu);
  const qty = (itemId: string) =>
    inThisCart ? (state.cart.lines.find((l) => l.itemId === itemId)?.quantity ?? 0) : 0;
  const remaining = (item: MenuItem) => remainingToday(item, state.orders, restaurant.id, now);
  const favorite = state.favoriteRestaurantIds.includes(restaurant.id);

  const openItem = restaurant.menu.find((m) => m.id === openItemId) ?? null;

  const add = (item: MenuItem) => {
    const left = remaining(item);
    if (left !== null && qty(item.id) >= left) {
      haptics.warning();
      return;
    }
    const doAdd = () => {
      haptics.tap();
      dispatch({ type: 'addToCart', restaurantId: restaurant.id, itemId: item.id, max: left });
    };
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

  const days = formatDays(restaurant.workingDays);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Animated.ScrollView
        contentContainerStyle={{ paddingBottom: 140 }}
        scrollEventThrottle={16}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
          useNativeDriver: NATIVE_DRIVER,
        })}>
        <Animated.View
          style={{
            transform: [
              // Gentle parallax: the photo drifts at half speed, and stretches when pulled down.
              { translateY: scrollY.interpolate({ inputRange: [-200, 0, HERO_HEIGHT], outputRange: [-100, 0, HERO_HEIGHT / 2] }) },
              { scale: scrollY.interpolate({ inputRange: [-200, 0], outputRange: [1.5, 1], extrapolateRight: 'clamp' }) },
            ],
          }}>
          <CoverGallery restaurant={restaurant} width={width} height={HERO_HEIGHT} />
        </Animated.View>

        <View style={styles.body}>
          <View style={styles.titleRow}>
            {restaurant.logoUri ? <Image source={photoSource(restaurant.logoUri)} style={styles.logo} /> : null}
            <View style={{ flex: 1, gap: 6 }}>
              <View style={styles.nameRow}>
                <Heading size={34} style={{ flexShrink: 1 }}>
                  {restaurant.name}
                </Heading>
                {restaurant.verified ? <VerifiedSeal size={18} /> : null}
              </View>
              <Text style={styles.chef}>
                {restaurant.chefName}
                {restaurant.neighborhood ? `, ${restaurant.neighborhood}` : ''}
              </Text>
            </View>
          </View>

          <View style={styles.facts}>
            <Text style={styles.factText}>{restaurant.cuisine.replace(/\s*•\s*/g, ' · ')}</Text>
            <Fact icon="star" label={formatRating(restaurant)} />
            <Text style={[styles.factText, { color: open ? colors.success : colors.textMuted }]}>
              {open ? `Open · ready in ~${restaurant.prepMinutes} min` : 'Closed now'}
            </Text>
          </View>
          <Text style={styles.days}>
            {days}, {formatTime(restaurant.openTime)} – {formatTime(restaurant.closeTime)}
            {restaurant.neighborhood ? ` · Pickup in ${restaurant.neighborhood}` : ''}
          </Text>

          {isPreview ? (
            <Notice icon="eye-outline" text="This is how foodies will see your kitchen." />
          ) : !open ? (
            <Notice
              icon={slots.length ? 'calendar-clock' : 'moon-waning-crescent'}
              text={
                slots.length
                  ? `Closed right now. Pre-order for ${formatSlot(slots[0], now)} or later.`
                  : 'This kitchen isn’t taking orders right now. Come back during its hours.'
              }
            />
          ) : null}

          {restaurant.chefBio.trim() || restaurant.verified ? <ChefCard restaurant={restaurant} /> : null}

          <View style={styles.menuHeader}>
            <View style={styles.menuRule} />
            <Text style={styles.menuTitle}>Menu</Text>
            <View style={styles.menuRule} />
          </View>
          {restaurant.menu.length === 0 ? <Body muted>No dishes yet.</Body> : null}
          {groupMenu(restaurant.menu, restaurant.signatureItemId).map((group) => (
            <View key={group.title ?? `group-${group.items[0].id}`}>
              {group.title ? <Text style={styles.sectionTitle}>{group.title}</Text> : null}
          {group.items.map((item) => {
            const q = qty(item.id);
            const left = remaining(item);
            const soldOut = !item.available || left === 0;
            const atLimit = left !== null && q >= left;
            const signature = item.id === restaurant.signatureItemId;
            return (
              <View key={item.id} style={[styles.item, soldOut && { opacity: 0.5 }]}>
                {/* Details and the add buttons are separate controls, not nested ones. */}
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${item.name}, ${formatCents(item.priceCents)}. Show details`}
                  onPress={() => setOpenItemId(item.id)}
                  style={({ pressed }) => [{ gap: 4 }, pressed && { opacity: 0.7 }]}>
                  {signature ? <Text style={styles.signatureLabel}>The chef’s signature</Text> : null}
                  <View style={styles.nameLine}>
                    <Text style={styles.itemName}>{item.name}</Text>
                    <Text style={styles.leader} numberOfLines={1} ellipsizeMode="clip" accessible={false}>
                      {LEADER}
                    </Text>
                    <Text style={styles.price}>{item.available ? menuPrice(item.priceCents) : 'Unavailable'}</Text>
                  </View>
                  {item.description ? <Text style={styles.description}>{item.description}</Text> : null}
                  <DietNote item={item} profile={diet} />
                </Pressable>
                <View style={styles.itemFoot}>
                  <DietaryIcons tags={item.dietary} />
                  <StockNote remaining={item.available ? left : null} />
                  <View style={{ flex: 1 }} />
                  {canOrder && !soldOut ? (
                    q > 0 ? (
                      <View style={styles.stepper}>
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={`Remove one ${item.name}`}
                          onPress={() => {
                            haptics.tap();
                            dispatch({ type: 'setCartQuantity', itemId: item.id, quantity: q - 1 });
                          }}
                          hitSlop={10}>
                          <Icon name="minus" size={15} color={colors.gold} />
                        </Pressable>
                        <Text style={styles.qty}>{q}</Text>
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={`Add one ${item.name}`}
                          disabled={atLimit}
                          onPress={() => add(item)}
                          hitSlop={10}>
                          <Icon name="plus" size={15} color={atLimit ? colors.textFaint : colors.gold} />
                        </Pressable>
                      </View>
                    ) : (
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`Add ${item.name} to cart`}
                        onPress={() => add(item)}
                        hitSlop={8}
                        style={({ pressed }) => [styles.addButton, pressed && { opacity: 0.6 }]}>
                        <Icon name="plus" size={14} color={colors.gold} />
                        <Text style={styles.addText}>Add</Text>
                      </Pressable>
                    )
                  ) : null}
                </View>
              </View>
            );
          })}
            </View>
          ))}

          {reviews.length ? (
            <View style={styles.reviews}>
              <Heading size={24}>What neighbors say</Heading>
              <RatingSummary restaurant={restaurant} />
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: spacing.md, paddingHorizontal: spacing.lg }}
                style={{ marginHorizontal: -spacing.lg }}>
                {reviews.slice(0, 10).map((r) => (
                  <ReviewCard key={r.id} review={r} now={now} />
                ))}
              </ScrollView>
            </View>
          ) : null}
          <Text style={styles.finePrint}>
            Made in a cottage food operation that is not subject to Florida’s food safety regulations. Tell{' '}
            {restaurant.chefName.replace(/\.$/, '')} about allergies in your order note.
          </Text>
        </View>
      </Animated.ScrollView>

      {/* Slim header that fades in once the hero scrolls away. */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.stickyBg,
          { height: insets.top + 64, opacity: scrollY.interpolate({ inputRange: [HERO_HEIGHT - 120, HERO_HEIGHT - 60], outputRange: [0, 1], extrapolate: 'clamp' }) },
        ]}>
        <Text style={[styles.stickyTitle, { marginTop: insets.top }]} numberOfLines={1}>
          {restaurant.name}
        </Text>
      </Animated.View>
      <View style={[styles.heroBar, { top: insets.top + spacing.sm }]} pointerEvents="box-none">
        <BackButton />
        <View style={{ flex: 1 }} />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Share ${restaurant.name}`}
          onPress={() => shareKitchen(restaurant)}
          style={[styles.heroIcon, { marginRight: spacing.sm }]}>
          <Icon name="export-variant" size={20} color={colors.ivory} />
        </Pressable>
        {!isPreview ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={favorite ? 'Remove from favorites' : 'Add to favorites'}
            onPress={() => {
              haptics.tap();
              dispatch({ type: 'toggleFavorite', restaurantId: restaurant.id });
            }}
            style={styles.heroIcon}>
            <Icon
              name={favorite ? 'heart' : 'heart-outline'}
              size={21}
              color={favorite ? colors.gold : colors.ivory}
            />
          </Pressable>
        ) : null}
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

      <DishSheet
        item={openItem}
        signature={openItem?.id === restaurant.signatureItemId}
        remaining={openItem ? remaining(openItem) : null}
        quantityInCart={openItem ? qty(openItem.id) : 0}
        canOrder={canOrder}
        diet={diet}
        onAdd={() => {
          if (openItem) add(openItem);
          setOpenItemId(null);
        }}
        onClose={() => setOpenItemId(null)}
      />
    </View>
  );
}

/** Dot leaders between a dish and its price, as on a printed menu. Clipped to fit. */
const LEADER = ' . '.repeat(60);

/** Menu prices without the dollar sign: "28" or "15.99". */
function menuPrice(cents: number): string {
  return cents % 100 === 0 ? String(cents / 100) : (cents / 100).toFixed(2);
}

function Fact({ icon, label }: { icon: IconName; label: string }) {
  return (
    <View style={styles.fact}>
      <Icon name={icon} size={13} color={colors.gold} />
      <Text style={styles.factText}>{label}</Text>
    </View>
  );
}

function Notice({ icon, text }: { icon: IconName; text: string }) {
  return (
    <View style={styles.notice}>
      <Icon name={icon} size={16} color={colors.gold} />
      <Text style={styles.noticeText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { width: '100%', height: HERO_HEIGHT },
  stickyBg: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(10,9,7,0.96)',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
    alignItems: 'center',
    justifyContent: 'center',
    paddingLeft: 72,
    paddingRight: 120,
  },
  stickyTitle: { fontFamily: fonts.display, fontSize: 18, color: colors.ivory },
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
    backgroundColor: 'rgba(10, 9, 7, 0.62)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { paddingHorizontal: spacing.lg, gap: spacing.md, marginTop: -spacing.xl },
  titleRow: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.md },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  logo: { width: 64, height: 64, borderRadius: radius.md, borderWidth: 1, borderColor: colors.hairline },
  chef: { fontFamily: fonts.displayItalic, fontSize: 19, color: colors.gold },
  facts: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, flexWrap: 'wrap', marginTop: spacing.xs },
  fact: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  factText: { fontFamily: fonts.medium, fontSize: 13, color: colors.text },
  days: { fontFamily: fonts.body, fontSize: 13, color: colors.textMuted, marginTop: -spacing.sm },
  notice: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  noticeText: { flex: 1, fontFamily: fonts.displayItalic, fontSize: 16, lineHeight: 22, color: colors.text },
  menuHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.lg },
  menuRule: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: colors.borderStrong },
  menuTitle: { fontFamily: fonts.display, fontSize: 26, color: colors.ivory },
  sectionTitle: {
    fontFamily: fonts.displayItalic,
    fontSize: 19,
    color: colors.gold,
    textAlign: 'center',
    marginTop: spacing.lg,
    marginBottom: spacing.xs,
  },
  reviews: { gap: spacing.md, marginTop: spacing.lg },
  item: { gap: spacing.sm, paddingVertical: spacing.md },
  signatureLabel: { fontFamily: fonts.displayItalic, fontSize: 15, color: colors.gold },
  nameLine: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm },
  itemName: { fontFamily: fonts.display, fontSize: 20, color: colors.ivory, flexShrink: 1 },
  leader: { flex: 1, minWidth: 16, fontFamily: fonts.body, fontSize: 12, color: colors.textFaint, overflow: 'hidden' },
  price: { fontFamily: fonts.medium, fontSize: 16, color: colors.ivory },
  description: { fontFamily: fonts.displayItalic, fontSize: 16, lineHeight: 22, color: colors.textMuted, paddingRight: spacing.xl },
  itemFoot: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 32 },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.sm,
  },
  addText: { fontFamily: fonts.semibold, fontSize: 12, letterSpacing: 1.2, textTransform: 'uppercase', color: colors.gold },
  finePrint: {
    fontFamily: fonts.displayItalic,
    fontSize: 13,
    lineHeight: 19,
    color: colors.textFaint,
    textAlign: 'center',
    marginTop: spacing.xl,
    paddingHorizontal: spacing.md,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.gold,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    minHeight: 34,
  },
  qty: { fontFamily: fonts.semibold, fontSize: 14, color: colors.ivory, minWidth: 12, textAlign: 'center' },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
  },
});
