import { useEffect } from 'react';
import { type DimensionValue, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Reanimated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { colors, radius, spacing } from '@/theme';

/**
 * A placeholder block that breathes softly while real content loads.
 * Shapes should match what's coming (same size and corners), so nothing
 * jumps when the content arrives.
 *
 * Nothing loads over the network yet, so these aren't shown anywhere today.
 * Use them for every list once data comes from Supabase, instead of a spinner.
 */
export function Skeleton({
  width = '100%',
  height,
  rounded = radius.sm,
  style,
}: {
  width?: DimensionValue;
  /** Leave out when `style` sets the size, e.g. with an aspect ratio. */
  height?: DimensionValue;
  rounded?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const reduce = useReducedMotion();
  const t = useSharedValue(0);
  useEffect(() => {
    if (reduce) return;
    t.set(withRepeat(withTiming(1, { duration: 900, easing: Easing.inOut(Easing.quad) }), -1, true));
  }, [reduce, t]);
  const animated = useAnimatedStyle(() => ({ opacity: 0.55 + 0.45 * t.get() }));
  return (
    <Reanimated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[{ width, height, borderRadius: rounded, backgroundColor: colors.surfaceRaised }, animated, style]}
    />
  );
}

/** Stand-in for a feed `RestaurantCard`: cover photo, name, byline and meta line. */
export function RestaurantCardSkeleton() {
  return (
    <View accessibilityLabel="Loading kitchen" style={styles.card}>
      <Skeleton rounded={radius.md} style={styles.cover} />
      <Skeleton width="58%" height={20} />
      <Skeleton width="40%" height={13} />
      <Skeleton width="72%" height={13} />
    </View>
  );
}

/** Stand-in for an order or menu row: a line of text, a shorter line and a square thumbnail. */
export function RowSkeleton({ thumb = true }: { thumb?: boolean }) {
  return (
    <View accessibilityLabel="Loading" style={styles.row}>
      <View style={styles.rowText}>
        <Skeleton width="64%" height={17} />
        <Skeleton width="88%" height={13} />
        <Skeleton width="30%" height={13} />
      </View>
      {thumb ? <Skeleton width={88} height={88} rounded={radius.md} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.sm },
  cover: { aspectRatio: 3 / 2, marginBottom: spacing.xs },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md },
  rowText: { flex: 1, gap: spacing.sm },
});
