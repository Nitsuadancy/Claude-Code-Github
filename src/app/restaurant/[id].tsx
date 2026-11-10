import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Animated, Linking, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Countdown } from '@/components/countdown';
import { ChefCard, FoundingMark, LicensedMark, VerifiedSeal } from '@/components/chef';
import { DietNote } from '@/components/diet';
import { DietaryIcons, DishSheet, StockNote } from '@/components/dish';
import { NATIVE_DRIVER, Pop, SpringIn } from '@/components/motion';
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
import { accentColor } from '@/data/accents';
import { confirmAction } from '@/lib/alert';
import * as haptics from '@/lib/haptics';
import {
  describeBakeDays,
  describeBakeDaysLong,
  describeCutoff,
  formatBakeDay,
  formatCutoff,
  openBakeDays,
  upcomingBakeDays,
} from '@/lib/bake-days';
import { describeHours } from '@/lib/hours';
import { kitchenDisclosure, kitchenKindLabel } from '@/lib/kitchen-kind';
import { instagramUrl, visibleUpdate } from '@/lib/kitchen-style';
import { remainingToday } from '@/lib/limits';
import { formatCents } from '@/lib/money';
import { computeCartTotals } from '@/lib/pricing';
import { groupMenu } from '@/lib/menu';
import { isBakeDayKitchen } from '@/lib/ordering';
import { relativeDay } from '@/lib/reviews';
import { availableSlots, formatSlot } from '@/lib/schedule';
import { shareKitchen } from '@/lib/share';
import { useDietProfile, useRestaurant, useReviews, useStore } from '@/state/store';
import { useAddToCart } from '@/state/use-add-to-cart';
import { colors, fonts, radius, spacing } from '@/theme';
import type { MenuItem } from '@/types';
import { Icon } from '@/components/icon';
import { photoSource } from '@/lib/photo';
import { Photo } from '@/components/photo';
import { EmptyState } from '@/components/empty-state';

/** The hero fills most of the first screen, so a kitchen opens on its food. */
const HERO_HEIGHT = 520;

export default function RestaurantDetail() {
  const { id, preview } = useLocalSearchParams<{ id: string; preview?: string }>();
  const restaurant = useRestaurant(id);
  const { state, dispatch } = useStore();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [openItemId, setOpenItemId] = useState<string | null>(null);
  const [tab, setTab] = useState<'menu' | 'about' | 'reviews'>('menu');
  const [scrollY] = useState(() => new Animated.Value(0));
  const reviews = useReviews(id);
  const diet = useDietProfile();
  const cart = useAddToCart();
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
  const bakeDayKitchen = isBakeDayKitchen(restaurant);
  const bakeDays = bakeDayKitchen && restaurant.acceptingOrders ? openBakeDays(restaurant, now) : [];
  const slots = open || bakeDayKitchen ? [] : availableSlots(restaurant, now);
  // Closed kitchens still take pre-orders for their next opening.
  const canOrder = (open || slots.length > 0) && !isPreview && state.user?.role === 'foodie';
  const inThisCart = state.cart.restaurantId === restaurant.id;
  const totals = computeCartTotals(inThisCart ? state.cart : { restaurantId: null, lines: [] }, restaurant.menu);
  const qty = (itemId: string) =>
    inThisCart ? (state.cart.lines.find((l) => l.itemId === itemId)?.quantity ?? 0) : 0;
  const remaining = (item: MenuItem) => remainingToday(item, state.orders, restaurant.id, now);
  const favorite = state.favoriteRestaurantIds.includes(restaurant.id);

  const openItem = restaurant.menu.find((m) => m.id === openItemId) ?? null;

  const add = (item: MenuItem) => cart.add(restaurant, item, now);

  // The cook's own touches: an accent color, a tagline, a pinned update and their Instagram.
  const accent = accentColor(restaurant.accent);
  const update = visibleUpdate(restaurant.update, now);
  // Used mid-sentence, so initials keep their period ("Denise R. bakes…").
  const chefFirst = restaurant.chefName;

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
          <CoverGallery restaurant={restaurant} width={width} height={HERO_HEIGHT} dotsTop={insets.top + 30} />
        </Animated.View>

        <View style={styles.body}>
          <View style={styles.titleRow}>
            {restaurant.logoUri ? <Image source={photoSource(restaurant.logoUri, 'thumb')} style={styles.logo} /> : null}
            <View style={{ flex: 1, gap: 6 }}>
              <View style={styles.nameRow}>
                <Heading size={38} style={{ flexShrink: 1 }}>
                  {restaurant.name}
                </Heading>
                {restaurant.verified ? <VerifiedSeal size={18} /> : null}
              </View>
              {restaurant.tagline ? <Text style={styles.tagline}>{restaurant.tagline}</Text> : null}
              <Text style={styles.chef}>
                {restaurant.chefName}
                {restaurant.neighborhood ? `, ${restaurant.neighborhood}` : ''}
              </Text>
              {restaurant.founding ? (
                <View style={styles.foundingRow}>
                  <FoundingMark size={13} />
                  <Text style={styles.foundingNote}>One of the first kitchens on Manna</Text>
                </View>
              ) : null}
              <View style={styles.foundingRow}>
                {restaurant.licensed ? <LicensedMark size={13} /> : <Icon name="home-heart" size={14} color={colors.textMuted} />}
                <Text style={styles.foundingNote}>
                  {restaurant.licensed ? 'Food permit or license on file' : kitchenKindLabel(restaurant)}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.facts}>
            <Text style={styles.factText}>{restaurant.cuisine.replace(/\s*•\s*/g, ' · ')}</Text>
            <Fact icon="star" label={formatRating(restaurant)} />
            {bakeDayKitchen ? null : (
              <Text style={[styles.factText, { color: open ? colors.success : colors.textMuted }]}>
                {open ? `Open · ready in ~${restaurant.prepMinutes} min` : 'Closed now'}
              </Text>
            )}
          </View>
          <Text style={styles.days}>
            {bakeDayKitchen
              ? `Bake days ${describeBakeDays(restaurant.bakeDays)}`
              : describeHours(restaurant)}
            {restaurant.neighborhood ? ` · Pickup in ${restaurant.neighborhood}` : ''}
          </Text>

          {isPreview ? (
            <Notice icon="eye-outline" text="This is how customers will see your kitchen." />
          ) : bakeDayKitchen ? (
            bakeDays.length ? (
              <View style={[styles.bakeDay, { borderColor: accent }]}>
                <View style={styles.bakeDayTop}>
                  <Text style={[styles.bakeDayLabel, { color: accent }]}>Next bake day</Text>
                  <Countdown to={bakeDays[0].closesAt} prefix="Closes in " style={{ fontSize: 12 }} />
                </View>
                <Text style={styles.bakeDayWhen}>{formatBakeDay(bakeDays[0], now)}</Text>
                <Text style={styles.bakeDayCutoff}>
                  {formatCutoff(bakeDays[0], now)}. {chefFirst} bakes everything fresh for that day.
                </Text>
              </View>
            ) : (
              <Notice
                icon="moon-waning-crescent"
                text={(() => {
                  const later = upcomingBakeDays(restaurant, now)[0];
                  return later
                    ? `Orders for ${formatBakeDay(later, now)} have closed. Check back for the next bake day.`
                    : 'No bake days coming up right now. Check back soon.';
                })()}
              />
            )
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

          <View style={styles.tabs} accessibilityRole="tablist">
            {(
              [
                ['menu', 'Menu'],
                ['about', 'About'],
                ['reviews', reviews.length ? `Reviews · ${reviews.length}` : 'Reviews'],
              ] as const
            ).map(([key, label]) => (
              <Pressable
                key={key}
                accessibilityRole="tab"
                accessibilityState={{ selected: tab === key }}
                onPress={() => setTab(key)}
                style={[styles.tab, tab === key && [styles.tabOn, { borderBottomColor: accent }]]}>
                <Text style={[styles.tabText, tab === key && styles.tabTextOn]}>{label}</Text>
              </Pressable>
            ))}
          </View>

          {tab === 'menu' ? (
            <View>
              {update ? (
                <View
                  style={[styles.update, update.photoUri ? styles.updateWithPhoto : { borderLeftColor: accent }]}
                  accessibilityRole="summary">
                  {update.photoUri ? (
                    <Photo
                      uri={update.photoUri}
                      size="card"
                      style={styles.updatePhoto}
                      accessibilityLabel={update.text ? `Photo: ${update.text}` : `Photo from ${chefFirst}’s kitchen`}
                    />
                  ) : null}
                  <View style={update.photoUri ? styles.updateCaption : undefined}>
                    <Text style={[styles.updateFrom, { color: accent }]}>
                      {update.photoUri ? 'In the kitchen' : `From ${chefFirst}`} · {relativeDay(update.postedAt, now)}
                    </Text>
                    {update.text ? <Text style={styles.updateText}>{update.text}</Text> : null}
                  </View>
                </View>
              ) : null}
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
                          style={({ pressed }) => [styles.itemText, pressed && { opacity: 0.7 }]}>
                          {signature || item.popular ? (
                            <Text style={[styles.signatureLabel, { color: accent }]}>
                              {[signature && 'Chef’s signature', item.popular && 'Most ordered'].filter(Boolean).join(' · ')}
                            </Text>
                          ) : null}
                          <Text style={styles.itemName}>{item.name}</Text>
                          {item.description ? (
                            <Text style={styles.description} numberOfLines={2}>
                              {item.description}
                            </Text>
                          ) : null}
                          <View style={styles.itemFoot}>
                            <Text style={styles.price}>{item.available ? formatCents(item.priceCents) : 'Unavailable'}</Text>
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
                              <Photo uri={item.photoUri} size="thumb" style={styles.thumb} />
                            </Pressable>
                          ) : (
                            <View style={styles.thumbEmpty} />
                          )}
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
                                  onPress={() => add(item)}
                                  hitSlop={10}>
                                  <Icon name="plus" size={15} color={atLimit ? colors.textMuted : colors.bg} />
                                </Pressable>
                              </SpringIn>
                            ) : (
                              <Pressable
                                accessibilityRole="button"
                                accessibilityLabel={`Add ${item.name} to cart`}
                                onPress={() => add(item)}
                                hitSlop={8}
                                style={({ pressed }) => [styles.addButton, pressed && { opacity: 0.7 }]}>
                                <Icon name="plus" size={18} color={colors.bg} />
                              </Pressable>
                            )
                          ) : null}
                        </View>
                      </View>
                    );
                  })}
                </View>
              ))}
            </View>
          ) : null}

          {tab === 'about' ? (
            <View style={{ gap: spacing.lg }}>
              {restaurant.chefBio.trim() || restaurant.verified ? <ChefCard restaurant={restaurant} /> : null}

              {restaurant.inPerson?.length ? (
                <View style={styles.inPerson}>
                  <Heading size={22}>Find me in person</Heading>
                  {restaurant.inPerson.map((spot) => (
                    <View key={`${spot.place}-${spot.when}`} style={styles.spot}>
                      <View style={styles.spotIcon}>
                        <Icon name="map-marker-outline" size={18} color={accent} />
                      </View>
                      <View style={{ flex: 1, gap: 2 }}>
                        <Text style={styles.spotPlace}>{spot.place}</Text>
                        <Text style={styles.spotWhen}>{spot.when}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              ) : null}

              {restaurant.instagram ? (
                <View style={{ gap: 4 }}>
                  <Text style={styles.aboutLabel}>Instagram</Text>
                  <Pressable
                    accessibilityRole="link"
                    accessibilityLabel={`${restaurant.name} on Instagram, @${restaurant.instagram}`}
                    onPress={() => void Linking.openURL(instagramUrl(restaurant.instagram ?? ''))}
                    style={({ pressed }) => [styles.instagram, pressed && { opacity: 0.7 }]}>
                    <Icon name="instagram" size={18} color={accent} />
                    <Text style={[styles.aboutText, { color: accent }]}>@{restaurant.instagram}</Text>
                  </Pressable>
                </View>
              ) : null}

              <View style={{ gap: 4 }}>
                <Text style={styles.aboutLabel}>{bakeDayKitchen ? 'Bake days' : 'Hours'}</Text>
                <Text style={styles.aboutText}>
                  {bakeDayKitchen
                    ? `${describeBakeDaysLong(restaurant.bakeDays)}. Order by ${describeCutoff(restaurant.bakeDays?.[0]?.closeDaysBefore ?? 1)}.`
                    : describeHours(restaurant).replace(/ · /g, '\n')}
                </Text>
              </View>
              <View style={{ gap: 4 }}>
                <Text style={styles.aboutLabel}>Pickup</Text>
                <Text style={styles.aboutText}>
                  {restaurant.neighborhood || restaurant.city}. The exact address is shared once your order is accepted.
                </Text>
              </View>
            </View>
          ) : null}

          {tab === 'reviews' ? (
            reviews.length ? (
              <View style={styles.reviews}>
                <RatingSummary restaurant={restaurant} />
                {reviews.slice(0, 20).map((r) => (
                  <ReviewCard
                    key={r.id}
                    review={r}
                    now={now}
                    wide
                    onReport={() =>
                      confirmAction(
                        'Report this review?',
                        'Report reviews that are abusive, false or not about a real order. We hide it for you, and Manna’s team checks every report within 24 hours.',
                        'Report',
                        () => dispatch({ type: 'reportReview', reviewId: r.id }),
                      )
                    }
                  />
                ))}
              </View>
            ) : (
              <EmptyState
                art="review"
                compact
                title="No reviews yet"
                body="Reviews appear here after customers pick up their orders."
              />
            )
          ) : null}
          <Text style={styles.finePrint}>
            {kitchenDisclosure(restaurant)} Tell {chefFirst} about allergies in your order note.
          </Text>
        </View>
      </Animated.ScrollView>

      {/* Slim header that fades in before the kitchen's name reaches the buttons. */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.stickyBg,
          { height: insets.top + 64, opacity: scrollY.interpolate({ inputRange: [HERO_HEIGHT - 280, HERO_HEIGHT - 220], outputRange: [0, 1], extrapolate: 'clamp' }) },
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
            <Pop trigger={favorite}>
              <Icon
                name={favorite ? 'heart' : 'heart-outline'}
                size={21}
                color={favorite ? colors.gold : colors.ivory}
              />
            </Pop>
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
    backgroundColor: colors.bg,
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
  body: { paddingHorizontal: spacing.lg, gap: spacing.md, marginTop: -150 },
  titleRow: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.md },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  logo: { width: 64, height: 64, borderRadius: radius.md, borderWidth: 1, borderColor: colors.hairline },
  chef: { fontFamily: fonts.medium, fontSize: 16, color: 'rgba(247,244,238,0.8)' },
  facts: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, flexWrap: 'wrap', marginTop: spacing.xs },
  fact: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  factText: { fontFamily: fonts.medium, fontSize: 13, color: colors.text },
  days: { fontFamily: fonts.body, fontSize: 13, color: colors.textMuted, marginTop: -spacing.sm },
  notice: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  foundingRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: 2 },
  foundingNote: { fontFamily: fonts.medium, fontSize: 13, color: 'rgba(247,244,238,0.7)' },
  inPerson: { gap: spacing.md, marginTop: spacing.sm },
  spot: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  spotIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  spotPlace: { fontFamily: fonts.semibold, fontSize: 15, color: colors.ivory },
  spotWhen: { fontFamily: fonts.body, fontSize: 13, color: colors.textMuted },
  noticeText: { flex: 1, fontFamily: fonts.medium, fontSize: 14, lineHeight: 20, color: colors.text },
  tabs: {
    flexDirection: 'row',
    gap: spacing.lg,
    marginTop: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderStrong,
  },
  tab: { paddingVertical: spacing.sm + 2, borderBottomWidth: 2, borderBottomColor: 'transparent', marginBottom: -1 },
  tabOn: { borderBottomColor: colors.ivory },
  tabText: { fontFamily: fonts.semibold, fontSize: 15, color: colors.textMuted },
  tabTextOn: { color: colors.ivory },
  bakeDay: { borderWidth: 1, borderRadius: radius.md, padding: spacing.md, gap: 4, backgroundColor: colors.surface },
  bakeDayTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm },
  bakeDayLabel: { fontFamily: fonts.semibold, fontSize: 12 },
  bakeDayWhen: { fontFamily: fonts.semibold, fontSize: 17, color: colors.ivory },
  bakeDayCutoff: { fontFamily: fonts.body, fontSize: 13, lineHeight: 19, color: colors.textMuted },
  tagline: { fontFamily: fonts.medium, fontSize: 17, lineHeight: 23, color: colors.ivory, opacity: 0.92 },
  update: {
    borderLeftWidth: 3,
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    gap: 4,
    marginBottom: spacing.md,
  },
  // A photo update reads as a small card from the kitchen, without the side rule.
  updateWithPhoto: { borderLeftWidth: 0, paddingVertical: 0, paddingHorizontal: 0, overflow: 'hidden', borderRadius: radius.lg },
  updatePhoto: { width: '100%', aspectRatio: 16 / 10 },
  updateCaption: { paddingHorizontal: spacing.md, paddingTop: spacing.sm + 2, paddingBottom: spacing.md, gap: 4 },
  updateFrom: { fontFamily: fonts.semibold, fontSize: 12 },
  updateText: { fontFamily: fonts.medium, fontSize: 15, lineHeight: 21, color: colors.ivory },
  instagram: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, alignSelf: 'flex-start' },
  aboutLabel: { fontFamily: fonts.semibold, fontSize: 13, color: colors.textMuted },
  aboutText: { fontFamily: fonts.body, fontSize: 15, lineHeight: 22, color: colors.text },
  sectionTitle: {
    fontFamily: fonts.semibold,
    fontSize: 15,
    color: colors.textMuted,
    marginTop: spacing.lg,
    marginBottom: spacing.xs,
  },
  reviews: { gap: spacing.md },
  item: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingVertical: spacing.md + 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  itemText: { flex: 1, gap: 5 },
  signatureLabel: { fontFamily: fonts.semibold, fontSize: 12, color: colors.gold },
  itemName: { fontFamily: fonts.display, fontSize: 17, letterSpacing: -0.3, color: colors.ivory },
  description: { fontFamily: fonts.body, fontSize: 14, lineHeight: 20, color: colors.textMuted },
  itemFoot: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: 2 },
  price: { fontFamily: fonts.semibold, fontSize: 15, color: colors.ivory, fontVariant: ['tabular-nums'] },
  // Sized to the photo, not the row, so the add button always sits on the photo's corner.
  thumbWrap: { width: 104, alignItems: 'center', alignSelf: 'flex-start' },
  thumb: { width: 104, height: 104, borderRadius: radius.md },
  thumbEmpty: { width: 104, height: 52 },
  addButton: {
    position: 'absolute',
    bottom: -8,
    right: -4,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.ivory,
    alignItems: 'center',
    justifyContent: 'center',
  },
  finePrint: {
    fontFamily: fonts.body,
    fontSize: 12,
    lineHeight: 18,
    color: colors.textFaint,
    textAlign: 'center',
    marginTop: spacing.xl,
    paddingHorizontal: spacing.md,
  },
  stepper: {
    position: 'absolute',
    bottom: -8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.ivory,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    minHeight: 34,
  },
  qty: { fontFamily: fonts.semibold, fontSize: 14, color: colors.bg, minWidth: 12, textAlign: 'center', fontVariant: ['tabular-nums'] },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
  },
});
