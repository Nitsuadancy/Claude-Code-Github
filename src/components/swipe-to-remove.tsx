import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import Swipeable from 'react-native-gesture-handler/ReanimatedSwipeable';

import { Icon } from '@/components/icon';
import { colors, fonts, spacing } from '@/theme';

/**
 * Swipe a row left to reveal Remove; a long swipe removes it straight away.
 * The row's own buttons still work, so this is a shortcut, never the only way.
 */
export function SwipeToRemove({
  label,
  onRemove,
  children,
}: {
  /** What is removed, for screen readers, e.g. "Almond Biscotti". */
  label: string;
  onRemove: () => void;
  children: ReactNode;
}) {
  return (
    <Swipeable
      friction={1.6}
      rightThreshold={56}
      overshootRight={false}
      onSwipeableOpen={onRemove}
      renderRightActions={() => (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Remove ${label}`}
          onPress={onRemove}
          style={({ pressed }) => [styles.action, pressed && { opacity: 0.8 }]}>
          <Icon name="delete-outline" size={20} color={colors.bg} />
          <Text style={styles.actionText}>Remove</Text>
        </Pressable>
      )}>
      {children}
    </Swipeable>
  );
}

const styles = StyleSheet.create({
  action: {
    width: 96,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingHorizontal: spacing.sm,
  },
  actionText: { fontFamily: fonts.semibold, fontSize: 12, color: colors.bg },
});
