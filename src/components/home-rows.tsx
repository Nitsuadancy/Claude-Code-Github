import { Pressable, StyleSheet, Text, View } from 'react-native';

import { formatMonthDay } from '@/lib/orders';
import { formatCents } from '@/lib/money';
import { colors, fonts, radius, spacing } from '@/theme';
import type { MenuItem, Order, Restaurant } from '@/types';

import { VerifiedSeal } from './chef';
import { PressableScale } from './motion';
import { RestaurantCover } from './restaurant-card';
import { Icon } from './icon';
import { Photo } from './photo';

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
        style={({ pressed }) => [styles.reorder, pressed && { opacity: 0.6 }]}>
        <Text style={styles.reorderText}>Reorder</Text>
      </Pressable>
    </View>
  );
}

/** A tall pick for the "For you" row, with the reason it was picked. */
export function ForYouCard({
  restaurant,
  reason,
  onPress,
}: {
  restaurant: Restaurant;
  reason: string;
  onPress: () => void;
}) {
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={`${restaurant.name}. ${reason}`}
      onPress={onPress}
      style={styles.pick}>
      <RestaurantCover restaurant={restaurant} style={styles.pickCover} monogramSize={48} />
      <View style={{ gap: 3 }}>
        <Text style={styles.pickName} numberOfLines={1}>
          {restaurant.name}
        </Text>
        <Text style={styles.pickReason} numberOfLines={1}>
          {reason}
        </Text>
      </View>
    </PressableScale>
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
        <Photo uri={item.photoUri} style={styles.dishThumb} />
      ) : (
        <View style={[styles.dishThumb, styles.dishIcon]}>
          <Icon name="silverware-variant" size={20} color={colors.gold} />
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
  pick: { width: 172, gap: spacing.sm + 2 },
  pickCover: { width: 172, height: 216, borderRadius: radius.md, overflow: 'hidden' },
  pickName: { fontFamily: fonts.display, fontSize: 16, letterSpacing: -0.3, color: colors.ivory },
  pickReason: { fontFamily: fonts.medium, fontSize: 12, color: colors.gold },
  row: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  again: {
    width: 290,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.sm + 2,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
  },
  againMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  againCover: { width: 64, height: 64, borderRadius: radius.md, overflow: 'hidden' },
  againName: { fontFamily: fonts.display, fontSize: 17, color: colors.ivory },
  againSummary: { fontFamily: fonts.body, fontSize: 12, color: colors.textMuted, lineHeight: 16 },
  againDate: { fontFamily: fonts.mono, fontSize: 11, color: colors.textFaint },
  reorder: { paddingVertical: spacing.sm, paddingHorizontal: spacing.xs },
  reorderText: { fontFamily: fonts.semibold, fontSize: 12, letterSpacing: 1.2, textTransform: 'uppercase', color: colors.gold },
  mini: { width: 150, gap: spacing.sm },
  miniCover: { width: '100%', height: 110, borderRadius: radius.md, overflow: 'hidden' },
  miniInfo: { gap: 2 },
  miniName: { fontFamily: fonts.display, fontSize: 16, color: colors.ivory, flexShrink: 1 },
  miniCuisine: { fontFamily: fonts.body, fontSize: 12, color: colors.textMuted },
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
  dishName: { fontFamily: fonts.display, fontSize: 17, color: colors.ivory },
  dishKitchen: { fontFamily: fonts.body, fontSize: 12, color: colors.textMuted },
  dishPrice: { fontFamily: fonts.medium, fontSize: 14, color: colors.text },
});
