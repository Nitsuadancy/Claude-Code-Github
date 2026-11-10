import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { formatMonthDay } from '@/lib/orders';
import { stampTilt, type Stamp } from '@/lib/passport';
import { colors, fonts, radius, spacing } from '@/theme';
import type { Restaurant } from '@/types';

import { Photo } from './photo';

/** One stamp: the kitchen's food in a gold ring, pressed at a slight angle. */
export function PassportStamp({ restaurant, size = 68 }: { restaurant: Restaurant; size?: number }) {
  const cover = restaurant.coverUris[0];
  return (
    <View style={[styles.ring, { width: size, height: size, borderRadius: size / 2, transform: [{ rotate: `${stampTilt(restaurant.id)}deg` }] }]}>
      {cover ? (
        <Photo uri={cover} size="thumb" style={{ width: size - 10, height: size - 10, borderRadius: (size - 10) / 2 }} />
      ) : (
        <Text style={styles.initial}>{restaurant.name.charAt(0)}</Text>
      )}
    </View>
  );
}

/**
 * "Your Orlando passport": stamps for kitchens you've picked up from, and
 * empty spots for the ones still to try. Every spot opens that kitchen.
 */
export function Passport({
  city,
  stamps,
  kitchens,
}: {
  city: string;
  stamps: Stamp[];
  kitchens: Restaurant[];
}) {
  const earned = new Map(stamps.map((s) => [s.restaurantId, s]));
  const tried = kitchens.filter((k) => earned.has(k.id)).sort((a, b) => earned.get(a.id)!.firstPickupAt.localeCompare(earned.get(b.id)!.firstPickupAt));
  const toTry = kitchens.filter((k) => !earned.has(k.id));
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>Your {city} passport</Text>
        <Text style={styles.count}>
          {tried.length} of {kitchens.length} kitchens
        </Text>
      </View>
      <Text style={styles.body}>
        {tried.length
          ? 'A stamp for every kitchen you’ve picked up from. Tap an empty one to try somewhere new.'
          : 'Pick up from a kitchen to earn your first stamp.'}
      </Text>
      <View style={styles.grid}>
        {[...tried, ...toTry].map((k) => {
          const stamp = earned.get(k.id);
          return (
            <Pressable
              key={k.id}
              accessibilityRole="button"
              accessibilityLabel={stamp ? `${k.name}, stamped ${formatMonthDay(stamp.firstPickupAt)}` : `${k.name}, not tried yet`}
              onPress={() => router.push({ pathname: '/restaurant/[id]', params: { id: k.id } })}
              style={({ pressed }) => [styles.cell, pressed && { opacity: 0.7 }]}>
              {stamp ? (
                <PassportStamp restaurant={k} />
              ) : (
                <View style={styles.empty}>
                  <Text style={styles.emptyInitial}>{k.name.charAt(0)}</Text>
                </View>
              )}
              <Text style={[styles.name, !stamp && styles.nameEmpty]} numberOfLines={1}>
                {k.name}
              </Text>
              <Text style={styles.date}>{stamp ? formatMonthDay(stamp.firstPickupAt) : 'Not yet'}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md + 2, gap: spacing.sm },
  header: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: spacing.md },
  title: { fontFamily: fonts.display, fontSize: 20, letterSpacing: -0.3, color: colors.ivory, flexShrink: 1 },
  count: { fontFamily: fonts.semibold, fontSize: 13, color: colors.gold, fontVariant: ['tabular-nums'] },
  body: { fontFamily: fonts.body, fontSize: 13, lineHeight: 18, color: colors.textMuted },
  grid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: spacing.lg, marginTop: spacing.sm },
  cell: { width: '25%', alignItems: 'center', gap: 6, paddingHorizontal: 2 },
  ring: { borderWidth: 2, borderColor: colors.gold, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
  initial: { fontFamily: fonts.display, fontSize: 26, color: colors.gold },
  empty: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyInitial: { fontFamily: fonts.display, fontSize: 24, color: colors.textFaint },
  name: { fontFamily: fonts.medium, fontSize: 11, color: colors.text, textAlign: 'center' },
  nameEmpty: { color: colors.textMuted },
  date: { fontFamily: fonts.body, fontSize: 10, color: colors.textFaint, fontVariant: ['tabular-nums'], marginTop: -4 },
});
