import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { CATEGORIES } from '@/data/categories';
import { formatTime, isOpenAt } from '@/lib/hours';
import { colors, fonts, radius, spacing } from '@/theme';
import type { Restaurant } from '@/types';

export function RestaurantCover({
  restaurant,
  style,
  iconSize = 48,
}: {
  restaurant: Restaurant;
  style?: object;
  iconSize?: number;
}) {
  const cover = restaurant.coverUris[0];
  if (cover) {
    return <Image source={{ uri: cover }} style={style} contentFit="cover" accessibilityIgnoresInvertColors />;
  }
  const icon =
    CATEGORIES.find((c) => c.id === restaurant.categories[0])?.icon ?? 'silverware-variant';
  return (
    <LinearGradient colors={['#2A1E08', '#5A3F0B']} style={[style, styles.placeholder]}>
      <MaterialCommunityIcons name={icon} size={iconSize} color={colors.goldLight} />
    </LinearGradient>
  );
}

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
  const open = restaurant.acceptingOrders && isOpenAt(restaurant, now);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${restaurant.name}, ${restaurant.cuisine}, rated ${restaurant.rating}, ${open ? 'open now' : 'closed'}`}
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }]}>
      <RestaurantCover restaurant={restaurant} style={styles.cover} />
      <View style={styles.info}>
        <View style={styles.titleRow}>
          <Text style={styles.name} numberOfLines={2}>
            {restaurant.name}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={favorite ? 'Remove from favorites' : 'Add to favorites'}
            hitSlop={10}
            onPress={onToggleFavorite}>
            <MaterialCommunityIcons
              name={favorite ? 'heart' : 'heart-outline'}
              size={26}
              color={favorite ? colors.danger : colors.border}
            />
          </Pressable>
        </View>
        <Text style={styles.cuisine} numberOfLines={1}>
          {restaurant.cuisine}
        </Text>
        <View style={styles.metaRow}>
          <MaterialCommunityIcons name="star" size={16} color={colors.gold} />
          <Text style={styles.meta}>
            {formatRating(restaurant)}
          </Text>
          {restaurant.hasOffer ? <Text style={styles.offer}>Offer</Text> : null}
        </View>
        <Text style={[styles.meta, { color: open ? colors.success : colors.textMuted }]}>
          {open
            ? `Open · until ${formatTime(restaurant.closeTime)}`
            : `Closed · opens ${formatTime(restaurant.openTime)}`}
        </Text>
      </View>
    </Pressable>
  );
}

/** "4.6 (128)", or "New" before the first rating. */
export function formatRating(r: Restaurant, long = false): string {
  if (r.ratingCount === 0) return 'New';
  return `${r.rating.toFixed(1)} (${r.ratingCount}${long ? ' ratings' : ''})`;
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    borderWidth: 1.5,
    borderColor: colors.gold,
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: colors.white,
    minHeight: 132,
  },
  cover: { width: 120, alignSelf: 'stretch' },
  placeholder: { alignItems: 'center', justifyContent: 'center' },
  info: { flex: 1, padding: spacing.md, gap: 4 },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  name: { flex: 1, fontFamily: fonts.headingSemi, fontSize: 19, color: colors.text },
  cuisine: { fontFamily: fonts.body, fontSize: 15, color: colors.gold },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  meta: { fontFamily: fonts.body, fontSize: 13, color: colors.textMuted },
  offer: {
    marginLeft: spacing.sm,
    fontFamily: fonts.bodySemi,
    fontSize: 12,
    color: colors.goldDark,
    backgroundColor: colors.goldTint,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
});
