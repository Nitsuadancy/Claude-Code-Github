import { StyleSheet, Text, View } from 'react-native';

import { formatClock } from '@/lib/orders';
import { colors, fonts, radius, spacing } from '@/theme';
import type { OrderUpdate } from '@/types';

import { ChefAvatar } from './chef';
import { FadeIn } from './motion';
import { Photo } from './photo';

/**
 * "From the kitchen": the cook's updates on an order, newest first, each with
 * its photo full width, like a short story of the bake.
 */
export function KitchenUpdates({
  updates,
  chefName,
  chefPhotoUri,
}: {
  updates: OrderUpdate[];
  chefName: string;
  chefPhotoUri?: string;
}) {
  if (!updates.length) return null;
  const newestFirst = [...updates].reverse();
  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <ChefAvatar name={chefName} photoUri={chefPhotoUri} size={32} />
        <Text style={styles.title}>From {chefName}’s kitchen</Text>
      </View>
      {newestFirst.map((u, i) => (
        <FadeIn key={u.id} index={i} style={styles.update}>
          {u.photoUri ? (
            <Photo
              uri={u.photoUri}
              size="card"
              style={[styles.photo, i > 0 && styles.olderPhoto]}
              accessibilityLabel={u.text ? `Photo: ${u.text}` : `Photo from ${chefName}`}
            />
          ) : null}
          <View style={styles.caption}>
            {u.text ? <Text style={[styles.text, i > 0 && styles.olderText]}>“{u.text}”</Text> : null}
            <Text style={styles.time}>{i === 0 ? `Latest · ${formatClock(u.at)}` : formatClock(u.at)}</Text>
          </View>
        </FadeIn>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.md },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  title: { fontFamily: fonts.semibold, fontSize: 15, color: colors.ivory },
  update: { gap: spacing.sm },
  photo: { width: '100%', aspectRatio: 4 / 3, borderRadius: radius.lg },
  olderPhoto: { aspectRatio: 16 / 9, opacity: 0.85 },
  caption: { gap: 2 },
  text: { fontFamily: fonts.displayItalic, fontSize: 17, lineHeight: 25, color: colors.ivory },
  olderText: { fontSize: 15, lineHeight: 22, color: colors.text },
  time: { fontFamily: fonts.body, fontSize: 12, color: colors.textFaint, fontVariant: ['tabular-nums'] },
});
