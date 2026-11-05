import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { formatMonthDay } from '@/lib/orders';
import { formatCents } from '@/lib/money';
import { colors, fonts, radius, spacing } from '@/theme';
import type { MenuItem, Order, Restaurant } from '@/types';

import { VerifiedSeal } from './chef';
import { PressableScale } from './motion';
import { RestaurantCover } from './restaurant-card';

/** "Order again" card: the kitchen, what you had, and a one-tap reorder. */
export function OrderAgainCard({
  order,
  restaurant,
  onReorder,
  onOpen,
}: {
  order: Order;
  restaurant: Restaurant;
  onReorder: () => void;
  onOpen: () => void;
}) {
  const summary = order.lines.map((l) => `${l.quantity} × ${l.name}`).join(', ');
  // Opening the kitchen and reordering are sibling buttons, never nested.
  return (
    <View style={styles.again}>
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={`${restaurant.name}. Last time: ${summary}`}
      onPress={onOpen}
      style={styles.againMain}>
      <RestaurantCover restaurant={restaurant} style={styles.againCover} monogramSize={34} />
      <View style={{ flex: 1, gap: 3 }}>
        <Text style={styles.againName} numberOfLines={1}>
          {restaurant.name}
        </Text>
        <Text style={styles.againSummary} numberOfLines={2}>
          {summary}
        </Text>
        <Text style={styles.againDate}>{formatMonthDay(order.createdAt)}</Text>
      </View>
    </PressableScale>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Reorder from ${restaurant.name}`}
        onPress={onReorder}
        hitSlop={6}
        style={({ pressed }) => [styles.reorder, pressed && { backgroundColor: colors.gold }]}>
        {({ pressed }) => (
          <MaterialCommunityIcons name="replay" size={18} color={pressed ? colors.onGold : colors.gold} />
        )}
      </Pressable>
    </View>
  );
}

/** Compact kitchen tile for the favorites row. */
export function MiniKitchenCard({ restaurant, onPress }: { restaurant: Restaurant; onPress: () => void }) {
  return (
    <PressableScale accessibilityRole="button" accessibilityLabel={restaurant.name} onPress={onPress} style={styles.mini}>
      <RestaurantCover restaurant={restaurant} style={styles.miniCover} monogramSize={40} />
      <View style={styles.miniInfo}>
        <View style={styles.row}>
          <Text style={styles.miniName} numberOfLines={1}>
            {restaurant.name}
          </Text>
          {restaurant.verified ? <VerifiedSeal size={13} /> : null}
        </View>
        <Text style={styles.miniCuisine} numberOfLines={1}>
          {restaurant.cuisine}
        </Text>
      </View>
    </PressableScale>
  );
}

/** One dish in search results. */
export function DishResult({
  item,
  restaurant,
  onPress,
}: {
  item: MenuItem;
  restaurant: Restaurant;
  onPress: () => void;
}) {
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={`${item.name} from ${restaurant.name}, ${formatCents(item.priceCents)}`}
      onPress={onPress}
      style={styles.dish}>
      {item.photoUri ? (
        <Image source={{ uri: item.photoUri }} style={styles.dishThumb} contentFit="cover" />
      ) : (
        <View style={[styles.dishThumb, styles.dishIcon]}>
          <MaterialCommunityIcons name="silverware-variant" size={20} color={colors.gold} />
        </View>
      )}
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={styles.dishName} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={styles.dishKitchen} numberOfLines={1}>
          {restaurant.name}
        </Text>
      </View>
      <Text style={styles.dishPrice}>{formatCents(item.priceCents)}</Text>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  again: {
    width: 290,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.sm + 2,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  againMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  againCover: { width: 64, height: 64, borderRadius: radius.md, overflow: 'hidden' },
  againName: { fontFamily: fonts.display, fontSize: 16, color: colors.ivory },
  againSummary: { fontFamily: fonts.body, fontSize: 12, color: colors.textMuted, lineHeight: 16 },
  againDate: { fontFamily: fonts.semibold, fontSize: 9, letterSpacing: 1.4, color: colors.gold, textTransform: 'uppercase' },
  reorder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mini: {
    width: 150,
    borderRadius: radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  miniCover: { width: '100%', height: 96 },
  miniInfo: { padding: spacing.sm + 2, gap: 2 },
  miniName: { fontFamily: fonts.display, fontSize: 15, color: colors.ivory, flexShrink: 1 },
  miniCuisine: { fontFamily: fonts.body, fontSize: 11, color: colors.textMuted },
  dish: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  dishThumb: { width: 48, height: 48, borderRadius: radius.md },
  dishIcon: {
    borderWidth: 1,
    borderColor: colors.hairline,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dishName: { fontFamily: fonts.display, fontSize: 16, color: colors.ivory },
  dishKitchen: { fontFamily: fonts.body, fontSize: 12, color: colors.textMuted },
  dishPrice: { fontFamily: fonts.semibold, fontSize: 13, color: colors.gold },
});
