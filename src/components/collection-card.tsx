import { StyleSheet, Text } from 'react-native';

import type { Collection } from '@/data/collections';
import { colors, fonts, radius, spacing } from '@/theme';

import { CraftIcon } from './craft-icon';
import { PressableScale } from './motion';

/** An editorial collection: a fine rule, its craft icon, a title and a line of italic. */
export function CollectionCard({
  collection,
  count,
  onPress,
}: {
  collection: Collection;
  count: number;
  onPress: () => void;
}) {
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={`${collection.title}. ${collection.tagline} ${count} kitchens`}
      onPress={onPress}
      style={styles.card}>
      <CraftIcon name={collection.icon} size={26} color={colors.gold} />
      <Text style={styles.title}>{collection.title}</Text>
      <Text style={styles.tagline} numberOfLines={2}>
        {collection.tagline}
      </Text>
      <Text style={styles.count}>
        {count} {count === 1 ? 'kitchen' : 'kitchens'}
      </Text>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 200,
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  title: { fontFamily: fonts.display, fontSize: 18, letterSpacing: -0.4, color: colors.ivory, marginTop: spacing.xs },
  tagline: { fontFamily: fonts.body, fontSize: 13, lineHeight: 18, color: colors.textMuted },
  count: { fontFamily: fonts.medium, fontSize: 12, color: colors.gold },
});
