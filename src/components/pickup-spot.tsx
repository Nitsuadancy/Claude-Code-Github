import { StyleSheet, Text, View } from 'react-native';

import { colors, fonts, radius, spacing } from '@/theme';

import { Icon } from './icon';
import { Photo } from './photo';

/**
 * "Your pickup spot": the kitchen's photo of its door, gate or cooler with
 * the address and instructions, so a customer arriving at a stranger's house
 * knows they're in the right place. Shown only once the kitchen accepts.
 */
export function PickupSpot({
  photoUri,
  address,
  instructions,
}: {
  photoUri: string;
  address: string;
  instructions?: string;
}) {
  return (
    <View style={styles.card}>
      <View>
        <Photo uri={photoUri} size="card" style={styles.photo} accessibilityLabel={`Photo of the pickup spot at ${address}`} />
        <View style={styles.badge}>
          <Icon name="map-marker" size={14} color={colors.bg} />
          <Text style={styles.badgeText}>Your pickup spot</Text>
        </View>
      </View>
      <View style={styles.body}>
        <Text style={styles.address}>{address}</Text>
        {instructions ? <Text style={styles.instructions}>{instructions}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.lg, overflow: 'hidden', backgroundColor: colors.surface },
  photo: { width: '100%', aspectRatio: 4 / 3 },
  badge: {
    position: 'absolute',
    left: spacing.md,
    bottom: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.ivory,
  },
  badgeText: { fontFamily: fonts.semibold, fontSize: 12, color: colors.bg },
  body: { padding: spacing.md, gap: 4 },
  address: { fontFamily: fonts.semibold, fontSize: 16, color: colors.ivory },
  instructions: { fontFamily: fonts.body, fontSize: 14, lineHeight: 20, color: colors.text },
});
