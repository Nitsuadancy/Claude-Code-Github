import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  type BakeDay,
  type BakeDayStatus,
  bakeDayDate,
  formatBakeDay,
  formatCutoff,
} from '@/lib/bake-days';
import { colors, fonts, radius, spacing } from '@/theme';
import { Toggle } from './ui';

/**
 * The cook's next bake day: how many orders are in, whether ordering is still
 * open, and a way to skip the week. Skipped days can be brought back.
 */
export function BakeDayCard({
  status,
  skipped,
  accepting,
  now,
  onToggleAccepting,
  onSkip,
  onUnskip,
}: {
  status: BakeDayStatus | null;
  skipped: BakeDay[];
  accepting: boolean;
  now: Date;
  onToggleAccepting: (accepting: boolean) => void;
  onSkip: (day: BakeDay, orderCount: number) => void;
  onUnskip: (day: BakeDay) => void;
}) {
  const live = accepting && (status?.phase === 'open' || status?.phase === 'pickup');
  const title = !accepting
    ? 'Paused'
    : !status
      ? 'No bake days coming up'
      : status.phase === 'open'
        ? `Taking orders for ${bakeDayDate(status.day, now)}`
        : status.phase === 'baking'
          ? 'Orders closed. Time to bake!'
          : 'Pickup is on';
  const detail = !status
    ? 'Add a bake day in Kitchen details.'
    : status.phase === 'open'
      ? `${formatCutoff(status.day, now)} · ${formatBakeDay(status.day, now)}`
      : formatBakeDay(status.day, now);

  return (
    <View style={[styles.card, live && { borderColor: colors.success }]}>
      <View style={styles.top}>
        <View style={[styles.dot, { backgroundColor: live ? colors.success : colors.textFaint }]} />
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.detail}>{detail}</Text>
        </View>
        <Toggle
          accessibilityLabel="Accepting orders"
          value={accepting}
          onValueChange={onToggleAccepting}
        />
      </View>
      {status ? (
        <View style={styles.bottom}>
          <Text style={styles.count}>
            <Text style={styles.countNumber}>{status.orderCount}</Text>{' '}
            {status.orderCount === 1 ? 'order' : 'orders'} so far
          </Text>
          {status.phase === 'open' ? (
            <Pressable accessibilityRole="button" hitSlop={8} onPress={() => onSkip(status.day, status.orderCount)}>
              <Text style={styles.link}>Skip this bake day</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
      {skipped.map((day) => (
        <View key={day.date} style={styles.skipped}>
          <Text style={styles.skippedText}>Skipping {bakeDayDate(day, now)}</Text>
          <Pressable accessibilityRole="button" hitSlop={8} onPress={() => onUnskip(day)}>
            <Text style={styles.link}>Undo</Text>
          </Pressable>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: 'transparent',
    padding: spacing.md,
    gap: spacing.md,
  },
  top: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  dot: { width: 10, height: 10, borderRadius: 5 },
  title: { fontFamily: fonts.semibold, fontSize: 17, color: colors.ivory },
  detail: { fontFamily: fonts.body, fontSize: 13, lineHeight: 18, color: colors.textMuted },
  bottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.sm + 4,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  count: { fontFamily: fonts.body, fontSize: 14, color: colors.textMuted },
  countNumber: { fontFamily: fonts.semibold, fontSize: 16, color: colors.ivory, fontVariant: ['tabular-nums'] },
  link: { fontFamily: fonts.semibold, fontSize: 13, color: colors.gold },
  skipped: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  skippedText: { fontFamily: fonts.body, fontSize: 13, color: colors.textMuted },
});
