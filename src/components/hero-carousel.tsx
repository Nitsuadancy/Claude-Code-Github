import { LinearGradient } from 'expo-linear-gradient';
import { type ReactNode, useEffect, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { colors, fonts, spacing } from '@/theme';
import type { Restaurant } from '@/types';

import { NATIVE_DRIVER } from './motion';
import { RestaurantCover } from './restaurant-card';
import { Photo } from './photo';

/** A photo that drifts in very slowly, like the opening shot of a film. Still when "reduce motion" is on. */
function DriftingPhoto({ uri, active }: { uri: string; active: boolean }) {
  const [scale] = useState(() => new Animated.Value(1));
  useEffect(() => {
    if (!active) {
      scale.setValue(1);
      return;
    }
    let anim: Animated.CompositeAnimation | null = null;
    let cancelled = false;
    AccessibilityInfo.isReduceMotionEnabled()
      .catch(() => false)
      .then((reduce) => {
        if (cancelled || reduce) return;
        anim = Animated.timing(scale, {
          toValue: 1.09,
          duration: 14_000,
          easing: Easing.out(Easing.quad),
          useNativeDriver: NATIVE_DRIVER,
        });
        anim.start();
      });
    return () => {
      cancelled = true;
      anim?.stop();
    };
  }, [active, scale]);
  return (
    <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ scale }] }]}>
      <Photo uri={uri} style={StyleSheet.absoluteFill} transition={400} />
    </Animated.View>
  );
}

/**
 * Full-bleed featured kitchens at the top of home. Swipe between them; tap to
 * open. `overlay` (the masthead) floats over the top of the photos.
 */
export function HeroCarousel({
  restaurants,
  width,
  height,
  label,
  overlay,
  onOpen,
}: {
  restaurants: Restaurant[];
  width: number;
  height: number;
  /** Small line above each name, e.g. "Open now". */
  label: (r: Restaurant) => string;
  overlay?: ReactNode;
  onOpen: (r: Restaurant) => void;
}) {
  const [index, setIndex] = useState(0);
  return (
    <View style={{ width, height }}>
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={32}
        onScroll={(e) => setIndex(Math.round(e.nativeEvent.contentOffset.x / width))}>
        {restaurants.map((r, i) => (
          <Pressable
            key={r.id}
            accessibilityRole="button"
            accessibilityLabel={`${r.name}, ${r.chefName}. ${label(r)}. Open kitchen`}
            onPress={() => onOpen(r)}
            style={{ width, height, overflow: 'hidden', backgroundColor: colors.surface }}>
            {r.coverUris[0] ? (
              <DriftingPhoto uri={r.coverUris[0]} active={i === index} />
            ) : (
              <RestaurantCover restaurant={r} style={StyleSheet.absoluteFill} monogramSize={96} />
            )}
            <LinearGradient
              colors={['rgba(11,11,11,0.55)', 'transparent', 'rgba(11,11,11,0.15)', 'rgba(11,11,11,0.92)']}
              locations={[0, 0.28, 0.55, 1]}
              style={StyleSheet.absoluteFill}
            />
            <View style={styles.caption}>
              <Text style={styles.label}>{label(r)}</Text>
              <Text style={styles.name} numberOfLines={2}>
                {r.name}
              </Text>
              <Text style={styles.byline} numberOfLines={1}>
                {r.chefName}
                {r.neighborhood ? ` · ${r.neighborhood}` : ''}
              </Text>
            </View>
          </Pressable>
        ))}
      </ScrollView>
      {overlay ? (
        <View pointerEvents="box-none" style={styles.overlay}>
          {overlay}
        </View>
      ) : null}
      <View pointerEvents="none" style={styles.dots}>
        {restaurants.map((r, i) => (
          <View key={r.id} style={[styles.dot, i === index && styles.dotOn]} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { position: 'absolute', top: 0, left: 0, right: 0 },
  caption: { position: 'absolute', left: spacing.lg, right: spacing.lg, bottom: spacing.xl + 6, gap: 6 },
  label: { fontFamily: fonts.medium, fontSize: 13, color: colors.gold },
  name: { fontFamily: fonts.display, fontSize: 38, lineHeight: 40, letterSpacing: -1.1, color: colors.ivory },
  byline: { fontFamily: fonts.medium, fontSize: 15, color: 'rgba(247,244,238,0.78)' },
  dots: {
    position: 'absolute',
    bottom: spacing.md,
    left: spacing.lg,
    flexDirection: 'row',
    gap: 6,
  },
  dot: { width: 6, height: 2, borderRadius: 1, backgroundColor: 'rgba(247,244,238,0.35)' },
  dotOn: { width: 22, backgroundColor: colors.ivory },
});
