import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { colors, fonts, spacing } from '@/theme';

/** "① Restaurant Details - - - ② Demographic Details" progress header. */
export function TwoStepHeader({ step, labels }: { step: 1 | 2; labels: [string, string] }) {
  return (
    <View style={styles.row} accessibilityLabel={`Step ${step} of 2: ${labels[step - 1]}`}>
      <Step n={1} label={labels[0]} state={step === 1 ? 'current' : 'done'} />
      <View style={styles.dash} />
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
          <MaterialCommunityIcons name="check" size={18} color={colors.white} />
        ) : (
          <Text style={styles.n}>{n}</Text>
        )}
      </View>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  step: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  circle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  n: { fontFamily: fonts.body, fontSize: 15, color: colors.text },
  label: { flexShrink: 1, fontFamily: fonts.body, fontSize: 15, color: colors.text },
  dash: { width: 40, borderTopWidth: 2, borderColor: colors.gold, borderStyle: 'dashed' },
});
