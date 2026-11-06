import { StyleSheet, Text, View } from 'react-native';

import type { DayEarnings, PrepItem } from '@/lib/insights';
import { formatCents } from '@/lib/money';
import { colors, fonts, radius, spacing } from '@/theme';

import { Eyebrow } from './ui';

const CHART_HEIGHT = 96;

/** Seven slim gold bars of completed sales, today highlighted. */
export function WeeklyChart({ days }: { days: DayEarnings[] }) {
  const total = days.reduce((sum, d) => sum + d.cents, 0);
  const max = Math.max(...days.map((d) => d.cents), 1);
  const best = days.reduce((a, b) => (b.cents > a.cents ? b : a), days[0]);
  return (
    <View
      style={styles.card}
      accessible
      accessibilityLabel={`This week: ${formatCents(total)} in completed sales. ${days
        .map((d) => `${d.label} ${formatCents(d.cents)}`)
        .join(', ')}`}>
      <View style={styles.header}>
        <View style={{ gap: 2 }}>
          <Eyebrow>This week</Eyebrow>
          <Text style={styles.total}>{formatCents(total)}</Text>
        </View>
        {total > 0 ? (
          <Text style={styles.best}>Best day: {best.label}</Text>
        ) : (
          <Text style={styles.best}>Completed orders show up here</Text>
        )}
      </View>
      <View style={styles.chart}>
        {days.map((d, i) => {
          const h = d.cents === 0 ? 3 : Math.max(8, (d.cents / max) * CHART_HEIGHT);
          return (
            <View key={i} style={styles.col}>
              <View style={styles.barTrack}>
                <View
                  style={[
                    styles.bar,
                    { height: h, backgroundColor: d.isToday ? colors.gold : d.cents ? colors.goldDeep : colors.border },
                  ]}
                />
              </View>
              <Text style={[styles.day, d.isToday && { color: colors.gold }]}>{d.label}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

/** "What to cook now": portions summed across open orders. */
export function PrepList({ items }: { items: PrepItem[] }) {
  return (
    <View style={styles.card}>
      {items.map((item, i) => (
        <View key={item.itemId} style={[styles.prepRow, i > 0 && styles.prepBorder]}>
          <View style={styles.count}>
            <Text style={styles.countText}>{item.toCook || item.pending}</Text>
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={styles.prepName}>{item.name}</Text>
            <Text style={styles.prepMeta}>
              {item.toCook ? `${item.toCook} to cook` : ''}
              {item.toCook && item.pending ? ' · ' : ''}
              {item.pending ? `${item.pending} awaiting your OK` : ''}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.md,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  total: { fontFamily: fonts.display, fontSize: 26, color: colors.ivory },
  best: { fontFamily: fonts.medium, fontSize: 12, color: colors.textMuted },
  chart: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-end' },
  col: { flex: 1, alignItems: 'center', gap: 6 },
  barTrack: { height: CHART_HEIGHT, justifyContent: 'flex-end', width: '100%', alignItems: 'center' },
  bar: { width: '70%', maxWidth: 22, borderRadius: 4 },
  day: { fontFamily: fonts.medium, fontSize: 10, color: colors.textMuted, letterSpacing: 0.4 },
  prepRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xs },
  prepBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderColor: colors.border, paddingTop: spacing.sm + 2 },
  count: {
    minWidth: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  countText: { fontFamily: fonts.display, fontSize: 18, color: colors.gold },
  prepName: { fontFamily: fonts.display, fontSize: 17, color: colors.ivory },
  prepMeta: { fontFamily: fonts.body, fontSize: 12, color: colors.textMuted },
});
