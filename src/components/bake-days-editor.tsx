import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { CLOSE_DAYS_OPTIONS, DEFAULT_CLOSE_DAYS, describeCutoff, timeRange } from '@/lib/bake-days';
import { capitalize, formatTime, TIME_SLOTS, toMinutes, WEEKDAYS } from '@/lib/hours';
import { colors, fonts, radius, spacing } from '@/theme';
import type { BakeDaySchedule, Weekday } from '@/types';

import { Icon } from './icon';
import { OptionSheet } from './option-sheet';
import { Chip, FieldLabel, GoldButton, PickerField } from './ui';

/** Most weekly bake days a kitchen can have. */
export const MAX_BAKE_DAYS = 3;

const TIME_OPTIONS = TIME_SLOTS.map((t) => ({ value: t, label: formatTime(t) }));

/**
 * The cook's weekly bake days: each one a pickup day, a pickup window and
 * how early orders close. Lists the ones set, with a short form to add more.
 */
export function BakeDaysEditor({
  value,
  onChange,
  error,
}: {
  value: BakeDaySchedule[];
  onChange: (next: BakeDaySchedule[]) => void;
  error?: string;
}) {
  // Start the form on a day the cook doesn't bake yet, weekends first.
  const [day, setDay] = useState<Weekday>(
    () => (['saturday', 'sunday', 'friday', ...WEEKDAYS] as Weekday[]).find((d) => !value.some((b) => b.day === d)) ?? 'saturday',
  );
  const [start, setStart] = useState('09:00');
  const [end, setEnd] = useState('12:00');
  const [closeDays, setCloseDays] = useState<number>(DEFAULT_CLOSE_DAYS);
  const [sheet, setSheet] = useState<'start' | 'end' | null>(null);
  const [formError, setFormError] = useState('');
  const taken = new Set(value.map((b) => b.day));
  const full = value.length >= MAX_BAKE_DAYS;

  const add = () => {
    if (taken.has(day)) return setFormError(`You already bake on ${capitalize(day)}s.`);
    if (toMinutes(start) >= toMinutes(end)) return setFormError('Pickup has to end after it starts.');
    setFormError('');
    const next = [...value, { day, pickupStart: start, pickupEnd: end, closeDaysBefore: closeDays }];
    onChange(next.sort((a, b) => WEEKDAYS.indexOf(a.day) - WEEKDAYS.indexOf(b.day)));
    const free = WEEKDAYS.find((d) => d !== day && !taken.has(d));
    if (free) setDay(free);
  };

  return (
    <View style={{ gap: spacing.md }}>
      {value.map((b) => (
        <View key={b.day} style={styles.row}>
          <Icon name="calendar-clock" size={20} color={colors.gold} />
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={styles.rowTitle}>
              {capitalize(b.day)}s · pickup {timeRange(b.pickupStart, b.pickupEnd)}
            </Text>
            <Text style={styles.rowBody}>Orders close {describeCutoff(b.closeDaysBefore)}</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Remove ${capitalize(b.day)} bake day`}
            hitSlop={10}
            onPress={() => onChange(value.filter((x) => x.day !== b.day))}>
            <Icon name="close" size={18} color={colors.textMuted} />
          </Pressable>
        </View>
      ))}
      {error && !value.length ? <Text style={styles.error}>{error}</Text> : null}

      {full ? null : (
        <View style={styles.form}>
          <Text style={styles.formTitle}>{value.length ? 'Add another bake day' : 'Add your bake day'}</Text>
          <FieldLabel>Pickup day</FieldLabel>
          <View style={styles.chips}>
            {WEEKDAYS.map((d) => (
              <Chip
                key={d}
                label={capitalize(d).slice(0, 3)}
                selected={d === day}
                onPress={() => setDay(d)}
              />
            ))}
          </View>
          <View style={styles.pair}>
            <PickerField
              containerStyle={{ flex: 1 }}
              label="Pickup from"
              placeholder="Start"
              icon="clock-outline"
              value={formatTime(start)}
              onPress={() => setSheet('start')}
            />
            <PickerField
              containerStyle={{ flex: 1 }}
              label="Until"
              placeholder="End"
              icon="clock-outline"
              value={formatTime(end)}
              onPress={() => setSheet('end')}
            />
          </View>
          <FieldLabel>Orders close</FieldLabel>
          <View style={styles.chips}>
            {CLOSE_DAYS_OPTIONS.map((n) => (
              <Chip key={n} label={describeCutoff(n)} selected={n === closeDays} onPress={() => setCloseDays(n)} />
            ))}
          </View>
          {formError ? <Text style={styles.error}>{formError}</Text> : null}
          <GoldButton title="Add bake day" variant="outline" onPress={add} />
        </View>
      )}

      <OptionSheet
        visible={sheet !== null}
        title={sheet === 'end' ? 'Pickup until' : 'Pickup from'}
        options={TIME_OPTIONS}
        selected={[sheet === 'end' ? end : start]}
        onSelect={([t]) => {
          if (!t) return;
          if (sheet === 'end') setEnd(t);
          else setStart(t);
        }}
        onClose={() => setSheet(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  rowTitle: { fontFamily: fonts.semibold, fontSize: 15, color: colors.ivory },
  rowBody: { fontFamily: fonts.body, fontSize: 13, color: colors.textMuted },
  form: {
    gap: spacing.sm + 2,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  formTitle: { fontFamily: fonts.semibold, fontSize: 15, color: colors.ivory },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  pair: { flexDirection: 'row', gap: spacing.md },
  error: { fontFamily: fonts.body, color: colors.danger, fontSize: 13 },
});
