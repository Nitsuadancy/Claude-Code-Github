import type { StyleProp, ViewStyle } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

/**
 * Manna's own status glyphs, drawn as clean vectors instead of recolored
 * stock icons: a solid disc with a check or a cross cut out, an empty ring,
 * and the scalloped Verified seal. All are drawn on a 24-unit grid.
 */
type GlyphProps = {
  size: number;
  color: string;
  /** The mark cut into a solid glyph; usually the page background. */
  markColor?: string;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
};

const a11y = (label?: string) =>
  label ? { accessible: true, accessibilityLabel: label, accessibilityRole: 'image' as const } : { accessible: false };

export function CheckDisc({ size, color, markColor = '#0B0B0B', style, accessibilityLabel }: GlyphProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" style={style} {...a11y(accessibilityLabel)}>
      <Circle cx={12} cy={12} r={11} fill={color} />
      <Path
        d="M7.4 12.4l3.1 3.1 6.1-6.6"
        fill="none"
        stroke={markColor}
        strokeWidth={2.1}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function CrossDisc({ size, color, markColor = '#0B0B0B', style, accessibilityLabel }: GlyphProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" style={style} {...a11y(accessibilityLabel)}>
      <Circle cx={12} cy={12} r={11} fill={color} />
      <Path d="M8.8 8.8l6.4 6.4M15.2 8.8l-6.4 6.4" stroke={markColor} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

export function Ring({ size, color, style, accessibilityLabel }: GlyphProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" style={style} {...a11y(accessibilityLabel)}>
      <Circle cx={12} cy={12} r={10.25} fill="none" stroke={color} strokeWidth={1.5} />
    </Svg>
  );
}

/** A soft 12-point scalloped seal, computed once as a smooth closed path. */
const SEAL_PATH = (() => {
  const points = 240;
  const parts: string[] = [];
  for (let i = 0; i <= points; i++) {
    const t = (i / points) * Math.PI * 2;
    const r = 10.6 + 0.85 * Math.cos(12 * t);
    const x = 12 + r * Math.sin(t);
    const y = 12 - r * Math.cos(t);
    parts.push(`${i === 0 ? 'M' : 'L'}${x.toFixed(2)} ${y.toFixed(2)}`);
  }
  return `${parts.join('')}Z`;
})();

export function Seal({ size, color, markColor = '#0B0B0B', style, accessibilityLabel }: GlyphProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" style={style} {...a11y(accessibilityLabel)}>
      <Path d={SEAL_PATH} fill={color} />
      <Path
        d="M7.8 12.3l2.8 2.8 5.6-6"
        fill="none"
        stroke={markColor}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
