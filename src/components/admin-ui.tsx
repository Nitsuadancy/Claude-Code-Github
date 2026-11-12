import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon, type IconName } from '@/components/icon';
import { Body } from '@/components/ui';
import { colors, fonts, radius, spacing } from '@/theme';

/** Shared pieces for the Manna team screens. */
export function AdminState({ loading, error, empty, emptyText }: { loading: boolean; error: string | null; empty: boolean; emptyText: string }) {
  if (loading) return <ActivityIndicator color={colors.gold} style={{ marginTop: spacing.xl }} />;
  if (error) return <Body style={{ color: colors.danger }}>{error}</Body>;
  if (empty)
    return (
      <View style={styles.empty}>
        <Icon name="check" size={24} color={colors.success} />
        <Body muted style={{ textAlign: 'center' }}>
          {emptyText}
        </Body>
      </View>
    );
  return null;
}

export function AdminCard({ children, urgent }: { children: ReactNode; urgent?: boolean }) {
  return <View style={[styles.card, urgent && { borderColor: colors.danger, borderWidth: 1 }]}>{children}</View>;
}

export function AdminRow({
  icon,
  title,
  detail,
  count,
  onPress,
}: {
  icon: IconName;
  title: string;
  detail?: string;
  count?: number;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={count !== undefined ? `${title}, ${count}` : title}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && { opacity: 0.8 }]}>
      <Icon name={icon} size={20} color={colors.gold} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={styles.rowTitle}>{title}</Text>
        {detail ? <Text style={styles.meta}>{detail}</Text> : null}
      </View>
      {count !== undefined ? (
        <View style={[styles.count, count > 0 && { backgroundColor: colors.gold }]}>
          <Text style={[styles.countText, count > 0 && { color: colors.onGold }]}>{count}</Text>
        </View>
      ) : null}
      <Icon name="chevron-right" size={18} color={colors.textMuted} />
    </Pressable>
  );
}

export const adminStyles = StyleSheet.create({
  title: { fontFamily: fonts.semibold, fontSize: 17, color: colors.ivory },
  meta: { fontFamily: fonts.body, fontSize: 13, lineHeight: 18, color: colors.textMuted },
  quote: { fontFamily: fonts.body, fontSize: 15, lineHeight: 21, color: colors.text, fontStyle: 'italic' },
  label: { fontFamily: fonts.semibold, fontSize: 12, color: colors.gold },
  actions: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
});

const styles = StyleSheet.create({
  empty: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xl },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, gap: spacing.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
  },
  rowTitle: { fontFamily: fonts.semibold, fontSize: 16, color: colors.ivory },
  meta: adminStyles.meta,
  count: {
    minWidth: 28,
    height: 24,
    borderRadius: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceRaised,
  },
  countText: { fontFamily: fonts.semibold, fontSize: 13, color: colors.textMuted },
});
