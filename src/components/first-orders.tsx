import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { FirstOrderStep } from '@/lib/launch';
import { colors, fonts, radius, spacing } from '@/theme';

import { Icon } from './icon';

/**
 * "Get your first order": a short checklist that replaces the empty sales
 * charts until a new kitchen's first order arrives.
 */
export function FirstOrders({ steps, onStep }: { steps: FirstOrderStep[]; onStep: (step: FirstOrderStep) => void }) {
  const done = steps.filter((s) => s.done).length;
  const allDone = done === steps.length;
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>Get your first order</Text>
        <Text style={styles.count}>
          {done} of {steps.length}
        </Text>
      </View>
      <View style={styles.bar}>
        <View style={[styles.barFill, { width: `${(done / steps.length) * 100}%` }]} />
      </View>
      {allDone ? (
        <Text style={styles.allDone}>
          You’re all set. Keep sharing your link, and post again the day you bake. New orders show up below.
        </Text>
      ) : null}
      {steps.map((step) => (
        <Pressable
          key={step.id}
          accessibilityRole="button"
          accessibilityState={{ checked: step.done }}
          accessibilityLabel={`${step.title}${step.done ? ', done' : ''}`}
          onPress={() => onStep(step)}
          style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}>
          <Icon
            name={step.done ? 'check-circle' : 'checkbox-blank-circle-outline'}
            size={24}
            color={step.done ? colors.gold : colors.borderStrong}
          />
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={[styles.stepTitle, step.done && styles.stepTitleDone]}>{step.title}</Text>
            {!step.done ? <Text style={styles.stepBody}>{step.body}</Text> : null}
          </View>
          {!step.done ? <Icon name="chevron-right" size={18} color={colors.textMuted} /> : null}
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md + 2, gap: spacing.sm },
  header: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  title: { fontFamily: fonts.semibold, fontSize: 18, color: colors.ivory },
  count: { fontFamily: fonts.medium, fontSize: 13, color: colors.textMuted },
  bar: { height: 4, borderRadius: 2, backgroundColor: colors.border, overflow: 'hidden', marginBottom: spacing.xs },
  barFill: { height: 4, backgroundColor: colors.gold },
  allDone: { fontFamily: fonts.body, fontSize: 14, lineHeight: 20, color: colors.text },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm },
  stepTitle: { fontFamily: fonts.medium, fontSize: 15, color: colors.ivory },
  stepTitleDone: { color: colors.textMuted, textDecorationLine: 'line-through' },
  stepBody: { fontFamily: fonts.body, fontSize: 13, lineHeight: 18, color: colors.textMuted },
});
