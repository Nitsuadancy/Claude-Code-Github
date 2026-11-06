import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';

import * as haptics from '@/lib/haptics';
import { remainingToday } from '@/lib/limits';
import { formatCents } from '@/lib/money';
import { colors, fonts, radius, spacing, webSwitchThumb } from '@/theme';
import type { Order, Restaurant } from '@/types';

/**
 * The chef's daily controls: what's left of each dish today, and a switch to
 * take a dish off the menu (sold out, or not baking today) without editing it.
 */
export function TodayMenu({
  restaurant,
  orders,
  onMenuChange,
  onEdit,
  day,
}: {
  restaurant: Restaurant;
  orders: Order[];
  /** The day limits count toward, e.g. the next bake day. Today when unset. */
  day?: { date: Date; label: string };
  /** Receives the whole menu with one dish switched on or off. */
  onMenuChange: (menu: Restaurant['menu']) => void;
  onEdit: () => void;
}) {
  const cookDay = day?.date ?? new Date();
  const when = day?.label ?? 'today';
  const setAvailable = (id: string, available: boolean) => {
    haptics.tap();
    onMenuChange(restaurant.menu.map((m) => (m.id === id ? { ...m, available } : m)));
  };
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>{day ? `Menu for ${day.label}` : 'Today’s menu'}</Text>
        <Pressable accessibilityRole="button" onPress={onEdit} hitSlop={10}>
          <Text style={styles.edit}>Edit menu</Text>
        </Pressable>
      </View>
      {restaurant.menu.map((item, i) => {
        const left = remainingToday(item, orders, restaurant.id, cookDay);
        const status = !item.available
          ? `Off for ${when}`
          : left === null
            ? 'No daily limit'
            : left === 0
              ? `Sold out for ${when}`
              : `${left} left for ${when}`;
        return (
          <View key={item.id} style={[styles.row, i > 0 && styles.rowRule]}>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={[styles.name, !item.available && { color: colors.textMuted }]} numberOfLines={1}>
                {item.name}
              </Text>
              <Text style={[styles.status, left === 0 && item.available && { color: colors.gold }]}>
                {formatCents(item.priceCents)} · {status}
              </Text>
            </View>
            <Switch
              accessibilityLabel={`${item.name}: ${item.available ? 'on the menu today' : 'off today'}`}
              value={item.available}
              onValueChange={(on) => setAvailable(item.id, on)}
              trackColor={{ true: colors.gold, false: colors.borderStrong }}
              thumbColor={colors.ivory}
              {...webSwitchThumb}
            />
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, gap: spacing.sm },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xs },
  title: { fontFamily: fonts.semibold, fontSize: 17, color: colors.ivory },
  edit: { fontFamily: fonts.semibold, fontSize: 14, color: colors.gold },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm },
  rowRule: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  name: { fontFamily: fonts.medium, fontSize: 15, color: colors.text },
  status: { fontFamily: fonts.body, fontSize: 13, color: colors.textMuted },
});
