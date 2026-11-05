import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, fonts, radius, spacing } from '@/theme';
import type { Restaurant } from '@/types';

import { Eyebrow } from './ui';

/** Gold seal shown next to kitchens whose documents the Manna team has checked. */
export function VerifiedSeal({ size = 16 }: { size?: number }) {
  return (
    <MaterialCommunityIcons
      name="check-decagram"
      size={size}
      color={colors.gold}
      accessibilityLabel="Verified kitchen"
    />
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
        <Image source={{ uri: photoUri }} style={StyleSheet.absoluteFill} contentFit="cover" />
      ) : (
        <Text style={[styles.initials, { fontSize: size * 0.38 }]}>{initials || 'M'}</Text>
      )}
    </View>
  );
}

/** "Meet the chef": portrait, story and the verified seal. Long stories expand on tap. */
export function ChefCard({ restaurant }: { restaurant: Restaurant }) {
  const [expanded, setExpanded] = useState(false);
  const bio = restaurant.chefBio.trim();
  const long = bio.length > 160;
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <ChefAvatar name={restaurant.chefName} photoUri={restaurant.chefPhotoUri} />
        <View style={{ flex: 1, gap: 2 }}>
          <Eyebrow>Meet the chef</Eyebrow>
          <View style={styles.nameRow}>
            <Text style={styles.name}>{restaurant.chefName}</Text>
            {restaurant.verified ? <VerifiedSeal /> : null}
          </View>
          {restaurant.verified ? <Text style={styles.verified}>Verified kitchen</Text> : null}
        </View>
      </View>
      {bio ? (
        <Pressable
          disabled={!long}
          onPress={() => setExpanded((e) => !e)}
          accessibilityRole={long ? 'button' : undefined}
          accessibilityHint={long ? (expanded ? 'Show less' : 'Read the full story') : undefined}>
          <View style={styles.quoteRow}>
            <MaterialCommunityIcons name="format-quote-open" size={22} color={colors.goldDeep} />
            <Text style={styles.bio} numberOfLines={expanded || !long ? undefined : 3}>
              {bio}
            </Text>
          </View>
          {long ? <Text style={styles.more}>{expanded ? 'Show less' : 'Read more'}</Text> : null}
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    borderWidth: 1,
    borderColor: colors.gold,
    backgroundColor: colors.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  initials: { fontFamily: fonts.display, color: colors.gold },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.hairline,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.md,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { fontFamily: fonts.display, fontSize: 20, color: colors.ivory },
  verified: { fontFamily: fonts.medium, fontSize: 12, color: colors.textMuted },
  quoteRow: { flexDirection: 'row', gap: spacing.sm },
  bio: {
    flex: 1,
    fontFamily: fonts.displayItalic,
    fontSize: 16,
    lineHeight: 25,
    color: colors.text,
  },
  more: {
    fontFamily: fonts.semibold,
    fontSize: 13,
    color: colors.gold,
    marginTop: spacing.xs,
    marginLeft: 30,
  },
});
