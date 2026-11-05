import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { Pressable, ScrollView, type StyleProp, StyleSheet, Text, View, type ViewStyle } from 'react-native';

import { formatTime, isOpenAt } from '@/lib/hours';
import { colors, fonts, radius, spacing } from '@/theme';
import type { Restaurant } from '@/types';

import { VerifiedSeal } from './chef';
import { PressableScale } from './motion';
import { Badge } from './ui';

const RAYS = require('@/assets/images/rays.png');

/** "4.6 (128)", or "New" before the first rating. */
export function formatRating(r: Restaurant, long = false): string {
  if (r.ratingCount === 0) return 'New';
  const noun = r.ratingCount === 1 ? ' rating' : ' ratings';
  return `${r.rating.toFixed(1)} (${r.ratingCount}${long ? noun : ''})`;
}

/** True once the chef has set valid opening and closing times. */
export function hasHours(r: Restaurant): boolean {
  const valid = (t: string) => /^\d{1,2}:\d{2}$/.test(t);
  return valid(r.openTime) && valid(r.closeTime);
}

export function isOpenNow(r: Restaurant, now: Date): boolean {
  return r.acceptingOrders && hasHours(r) && isOpenAt(r, now);
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
        <Image source={{ uri: cover }} style={StyleSheet.absoluteFill} contentFit="cover" transition={250} />
      </View>
    );
  }
  const initial = restaurant.name.trim().charAt(0).toUpperCase() || 'M';
  return (
    <LinearGradient colors={['#221D13', '#0E0C09']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[style, styles.monogramWrap]}>
      <Image source={RAYS} style={styles.monogramRays} contentFit="contain" />
      <Text style={[styles.monogram, { fontSize: monogramSize, lineHeight: monogramSize * 1.2 }]}>{initial}</Text>
    </LinearGradient>
  );
}

/** Full-width card for the "All Kitchens" feed. */
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
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={`${restaurant.name}, ${restaurant.cuisine}, ${formatRating(restaurant, true)}, ${open ? 'open now' : 'closed'}`}
      onPress={onPress}
      style={styles.card}>
      <View>
        <RestaurantCover restaurant={restaurant} style={styles.cover} />
        <LinearGradient colors={['transparent', 'rgba(10,9,7,0.85)']} style={styles.coverFade} />
        <View style={styles.coverTop}>
          {open ? <Badge label="Open now" tone="success" /> : <Badge label="Closed" tone="muted" />}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={favorite ? 'Remove from favorites' : 'Add to favorites'}
            hitSlop={10}
            onPress={onToggleFavorite}
            style={styles.heart}>
            <MaterialCommunityIcons
              name={favorite ? 'heart' : 'heart-outline'}
              size={20}
              color={favorite ? colors.gold : colors.ivory}
            />
          </Pressable>
        </View>
      </View>
      <View style={styles.info}>
        <Text style={styles.cuisine} numberOfLines={1}>
          {restaurant.cuisine}
        </Text>
        <View style={styles.nameRow}>
          <Text style={[styles.name, { flexShrink: 1 }]} numberOfLines={1}>
            {restaurant.name}
          </Text>
          {restaurant.verified ? <VerifiedSeal /> : null}
        </View>
        <View style={styles.metaRow}>
          <MaterialCommunityIcons name="star" size={14} color={colors.gold} />
          <Text style={[styles.meta, styles.noShrink]} numberOfLines={1}>{formatRating(restaurant)}</Text>
          <Text style={styles.metaDot}>·</Text>
          <Text style={styles.meta} numberOfLines={1}>
            {open
              ? `~${restaurant.prepMinutes} min`
              : hasHours(restaurant)
                ? `Opens ${formatTime(restaurant.openTime)}`
                : 'Hours not set'}
          </Text>
          <Text style={styles.metaDot}>·</Text>
          <Text style={styles.meta} numberOfLines={1}>
            by {restaurant.chefName}
          </Text>
          {restaurant.hasOffer ? (
            <View style={{ marginLeft: 'auto' }}>
              <Badge label="Offer" />
            </View>
          ) : null}
        </View>
      </View>
    </PressableScale>
  );
}

/** Tall card for the horizontal "Tonight's table" carousel. */
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
      style={[styles.featured, { width }]}>
      <RestaurantCover restaurant={restaurant} style={StyleSheet.absoluteFill} monogramSize={88} />
      <LinearGradient colors={['transparent', 'rgba(10,9,7,0.95)']} style={styles.featuredFade} />
      <View style={styles.featuredInfo}>
        <Text style={styles.cuisine}>{restaurant.cuisine}</Text>
        <View style={styles.nameRow}>
          <Text style={[styles.name, { fontSize: 22, flexShrink: 1 }]} numberOfLines={2}>
            {restaurant.name}
          </Text>
          {restaurant.verified ? <VerifiedSeal /> : null}
        </View>
        <View style={styles.metaRow}>
          <MaterialCommunityIcons name="star" size={14} color={colors.gold} />
          <Text style={[styles.meta, styles.noShrink]} numberOfLines={1}>{formatRating(restaurant)}</Text>
          <Text style={styles.metaDot}>·</Text>
          <Text style={styles.meta}>~{restaurant.prepMinutes} min</Text>
        </View>
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cover: { width: '100%', aspectRatio: 16 / 9 },
  coverFade: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '50%' },
  coverTop: {
    position: 'absolute',
    top: spacing.md,
    left: spacing.md,
    right: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  heart: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(10,9,7,0.6)',
    borderWidth: 1,
    borderColor: 'rgba(255,245,224,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  monogramWrap: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  monogramRays: { position: 'absolute', width: 340, height: 340, opacity: 0.35 },
  monogram: { fontFamily: fonts.display, color: colors.ivory },
  info: { padding: spacing.md, paddingTop: spacing.sm + 2, gap: 4 },
  cuisine: {
    fontFamily: fonts.semibold,
    fontSize: 10,
    letterSpacing: 1.8,
    textTransform: 'uppercase',
    color: colors.gold,
  },
  name: { fontFamily: fonts.display, fontSize: 21, color: colors.ivory },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  meta: { fontFamily: fonts.body, fontSize: 12, color: colors.textMuted, flexShrink: 1 },
  metaDot: { color: colors.textFaint, fontSize: 12 },
  noShrink: { flexShrink: 0 },
  featured: {
    height: 250,
    borderRadius: radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.hairline,
    justifyContent: 'flex-end',
    backgroundColor: colors.surface,
  },
  featuredFade: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '65%' },
  featuredInfo: { padding: spacing.md, gap: 4 },
});

/**
 * Restaurant hero: swipe between up to three cover photos, with gold dots.
 * Falls back to the single cover (or monogram) when there's only one.
 */
export function CoverGallery({
  restaurant,
  width,
  height,
}: {
  restaurant: Restaurant;
  width: number;
  height: number;
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
          <Image key={uri} source={{ uri }} style={{ width, height }} contentFit="cover" transition={250} />
        ))}
      </ScrollView>
      {fade}
      <View style={galleryStyles.dots} pointerEvents="none">
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
    bottom: 56,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,245,224,0.45)' },
  dotOn: { width: 22, backgroundColor: colors.gold },
});
