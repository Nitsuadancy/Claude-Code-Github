import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, fonts, goldGlow, radius, spacing } from '@/theme';

export interface CoachStep {
  title: string;
  body: string;
}

/** First-visit walkthrough ("Explore Food Categories" tooltip in the mockup). */
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
          <Text style={styles.title}>{step.title}</Text>
          <Text style={styles.body}>{step.body}</Text>
          <View style={styles.footer}>
            <View style={styles.dots}>
              {steps.map((s, i) => (
                <View key={s.title} style={[styles.dot, i === index && styles.dotActive]} />
              ))}
            </View>
            <Pressable accessibilityRole="button" onPress={onDone} hitSlop={8}>
              <Text style={styles.skip}>Skip</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={() => (last ? onDone() : setIndex(index + 1))}
              style={styles.next}>
              <Text style={styles.nextText}>{last ? 'Done' : 'Next'}</Text>
            </Pressable>
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
    justifyContent: 'center',
    padding: spacing.lg,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.gold,
    padding: spacing.lg,
    gap: spacing.md,
  },
  title: { fontFamily: fonts.headingSemi, fontSize: 22, color: colors.text },
  body: { fontFamily: fonts.body, fontSize: 16, color: colors.textMuted, lineHeight: 22 },
  footer: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  dots: { flex: 1, flexDirection: 'row', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.border },
  dotActive: { width: 28, backgroundColor: colors.gold },
  skip: { fontFamily: fonts.bodySemi, fontSize: 17, color: colors.text },
  next: {
    borderWidth: 1.5,
    borderColor: colors.gold,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
    backgroundColor: colors.white,
    ...goldGlow,
    shadowOpacity: 0.3,
  },
  nextText: { fontFamily: fonts.button, fontSize: 18, color: colors.text },
});
