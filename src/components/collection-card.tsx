import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text, View } from 'react-native';

import type { Collection } from '@/data/collections';
import { colors, fonts, radius, spacing } from '@/theme';

import { PressableScale } from './motion';
import type { IconName } from './ui';
import { Icon } from './icon';


/** Magazine-style tile for an editorial collection. */
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
      <LinearGradient colors={['#2A2214', '#100D08']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      <View style={styles.icon}>
        <Icon name={collection.icon as IconName} size={22} color={colors.gold} />
      </View>
      <View style={{ gap: 4 }}>
        <Text style={styles.eyebrow}>
          Collection · {count} {count === 1 ? 'kitchen' : 'kitchens'}
        </Text>
        <Text style={styles.title}>{collection.title}</Text>
        <Text style={styles.tagline} numberOfLines={2}>
          {collection.tagline}
        </Text>
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 230,
    height: 200,
    borderRadius: radius.lg,
    overflow: 'hidden',
    padding: spacing.md,
    justifyContent: 'space-between',
  },
  icon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.hairline,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(10,9,7,0.5)',
  },
  eyebrow: {
    fontFamily: fonts.semibold,
    fontSize: 9,
    letterSpacing: 1.8,
    textTransform: 'uppercase',
    color: colors.gold,
  },
  title: { fontFamily: fonts.display, fontSize: 28, color: colors.ivory },
  tagline: { fontFamily: fonts.displayItalic, fontSize: 15, lineHeight: 21, color: colors.textMuted },
});
