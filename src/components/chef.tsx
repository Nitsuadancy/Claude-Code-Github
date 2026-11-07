import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, fonts, spacing } from '@/theme';
import type { Restaurant } from '@/types';

import { Icon } from './icon';
import { Photo } from './photo';

/** Marks one of the first kitchens on Manna. */
export function FoundingMark({ size = 12 }: { size?: number }) {
  return (
    <View style={styles.founding} accessible accessibilityLabel="Founding creator">
      <Icon name="star-four-points" size={size - 2} color={colors.gold} />
      <Text style={[styles.foundingText, { fontSize: size }]}>Founding</Text>
    </View>
  );
}

/** Gold seal shown next to kitchens whose documents the Manna team has checked. */
export function VerifiedSeal({ size = 16 }: { size?: number }) {
  return (
    <Icon
      name="check-decagram"
      size={size}
      color={colors.gold}
      accessibilityLabel="Verified kitchen"
    />
  );
}

/** Marks a kitchen with an approved food permit or license. */
export function LicensedMark({ size = 12 }: { size?: number }) {
  return (
    <View style={styles.founding} accessible accessibilityLabel="Licensed kitchen">
      <Icon name="shield-lock-outline" size={size} color={colors.success} />
      <Text style={[styles.foundingText, { fontSize: size, color: colors.success }]}>Licensed</Text>
    </View>
  );
}

/** Circular chef portrait, or their initials in gold when there's no photo. */
export function ChefAvatar({
  name,
  photoUri,
  size = 56,
}: {
  name: string;
  photoUri?: string;
  size?: number;
}) {
  const initials = name
    .replace(/^(Chef|Mr\.|Mrs\.|Ms\.)\s+/i, '')
    .split(' ')
    .map((p) => p.charAt(0))
    .join('')
    .slice(0, 2)
    .toUpperCase();
  return (
    <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}>
      {photoUri ? (
        <Photo uri={photoUri} style={StyleSheet.absoluteFill} />
      ) : (
        <Text style={[styles.initials, { fontSize: size * 0.38 }]}>{initials || 'M'}</Text>
      )}
    </View>
  );
}

/** The chef's story as a pull quote, signed with their portrait. Long stories expand on tap. */
export function ChefCard({ restaurant }: { restaurant: Restaurant }) {
  const [expanded, setExpanded] = useState(false);
  const bio = restaurant.chefBio.trim();
  const long = bio.length > 180;
  return (
    <View style={styles.card}>
      {bio ? (
        <Pressable
          disabled={!long}
          onPress={() => setExpanded((e) => !e)}
          accessibilityRole={long ? 'button' : undefined}
          accessibilityHint={long ? (expanded ? 'Show less' : 'Read the full story') : undefined}>
          <Text style={styles.bio} numberOfLines={expanded || !long ? undefined : 4}>
            “{bio}”
          </Text>
          {long ? <Text style={styles.more}>{expanded ? 'Show less' : 'Read more'}</Text> : null}
        </Pressable>
      ) : null}
      <View style={styles.header}>
        <ChefAvatar name={restaurant.chefName} photoUri={restaurant.chefPhotoUri} size={40} />
        <View style={{ flex: 1, gap: 1 }}>
          <View style={styles.nameRow}>
            <Text style={styles.name}>{restaurant.chefName}</Text>
            {restaurant.verified ? <VerifiedSeal size={14} /> : null}
          </View>
          <Text style={styles.verified}>
            {[restaurant.neighborhood, restaurant.verified ? 'Verified kitchen' : null].filter(Boolean).join(' · ')}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  founding: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  foundingText: { fontFamily: fonts.semibold, color: colors.gold },
  avatar: {
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  initials: { fontFamily: fonts.display, color: colors.gold },
  card: {
    gap: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderStrong,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { fontFamily: fonts.display, fontSize: 17, color: colors.ivory },
  verified: { fontFamily: fonts.medium, fontSize: 12, color: colors.textMuted },
  bio: {
    flex: 1,
    fontFamily: fonts.displayItalic,
    fontSize: 21,
    lineHeight: 30,
    color: colors.ivory,
  },
  more: {
    fontFamily: fonts.semibold,
    fontSize: 13,
    color: colors.gold,
    marginTop: spacing.sm,
  },
});
