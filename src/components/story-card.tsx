import { LinearGradient } from 'expo-linear-gradient';
import type { ComponentRef, Ref } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

import { accentColor } from '@/data/accents';
import { colors, fonts } from '@/theme';
import type { Restaurant } from '@/types';

import { RestaurantCover } from './restaurant-card';
import { Wordmark } from './ui';
import { Photo } from './photo';

/** Instagram Story proportions. The card is drawn at `width` and exported at 1080 × 1920. */
export const STORY_ASPECT = 16 / 9;

/**
 * A ready-to-post Instagram Story for a kitchen: its best photo, its name, the
 * dish to try and a QR code that opens the kitchen on Manna.
 */
export function StoryCard({
  restaurant,
  url,
  width,
  ref,
}: {
  restaurant: Restaurant;
  url: string;
  width: number;
  ref?: Ref<ComponentRef<typeof View>>;
}) {
  const height = Math.round(width * STORY_ASPECT);
  const u = width / 270; // Designed at 270 px wide; everything scales from that.
  const signature = restaurant.menu.find((m) => m.id === restaurant.signatureItemId) ?? restaurant.menu[0];
  const photo = signature?.photoUri ?? restaurant.coverUris[0];
  const accent = accentColor(restaurant.accent);
  return (
    <View ref={ref} collapsable={false} style={[styles.card, { width, height, borderRadius: 14 * u }]}>
      <View style={{ height: height * 0.66 }}>
        {photo ? (
          <Photo uri={photo} size="card" style={StyleSheet.absoluteFill} />
        ) : (
          <RestaurantCover restaurant={restaurant} style={StyleSheet.absoluteFill} monogramSize={70 * u} />
        )}
        <LinearGradient
          colors={['rgba(11,11,11,0.55)', 'transparent', 'transparent', colors.bg]}
          locations={[0, 0.25, 0.6, 1]}
          style={StyleSheet.absoluteFill}
        />
        <View style={{ position: 'absolute', top: 18 * u, left: 18 * u }}>
          <Wordmark width={64 * u} />
        </View>
      </View>

      <View style={{ flex: 1, paddingHorizontal: 18 * u, marginTop: -54 * u, gap: 4 * u }}>
        <Text style={[styles.kicker, { fontSize: 9.5 * u, color: accent }]}>Now taking orders on Manna</Text>
        <Text style={[styles.name, { fontSize: 27 * u, lineHeight: 29 * u, letterSpacing: -0.8 * u }]} numberOfLines={2}>
          {restaurant.name}
        </Text>
        <Text style={[styles.byline, { fontSize: 11 * u }]} numberOfLines={1}>
          {restaurant.chefName}
          {restaurant.neighborhood ? ` · ${restaurant.neighborhood}` : ''}
        </Text>
        {restaurant.tagline ? (
          <Text style={[styles.tagline, { fontSize: 11.5 * u, marginTop: 2 * u }]} numberOfLines={2}>
            {restaurant.tagline}
          </Text>
        ) : null}
        <View style={[styles.bottom, { marginTop: 'auto', marginBottom: 18 * u, gap: 12 * u }]}>
          <View style={{ flex: 1, gap: 3 * u }}>
            {signature ? (
              <>
                <Text style={[styles.tryLabel, { fontSize: 9 * u }]}>Try the</Text>
                <Text style={[styles.dish, { fontSize: 14 * u }]} numberOfLines={2}>
                  {signature.name}
                </Text>
              </>
            ) : null}
            <Text style={[styles.pickup, { fontSize: 9.5 * u }]}>
              Order ahead, pick up{restaurant.neighborhood ? ` in ${restaurant.neighborhood}` : ' nearby'}
            </Text>
          </View>
          <View style={[styles.qrWrap, { padding: 7 * u, borderRadius: 10 * u }]}>
            <QRCode value={url} size={66 * u} color={colors.bg} backgroundColor={colors.ivory} />
            <Text style={[styles.scan, { fontSize: 7.5 * u, marginTop: 4 * u }]}>Scan to order</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { overflow: 'hidden', backgroundColor: colors.bg },
  kicker: { fontFamily: fonts.semibold },
  tagline: { fontFamily: fonts.medium, color: colors.text },
  name: { fontFamily: fonts.display, color: colors.ivory },
  byline: { fontFamily: fonts.medium, color: colors.textMuted },
  bottom: { flexDirection: 'row', alignItems: 'flex-end' },
  tryLabel: { fontFamily: fonts.medium, color: colors.textMuted },
  dish: { fontFamily: fonts.semibold, color: colors.ivory },
  pickup: { fontFamily: fonts.medium, color: colors.textFaint, marginTop: 4 },
  qrWrap: { backgroundColor: colors.ivory, alignItems: 'center' },
  scan: { fontFamily: fonts.semibold, color: colors.bg },
});
