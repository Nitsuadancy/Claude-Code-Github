import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Countdown } from '@/components/countdown';
import { DietaryIcons } from '@/components/dish';
import { EmptyState } from '@/components/empty-state';
import { Icon } from '@/components/icon';
import { Pop, SpringIn } from '@/components/motion';
import { Photo } from '@/components/photo';
import { Screen } from '@/components/ui';
import { hasPro } from '@/lib/pro';
import { allergenSentence } from '@/lib/dietary';
import { allergenConflicts } from '@/lib/diet';
import * as haptics from '@/lib/haptics';
import { formatCents } from '@/lib/money';
import { openBakeDays } from '@/lib/bake-days';
import { isBakeDayKitchen, orderingLine } from '@/lib/ordering';
import { tasteFeed, type TasteDish } from '@/lib/taste';
import { useAllRestaurants, useDietProfile, useStore } from '@/state/store';
import { useAddToCart } from '@/state/use-add-to-cart';
import { colors, fonts, radius, spacing } from '@/theme';

/**
 * Taste: today's food, one dish per screen. Swipe up for the next, add it to
 * your cart where you are, or open the cook's kitchen.
 */
export default function Taste() {
  const { state, dispatch } = useStore();
  const restaurants = useAllRestaurants();
  const diet = useDietProfile();
  const cart = useAddToCart();
  const { height, width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [now] = useState(() => new Date());
  const [index, setIndex] = useState(0);
  const feed = tasteFeed(restaurants, now);
  const cartCount = state.cart.lines.reduce((n, l) => n + l.quantity, 0);

  const close = () => (router.canGoBack() ? router.back() : router.replace('/foodie'));

  if (!feed.length) {
    return (
      <Screen style={{ justifyContent: 'center', padding: spacing.lg }}>
        <EmptyState
          art="plate"
          title="Nothing to taste right now"
          body="Kitchens near you aren’t taking orders at the moment. Check back closer to the next bake day."
          action={{ title: 'Back to Discover', onPress: close }}
        />
      </Screen>
    );
  }

  const renderDish = ({ item: dish, index: i }: { item: TasteDish; index: number }) => {
    const { restaurant, item } = dish;
    const q = cart.quantity(restaurant.id, item.id);
    const left = cart.remaining(restaurant, item, now);
    const soldOut = left !== null && left <= 0;
    const atLimit = left !== null && q >= left;
    const conflicts = allergenConflicts(item, diet.avoid);
    const closesAt = isBakeDayKitchen(restaurant) ? openBakeDays(restaurant, now)[0]?.closesAt : undefined;
    return (
      <View style={{ width, height }} accessibilityLabel={`${item.name} from ${restaurant.name}, ${formatCents(item.priceCents)}`}>
        <Photo uri={item.photoUri!} size="full" priority={i <= index + 1 ? 'high' : 'low'} style={StyleSheet.absoluteFill} />
        <LinearGradient
          pointerEvents="none"
          colors={['rgba(10,9,7,0.55)', 'transparent']}
          style={[styles.topShade, { height: insets.top + 110 }]}
        />
        <LinearGradient
          pointerEvents="none"
          colors={['transparent', 'rgba(10,9,7,0.72)', colors.bg]}
          locations={[0, 0.45, 1]}
          style={styles.bottomShade}
        />
        <View style={[styles.info, { paddingBottom: insets.bottom + spacing.lg }]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Open ${restaurant.name}`}
            onPress={() => router.push({ pathname: '/restaurant/[id]', params: { id: restaurant.id } })}
            hitSlop={6}
            style={styles.kitchenRow}>
            <Text style={styles.kitchen} numberOfLines={1}>
              {restaurant.name}
            </Text>
            <Text style={styles.kitchenDot}>·</Text>
            <Text style={styles.cook} numberOfLines={1}>
              {restaurant.chefName}
            </Text>
            <Icon name="chevron-right" size={16} color={colors.text} />
          </Pressable>
          <View style={styles.whenRow}>
            <Text style={styles.when}>
              {hasPro(restaurant, now) ? 'Featured · ' : ''}
              {orderingLine(restaurant, now, { long: true })}
            </Text>
            {closesAt ? <Countdown to={closesAt} prefix="· closes in " color={colors.text} /> : null}
          </View>
          <Text style={styles.name}>{item.name}</Text>
          {item.description ? (
            <Text style={styles.description} numberOfLines={3}>
              {item.description}
            </Text>
          ) : null}
          <View style={styles.meta}>
            <Text style={styles.price}>{formatCents(item.priceCents)}</Text>
            <DietaryIcons tags={item.dietary} />
            {left !== null && left > 0 && left <= 5 ? <Text style={styles.left}>Only {left} left today</Text> : null}
          </View>
          {conflicts.length ? (
            <View style={styles.warning}>
              <Icon name="alert-circle-outline" size={16} color={colors.gold} />
              <Text style={styles.warningText}>{allergenSentence(conflicts)}</Text>
            </View>
          ) : null}
          <View style={styles.actions}>
            {soldOut ? (
              <View style={[styles.add, styles.soldOut]}>
                <Text style={styles.soldOutText}>Sold out today</Text>
              </View>
            ) : q > 0 ? (
              <SpringIn style={[styles.add, styles.stepper]}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Remove one ${item.name}`}
                  hitSlop={10}
                  onPress={() => {
                    haptics.tap();
                    dispatch({ type: 'setCartQuantity', itemId: item.id, quantity: q - 1 });
                  }}>
                  <Icon name="minus" size={20} color={colors.bg} />
                </Pressable>
                <Pop trigger={q} to={1.25}>
                  <Text style={styles.addText}>{q} in cart</Text>
                </Pop>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Add one ${item.name}`}
                  hitSlop={10}
                  disabled={atLimit}
                  onPress={() => cart.add(restaurant, item, now)}>
                  <Icon name="plus" size={20} color={atLimit ? colors.textMuted : colors.bg} />
                </Pressable>
              </SpringIn>
            ) : (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Add ${item.name} to cart`}
                onPress={() => cart.add(restaurant, item, now)}
                style={({ pressed }) => [styles.add, pressed && { opacity: 0.85 }]}>
                <Icon name="plus" size={18} color={colors.bg} />
                <Text style={styles.addText}>Add · {formatCents(item.priceCents)}</Text>
              </Pressable>
            )}
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push({ pathname: '/restaurant/[id]', params: { id: restaurant.id } })}
              style={({ pressed }) => [styles.visit, pressed && { opacity: 0.7 }]}>
              <Text style={styles.visitText}>Full menu</Text>
            </Pressable>
          </View>
          {i === 0 && index === 0 && feed.length > 1 ? (
            <View style={styles.hint} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
              <Icon name="chevron-up" size={16} color={colors.textMuted} />
              <Text style={styles.hintText}>Swipe up for more</Text>
            </View>
          ) : null}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.screen}>
      <FlatList
        data={feed}
        keyExtractor={(d) => `${d.restaurant.id}:${d.item.id}`}
        renderItem={renderDish}
        pagingEnabled
        decelerationRate="fast"
        snapToInterval={height}
        showsVerticalScrollIndicator={false}
        getItemLayout={(_, i) => ({ length: height, offset: height * i, index: i })}
        initialNumToRender={2}
        windowSize={3}
        onMomentumScrollEnd={(e) => setIndex(Math.round(e.nativeEvent.contentOffset.y / height))}
        onScroll={(e) => {
          const next = Math.round(e.nativeEvent.contentOffset.y / height);
          if (next !== index) setIndex(next);
        }}
        scrollEventThrottle={100}
      />

      <View style={[styles.top, { paddingTop: insets.top + spacing.sm }]} pointerEvents="box-none">
        <Pressable accessibilityRole="button" accessibilityLabel="Close" hitSlop={10} onPress={close} style={styles.round}>
          <Icon name="close" size={22} color={colors.ivory} />
        </Pressable>
        <Text style={styles.count} accessibilityLabel={`Dish ${index + 1} of ${feed.length}`}>
          {index + 1} / {feed.length}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={cartCount ? `Cart, ${cartCount} items` : 'Cart'}
          hitSlop={10}
          onPress={() => router.navigate('/foodie/cart')}
          style={styles.round}>
          <Pop trigger={cartCount} to={1.2}>
            <Icon name={cartCount ? 'shopping' : 'shopping-outline'} size={21} color={colors.ivory} />
          </Pop>
          {cartCount ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{cartCount > 9 ? '9+' : cartCount}</Text>
            </View>
          ) : null}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  topShade: { position: 'absolute', top: 0, left: 0, right: 0 },
  bottomShade: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '62%' },
  info: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: spacing.lg, gap: spacing.sm },
  kitchenRow: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', maxWidth: '100%' },
  kitchen: { fontFamily: fonts.semibold, fontSize: 15, color: colors.ivory, flexShrink: 1 },
  kitchenDot: { color: colors.textMuted, fontSize: 15 },
  cook: { fontFamily: fonts.body, fontSize: 15, color: colors.text, flexShrink: 1 },
  whenRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  when: { fontFamily: fonts.medium, fontSize: 13, color: colors.gold },
  name: { fontFamily: fonts.display, fontSize: 34, lineHeight: 38, letterSpacing: -0.8, color: colors.ivory, marginTop: spacing.xs },
  description: { fontFamily: fonts.body, fontSize: 15, lineHeight: 21, color: colors.text },
  meta: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, flexWrap: 'wrap' },
  price: { fontFamily: fonts.semibold, fontSize: 17, color: colors.ivory, fontVariant: ['tabular-nums'] },
  left: { fontFamily: fonts.medium, fontSize: 13, color: colors.gold },
  warning: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  warningText: { fontFamily: fonts.medium, fontSize: 13, color: colors.gold, flexShrink: 1 },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  add: {
    flex: 1,
    minHeight: 54,
    borderRadius: radius.pill,
    backgroundColor: colors.ivory,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  stepper: { justifyContent: 'space-between', paddingHorizontal: spacing.lg },
  addText: { fontFamily: fonts.semibold, fontSize: 16, color: colors.bg, fontVariant: ['tabular-nums'] },
  soldOut: { backgroundColor: colors.surfaceRaised },
  soldOutText: { fontFamily: fonts.semibold, fontSize: 16, color: colors.textMuted },
  visit: {
    minHeight: 54,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: 'rgba(247,244,238,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  visitText: { fontFamily: fonts.semibold, fontSize: 15, color: colors.ivory },
  hint: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, marginTop: spacing.xs },
  hintText: { fontFamily: fonts.medium, fontSize: 12, color: colors.textMuted },
  top: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
  },
  round: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(10,9,7,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  count: { fontFamily: fonts.medium, fontSize: 13, color: colors.ivory, fontVariant: ['tabular-nums'] },
  badge: {
    position: 'absolute',
    top: 4,
    right: 4,
    minWidth: 17,
    height: 17,
    borderRadius: radius.pill,
    paddingHorizontal: 4,
    backgroundColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { color: colors.onGold, fontSize: 10, fontFamily: fonts.semibold },
});
