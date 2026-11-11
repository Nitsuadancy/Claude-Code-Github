import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { dropItems, formatDropPickup, formatDropPickupShort } from '@/lib/drops';
import { colors, fonts, radius, spacing } from '@/theme';
import type { Drop, Restaurant } from '@/types';

import { Countdown } from './countdown';
import { Icon } from './icon';
import { Photo } from './photo';

/** A kitchen's drop, as a card that opens the drop's own menu. */
export function DropCard({
  drop,
  restaurant,
  accent = colors.gold,
  now,
  showKitchen = false,
}: {
  drop: Drop;
  restaurant: Restaurant;
  accent?: string;
  now: Date;
  /** On the home screen the card names the kitchen too. */
  showKitchen?: boolean;
}) {
  const items = dropItems(restaurant.menu, drop);
  const photo = items.find((m) => m.photoUri)?.photoUri;
  const open = new Date(drop.closesAt) > now;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Drop: ${drop.title}${showKitchen ? ` from ${restaurant.name}` : ''}. ${formatDropPickup(drop, now)}. Open`}
      onPress={() => router.push({ pathname: '/drop/[id]', params: { id: drop.id, kitchen: restaurant.id } })}
      style={({ pressed }) => [styles.card, { borderColor: accent }, pressed && { opacity: 0.85 }]}>
      {photo ? <Photo uri={photo} size="thumb" style={styles.photo} /> : null}
      <View style={{ flex: 1, gap: 3 }}>
        <Text style={[styles.label, { color: accent }]}>{showKitchen ? `Drop · ${restaurant.name}` : 'Drop'}</Text>
        <Text style={styles.title} numberOfLines={2}>
          {drop.title}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          Pickup {formatDropPickupShort(drop, now)}
        </Text>
        {open ? (
          <Countdown to={drop.closesAt} prefix="Orders close in " style={{ fontSize: 12 }} />
        ) : (
          <Text style={styles.meta}>Orders closed</Text>
        )}
      </View>
      <Icon name="chevron-right" size={18} color={colors.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    backgroundColor: colors.surface,
    marginBottom: spacing.md,
  },
  photo: { width: 64, height: 64, borderRadius: radius.md },
  label: { fontFamily: fonts.semibold, fontSize: 12, letterSpacing: 0.4, textTransform: 'uppercase' },
  title: { fontFamily: fonts.semibold, fontSize: 17, color: colors.ivory },
  meta: { fontFamily: fonts.body, fontSize: 13, color: colors.textMuted },
});
