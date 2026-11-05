import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, fonts, radius, spacing } from '@/theme';

import { Eyebrow, GoldButton, Heading } from './ui';

export interface CoachStep {
  title: string;
  body: string;
}

/** First-visit walkthrough on the Foodie home screen. */
export function CoachMarks({
  steps,
  visible,
  onDone,
}: {
  steps: CoachStep[];
  visible: boolean;
  onDone: () => void;
}) {
  const [index, setIndex] = useState(0);
  const step = steps[index];
  const last = index === steps.length - 1;
  if (!step) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDone}>
      <View style={styles.backdrop}>
        <View style={styles.card} accessibilityViewIsModal>
          <Eyebrow>
            Tip {index + 1} of {steps.length}
          </Eyebrow>
          <Heading size={24}>{step.title}</Heading>
          <Text style={styles.body}>{step.body}</Text>
          <View style={styles.dots}>
            {steps.map((s, i) => (
              <View key={s.title} style={[styles.dot, i === index && styles.dotActive]} />
            ))}
          </View>
          <View style={styles.footer}>
            <Pressable accessibilityRole="button" onPress={onDone} hitSlop={8} style={styles.skip}>
              <Text style={styles.skipText}>Skip</Text>
            </Pressable>
            <GoldButton
              title={last ? 'Start exploring' : 'Next'}
              fullWidth={false}
              onPress={() => (last ? onDone() : setIndex(index + 1))}
              style={{ flex: 1 }}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.hairline,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  body: { fontFamily: fonts.body, fontSize: 15, color: colors.textMuted, lineHeight: 22 },
  dots: { flexDirection: 'row', gap: 6, marginTop: spacing.sm },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.borderStrong },
  dotActive: { width: 24, backgroundColor: colors.gold },
  footer: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.sm },
  skip: { paddingHorizontal: spacing.md, minHeight: 44, justifyContent: 'center' },
  skipText: { fontFamily: fonts.medium, fontSize: 15, color: colors.textMuted },
});
