import { StyleSheet, Text, View } from 'react-native';

import { colors, fonts, spacing } from '@/theme';
import { Icon } from './icon';

/** "① Kitchen details —— ② Location & hours" progress header. */
export function TwoStepHeader({ step, labels }: { step: 1 | 2; labels: [string, string] }) {
  return (
    <View style={styles.row} accessibilityLabel={`Step ${step} of 2: ${labels[step - 1]}`}>
      <Step n={1} label={labels[0]} state={step === 1 ? 'current' : 'done'} />
      <View style={[styles.line, step === 2 && { backgroundColor: colors.gold }]} />
      <Step n={2} label={labels[1]} state={step === 2 ? 'current' : 'todo'} />
    </View>
  );
}

function Step({ n, label, state }: { n: number; label: string; state: 'current' | 'done' | 'todo' }) {
  return (
    <View style={styles.step}>
      <View
        style={[
          styles.circle,
          state !== 'todo' && { borderColor: colors.gold },
          state === 'done' && { backgroundColor: colors.gold },
        ]}>
        {state === 'done' ? (
          <Icon name="check" size={16} color={colors.onGold} />
        ) : (
          <Text style={[styles.n, state === 'current' && { color: colors.gold }]}>{n}</Text>
        )}
      </View>
      <Text style={[styles.label, state === 'todo' && { color: colors.textFaint }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  step: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexShrink: 1 },
  circle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  n: { fontFamily: fonts.semibold, fontSize: 13, color: colors.textMuted },
  label: { flexShrink: 1, fontFamily: fonts.medium, fontSize: 13, color: colors.text },
  line: { flex: 1, minWidth: 16, height: 1, backgroundColor: colors.borderStrong },
});
