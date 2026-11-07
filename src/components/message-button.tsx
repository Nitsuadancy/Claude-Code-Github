import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useUnreadMessages } from '@/state/store';
import { colors, fonts, radius, spacing } from '@/theme';

import { Icon } from './icon';

/** "Message Mrs. Susie", with a count of new messages, used on the order screen and the cook's dashboard. */
export function MessageButton({
  orderId,
  label,
  onPress,
  compact = false,
}: {
  orderId: string;
  label: string;
  onPress: () => void;
  compact?: boolean;
}) {
  const unread = useUnreadMessages(orderId);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={unread ? `${label}, ${unread} new` : label}
      onPress={onPress}
      style={({ pressed }) => [styles.button, compact && styles.compact, pressed && { backgroundColor: colors.surfaceRaised }]}>
      <Icon name="message-text-outline" size={18} color={colors.gold} />
      <Text style={styles.label} numberOfLines={1}>
        {label}
      </Text>
      {unread ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{unread > 9 ? '9+' : unread}</Text>
        </View>
      ) : (
        <Icon name="chevron-right" size={18} color={colors.textMuted} />
      )}
    </Pressable>
  );
}

/** A quiet "2 new messages" line for order cards. Renders nothing when there's nothing new. */
export function UnreadMessagesLine({ orderId }: { orderId: string }) {
  const unread = useUnreadMessages(orderId);
  if (!unread) return null;
  return (
    <View style={styles.line}>
      <View style={styles.dot} />
      <Text style={styles.lineText}>
        {unread} new {unread === 1 ? 'message' : 'messages'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  compact: { paddingVertical: 10 },
  label: { flex: 1, fontFamily: fonts.medium, fontSize: 15, color: colors.text },
  badge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 6,
    backgroundColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { fontFamily: fonts.semibold, fontSize: 12, color: colors.onGold, fontVariant: ['tabular-nums'] },
  line: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.gold },
  lineText: { fontFamily: fonts.medium, fontSize: 13, color: colors.gold },
});
