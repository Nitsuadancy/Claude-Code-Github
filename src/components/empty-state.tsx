import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Circle, G, Path } from 'react-native-svg';

import { colors, spacing } from '@/theme';

import { FadeIn } from './motion';
import { Body, GoldButton, Heading } from './ui';

export type EmptyArt = 'bag' | 'ticket' | 'bell' | 'plate' | 'review' | 'oven';

/** Five-point star centred on (cx, cy), as a closed path. */
function starPath(cx: number, cy: number, outer: number, inner: number) {
  const points = Array.from({ length: 10 }, (_, i) => {
    const r = i % 2 === 0 ? outer : inner;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    return `${(cx + r * Math.cos(a)).toFixed(2)} ${(cy + r * Math.sin(a)).toFixed(2)}`;
  });
  return `M${points.join(' L')} Z`;
}

/**
 * Line drawings for empty screens, drawn on a 120 × 110 grid in one gold
 * stroke over a faint halo, so they match the icon weight instead of
 * looking like clip art.
 */
const ART: Record<EmptyArt, ReactNode> = {
  // A paper bag with a baguette and a roll in it.
  bag: (
    <>
      <Path d="M62 42 L77 13 a5 5 0 0 1 9 4.6 L74 42" />
      <Path d="M73 27 l7 3.4 M77.5 19.5 l7 3.4" opacity={0.7} />
      <Path d="M42 42 C42 31 58 31 58 42" />
      <Path d="M34 42 H86 L90 98 H30 Z" />
      <Path d="M36 54 H84" opacity={0.5} />
    </>
  ),
  // An order ticket with a torn edge.
  ticket: (
    <>
      <Path d="M36 16 H84 V90 l-6 6 -6 -6 -6 6 -6 -6 -6 6 -6 -6 -6 6 -6 -6 Z" />
      <Path d="M46 32 H74 M46 44 H66 M46 56 H70" />
      <Path d="M46 72 H74" strokeDasharray="2 5" opacity={0.6} />
    </>
  ),
  // A counter service bell, waiting.
  bell: (
    <>
      <Path d="M32 80 A28 28 0 0 1 88 80" />
      <Path d="M24 86 H96" />
      <Path d="M60 52 V46" />
      <Circle cx={60} cy={42} r={4} />
      <Path d="M44 72 A18 18 0 0 1 51 61" opacity={0.6} />
    </>
  ),
  // A place setting with nothing on the plate.
  plate: (
    <>
      <Circle cx={60} cy={58} r={28} />
      <Circle cx={60} cy={58} r={18} opacity={0.5} />
      <Path d="M18 28 V42 Q18 49 22 49 Q26 49 26 42 V28 M22 28 V41 M22 49 V90" />
      <Path d="M98 90 V28 C105 37 105 53 98 57" />
    </>
  ),
  // A speech bubble with a star.
  review: (
    <>
      <Path d="M28 24 H92 a8 8 0 0 1 8 8 V68 a8 8 0 0 1 -8 8 H58 L44 90 V76 H28 a8 8 0 0 1 -8 -8 V32 a8 8 0 0 1 8 -8 Z" />
      <Path d={starPath(60, 50, 13, 5.5)} />
    </>
  ),
  // An oven door with a loaf rising inside.
  oven: (
    <>
      <Path d="M26 22 H94 a6 6 0 0 1 6 6 V88 a6 6 0 0 1 -6 6 H26 a6 6 0 0 1 -6 -6 V28 a6 6 0 0 1 6 -6 Z" />
      <Path d="M20 38 H100" />
      <Circle cx={34} cy={30} r={2} />
      <Circle cx={44} cy={30} r={2} />
      <Path d="M32 50 H88 V82 H32 Z" opacity={0.5} />
      <Path d="M46 74 C46 60 74 60 74 74 Z" />
    </>
  ),
};

export function EmptyArtwork({ art, size = 120 }: { art: EmptyArt; size?: number }) {
  return (
    <Svg width={size} height={(size * 110) / 120} viewBox="0 0 120 110" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Circle cx={60} cy={58} r={50} fill={colors.gold} opacity={0.07} />
      <G
        fill="none"
        stroke={colors.gold}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round">
        {ART[art]}
      </G>
    </Svg>
  );
}

/**
 * The one way to say "nothing here yet": a small drawing, a plain title,
 * a sentence on what will show up here, and at most one next step.
 */
export function EmptyState({
  art,
  title,
  body,
  action,
  compact = false,
  style,
}: {
  art: EmptyArt;
  title: string;
  body?: string;
  action?: { title: string; onPress: () => void };
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <FadeIn style={[compact ? styles.compact : styles.wrap, style]}>
      <EmptyArtwork art={art} size={compact ? 84 : 120} />
      <View style={styles.text}>
        <Heading size={compact ? 18 : 22} style={styles.center}>
          {title}
        </Heading>
        {body ? (
          <Body muted style={[styles.center, compact && { fontSize: 14 }]}>
            {body}
          </Body>
        ) : null}
      </View>
      {action ? <GoldButton title={action.title} fullWidth={false} onPress={action.onPress} /> : null}
    </FadeIn>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: spacing.lg, paddingVertical: spacing.xxl, paddingHorizontal: spacing.lg },
  compact: { alignItems: 'center', gap: spacing.md, paddingVertical: spacing.lg, paddingHorizontal: spacing.md },
  text: { alignItems: 'center', gap: spacing.sm, maxWidth: 320 },
  center: { textAlign: 'center' },
});
