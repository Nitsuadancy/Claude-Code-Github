import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { Pressable, ScrollView, type StyleProp, StyleSheet, Text, View, type ViewStyle } from 'react-native';

import { orderingLine, takingOrders } from '@/lib/ordering';
import { colors, fonts, radius, spacing } from '@/theme';
import type { Restaurant } from '@/types';

import { FoundingMark, LicensedMark, VerifiedSeal } from './chef';
import { PressableScale } from './motion';
import { Icon } from './icon';
import { Photo } from './photo';


/** "4.6 (128)", or "New" before the first rating. */
export function formatRating(r: Restaurant, long = false): string {
  if (r.ratingCount === 0) return 'New';
  const noun = r.ratingCount === 1 ? ' rating' : ' ratings';
  return `${r.rating.toFixed(1)} (${r.ratingCount}${long ? noun : ''})`;
}

/** Whether customers can order right now: open hours, or an open bake day. */
export function isOpenNow(r: Restaurant, now: Date): boolean {
  return takingOrders(r, now);
}

/**
 * The kitchen's first cover photo. Without one, shows an elegant gold
 * monogram on black with the logo's rays, so the feed still feels premium.
 */
export function RestaurantCover({
  restaurant,
  style,
  monogramSize = 64,
}: {
  restaurant: Restaurant;
  style?: StyleProp<ViewStyle>;
  monogramSize?: number;
}) {
  const cover = restaurant.coverUris[0];
  if (cover) {
    return (
      <View style={[style, { overflow: 'hidden' }]}>
        <Photo uri={cover} style={StyleSheet.absoluteFill} />
      </View>
    );
  }
  const initial = restaurant.name.trim().charAt(0).toUpperCase() || 'M';
  return (
    <LinearGradient colors={['#1F1A12', '#0E0C09']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[style, styles.monogramWrap]}>
      {/* A quiet seal, like a monogram pressed into a menu card, until the chef adds photos. */}
      <View
        style={[
          styles.seal,
          { width: monogramSize * 1.5, height: monogramSize * 1.5, borderRadius: monogramSize * 0.75 },
        ]}>
        <Text style={[styles.monogram, { fontSize: monogramSize * 0.8, lineHeight: monogramSize }]}>{initial}</Text>
      </View>
    </LinearGradient>
  );
}

/** "Jamaican · Bakery" from "Jamaican • Bakery". */
function cuisineLine(r: Restaurant): string {
  return r.cuisine.replace(/\s*•\s*/g, ' · ');
}

/** Feed entry: a photo, then the kitchen's name, the chef's byline and one line of facts. */
export function RestaurantCard({
  restaurant,
  favorite,
  onPress,
  onToggleFavorite,
  now,
}: {
  restaurant: Restaurant;
  favorite: boolean;
  onPress: () => void;
  onToggleFavorite: () => void;
  now: Date;
}) {
  const open = isOpenNow(restaurant, now);
  // The heart sits beside the card's main button, not inside it, so screen
  // readers and browsers treat them as two separate controls.
  return (
    <View>
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel={`${restaurant.name}, ${restaurant.cuisine}, ${formatRating(restaurant, true)}, ${open ? 'open now' : 'closed'}`}
        onPress={onPress}>
        <View style={styles.coverWrap}>
          <RestaurantCover restaurant={restaurant} style={styles.cover} />
        </View>
        <View style={styles.info}>
          <View style={styles.nameRow}>
            <Text style={[styles.name, { flexShrink: 1 }]} numberOfLines={1}>
              {restaurant.name}
            </Text>
            {restaurant.verified ? <VerifiedSeal /> : null}
            {restaurant.founding ? <FoundingMark /> : null}
            {restaurant.licensed ? <LicensedMark /> : null}
            {restaurant.hasOffer ? <Text style={styles.offer}>Offer</Text> : null}
          </View>
          <Text style={styles.byline} numberOfLines={1}>
            {restaurant.chefName}
            {restaurant.neighborhood ? `, ${restaurant.neighborhood}` : ''}
          </Text>
          <View style={styles.metaRow}>
            <Text style={[styles.meta, open && { color: colors.success }]} numberOfLines={1}>
              {orderingLine(restaurant, now)}
            </Text>
            <Text style={styles.metaDot}>·</Text>
            <Text style={styles.meta} numberOfLines={1}>
              {cuisineLine(restaurant)}
            </Text>
            <Text style={styles.metaDot}>·</Text>
            <Icon name="star" size={11} color={colors.gold} />
            <Text style={[styles.meta, styles.noShrink]}>{formatRating(restaurant)}</Text>
          </View>
        </View>
      </PressableScale>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={favorite ? `Remove ${restaurant.name} from favorites` : `Add ${restaurant.name} to favorites`}
        hitSlop={10}
        onPress={onToggleFavorite}
        style={[styles.heart, styles.heartPosition]}>
        <Icon name={favorite ? 'heart' : 'heart-outline'} size={18} color={favorite ? colors.gold : colors.ivory} />
      </Pressable>
    </View>
  );
}

/** Portrait photo with the name beneath, for the horizontal "Tonight’s table" row. */
export function FeaturedCard({
  restaurant,
  onPress,
  width,
}: {
  restaurant: Restaurant;
  onPress: () => void;
  width: number;
}) {
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={`${restaurant.name}, ${restaurant.cuisine}`}
      onPress={onPress}
      style={{ width, gap: spacing.sm + 2 }}>
      <View style={[styles.coverWrap, { width, height: width * 1.25 }]}>
        <RestaurantCover restaurant={restaurant} style={StyleSheet.absoluteFill} monogramSize={80} />
      </View>
      <View style={{ gap: 3 }}>
        <Text style={[styles.name, { fontSize: 19 }]} numberOfLines={1}>
          {restaurant.name}
        </Text>
        <Text style={styles.byline} numberOfLines={1}>
          {restaurant.chefName}
          {restaurant.neighborhood ? `, ${restaurant.neighborhood}` : ''}
        </Text>
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  // Feed entries are photo-led: no box, just an image and type beneath it.
  coverWrap: { borderRadius: radius.md, overflow: 'hidden', backgroundColor: colors.surface },
  cover: { width: '100%', aspectRatio: 3 / 2 },
  heartPosition: { position: 'absolute', top: spacing.sm + 2, right: spacing.sm + 2 },
  heart: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(10,9,7,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  monogramWrap: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  seal: { borderWidth: 1, borderColor: colors.hairline, alignItems: 'center', justifyContent: 'center' },
  monogram: { fontFamily: fonts.display, color: colors.gold },
  info: { paddingTop: spacing.md - 2, gap: 3 },
  name: { fontFamily: fonts.display, fontSize: 20, letterSpacing: -0.5, color: colors.ivory },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  byline: { fontFamily: fonts.medium, fontSize: 14, color: colors.textMuted },
  offer: { marginLeft: 'auto', fontFamily: fonts.semibold, fontSize: 12, color: colors.gold },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 },
  meta: { fontFamily: fonts.body, fontSize: 13, color: colors.textFaint, flexShrink: 1 },
  metaDot: { color: colors.textFaint, fontSize: 13 },
  noShrink: { flexShrink: 0 },
});

/**
 * Kitchen hero: swipe between up to three cover photos, with gold dots.
 * Falls back to the single cover (or monogram) when there's only one.
 * The dots sit near the top, at `dotsTop`, so they never cross the kitchen's name.
 */
export function CoverGallery({
  restaurant,
  width,
  height,
  dotsTop,
}: {
  restaurant: Restaurant;
  width: number;
  height: number;
  dotsTop: number;
}) {
  const [index, setIndex] = useState(0);
  const covers = restaurant.coverUris;
  // Fade into the page background; drawn under the dots so they stay visible.
  const fade = (
    <LinearGradient
      pointerEvents="none"
      colors={['rgba(10,9,7,0.5)', 'transparent', colors.bg]}
      locations={[0, 0.4, 1]}
      style={StyleSheet.absoluteFill}
    />
  );
  if (covers.length <= 1) {
    return (
      <View style={{ width, height }}>
        <RestaurantCover restaurant={restaurant} style={{ width, height }} monogramSize={120} />
        {fade}
      </View>
    );
  }
  return (
    <View style={{ width, height }}>
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => setIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
        onScroll={(e) => setIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
        scrollEventThrottle={64}
        accessibilityLabel={`Photo ${index + 1} of ${covers.length}`}>
        {covers.map((uri) => (
          <Photo key={uri} uri={uri} style={{ width, height }} />
        ))}
      </ScrollView>
      {fade}
      <View style={[galleryStyles.dots, { top: dotsTop }]} pointerEvents="none">
        {covers.map((uri, i) => (
          <View key={uri} style={[galleryStyles.dot, i === index && galleryStyles.dotOn]} />
        ))}
      </View>
    </View>
  );
}

const galleryStyles = StyleSheet.create({
  dots: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,245,224,0.45)' },
  dotOn: { width: 22, backgroundColor: colors.gold },
});
