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
  Badge,
  Body,
  Eyebrow,
  GoldButton,
  GoldRule,
  Heading,
  type IconName,
  Screen,
} from '@/components/ui';
import { confirmAction } from '@/lib/alert';
import * as haptics from '@/lib/haptics';
import { capitalize, formatTime, WEEKDAYS } from '@/lib/hours';
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

  const days = WEEKDAYS.filter((d) => restaurant.workingDays.includes(d))
    .map((d) => capitalize(d).slice(0, 3))
    .join(' · ');

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
            <View style={{ flex: 1, gap: 4 }}>
              <Eyebrow>{restaurant.cuisine}</Eyebrow>
              <View style={styles.nameRow}>
                <Heading size={32} style={{ flexShrink: 1 }}>
                  {restaurant.name}
                </Heading>
                {restaurant.verified ? <VerifiedSeal size={20} /> : null}
              </View>
              <Text style={styles.chef}>by {restaurant.chefName}</Text>
            </View>
          </View>

          <View style={styles.facts}>
            <Fact icon="star" label={formatRating(restaurant)} />
            <View style={styles.factDivider} />
            <Fact icon="timer-sand" label={`~${restaurant.prepMinutes} min`} />
            <View style={styles.factDivider} />
            <Badge label={open ? 'Open now' : 'Closed'} tone={open ? 'success' : 'muted'} />
          </View>
          <Text style={styles.days}>
            {days} · {formatTime(restaurant.openTime)} – {formatTime(restaurant.closeTime)}
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
            <Eyebrow>The menu</Eyebrow>
            <GoldRule width={28} />
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
              <View
                key={item.id}
                style={[styles.item, signature && styles.signature, soldOut && { opacity: 0.5 }]}>
                {/* Details and the add buttons are separate controls, not nested ones. */}
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${item.name}, ${formatCents(item.priceCents)}. Show details`}
                  onPress={() => setOpenItemId(item.id)}
                  style={({ pressed }) => [{ flex: 1, gap: 6 }, pressed && { opacity: 0.7 }]}>
                  {signature ? (
                    <View style={styles.signatureLabel}>
                      <Icon name="star-four-points" size={11} color={colors.gold} />
                      <Eyebrow style={{ fontSize: 10 }}>Signature</Eyebrow>
                    </View>
                  ) : null}
                  <Text style={styles.itemName}>{item.name}</Text>
                  {item.description ? (
                    <Body muted numberOfLines={2} style={{ fontSize: 13, lineHeight: 19 }}>
                      {item.description}
                    </Body>
                  ) : null}
                  <View style={styles.itemMeta}>
                    <Text style={styles.price}>
                      {item.available ? formatCents(item.priceCents) : 'Unavailable'}
                    </Text>
                    <DietaryIcons tags={item.dietary} />
                  </View>
                  <StockNote remaining={item.available ? left : null} />
                  <DietNote item={item} profile={diet} />
                </Pressable>

                <View style={styles.thumbWrap}>
                  {item.photoUri ? (
                    <Pressable
                      accessibilityRole="imagebutton"
                      accessibilityLabel={`Photo of ${item.name}. Show details`}
                      onPress={() => setOpenItemId(item.id)}>
                      <Image source={photoSource(item.photoUri)} style={styles.thumb} contentFit="cover" />
                    </Pressable>
                  ) : null}
                  {canOrder && !soldOut ? (
                    q > 0 ? (
                      <View style={[styles.stepper, item.photoUri && styles.onThumb]}>
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={`Remove one ${item.name}`}
                          onPress={() => {
                            haptics.tap();
                            dispatch({ type: 'setCartQuantity', itemId: item.id, quantity: q - 1 });
                          }}
                          hitSlop={8}>
                          <Icon name="minus" size={16} color={colors.gold} />
                        </Pressable>
                        <Text style={styles.qty}>{q}</Text>
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={`Add one ${item.name}`}
                          disabled={atLimit}
                          onPress={() => add(item)}
                          hitSlop={8}>
                          <Icon
                            name="plus"
                            size={16}
                            color={atLimit ? colors.textFaint : colors.gold}
                          />
                        </Pressable>
                      </View>
                    ) : (
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`Add ${item.name} to cart`}
                        onPress={() => add(item)}
                        style={({ pressed }) => [
                          styles.addButton,
                          item.photoUri && styles.onThumb,
                          pressed && { backgroundColor: colors.gold },
                        ]}>
                        <Icon name="plus" size={20} color={colors.gold} />
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
              <View style={styles.menuHeader}>
                <Eyebrow>What neighbors say</Eyebrow>
                <GoldRule width={28} />
              </View>
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

function Fact({ icon, label }: { icon: IconName; label: string }) {
  return (
    <View style={styles.fact}>
      <Icon name={icon} size={15} color={colors.gold} />
      <Text style={styles.factText}>{label}</Text>
    </View>
  );
}

function Notice({ icon, text }: { icon: IconName; text: string }) {
  return (
    <View style={styles.notice}>
      <Icon name={icon} size={18} color={colors.gold} />
      <Body style={{ flex: 1, fontSize: 14 }}>{text}</Body>
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
  stickyTitle: { fontFamily: fonts.display, fontSize: 21, color: colors.ivory },
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
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  logo: { width: 64, height: 64, borderRadius: radius.md, borderWidth: 1, borderColor: colors.hairline },
  chef: { fontFamily: fonts.displayItalic, fontSize: 18, color: colors.textMuted },
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
  days: { fontFamily: fonts.body, fontSize: 12, color: colors.textMuted, letterSpacing: 0.4, marginTop: -spacing.sm },
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
  sectionTitle: {
    fontFamily: fonts.display,
    fontSize: 23,
    color: colors.ivory,
    marginTop: spacing.lg,
    paddingBottom: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
  },
  reviews: { gap: spacing.md, marginTop: spacing.lg },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md + 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  signature: {
    borderWidth: 1,
    borderColor: colors.hairline,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  signatureLabel: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  itemName: { fontFamily: fonts.display, fontSize: 22, color: colors.ivory },
  itemMeta: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  price: { fontFamily: fonts.semibold, fontSize: 14, color: colors.gold, letterSpacing: 0.4 },
  thumbWrap: { alignItems: 'center', justifyContent: 'center', minWidth: 44 },
  thumb: { width: 96, height: 96, borderRadius: radius.md },
  onThumb: { position: 'absolute', bottom: -10, backgroundColor: colors.surface },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 2,
    borderWidth: 1,
    borderColor: colors.gold,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm + 4,
    minHeight: 40,
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
