import type { StyleProp, ViewStyle } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { colors } from '@/theme';

/**
 * Manna's own drawings for the seven crafts. They use a finer stroke than the
 * interface icons, with round ends, to match the thin gold rays in the logo.
 * Breakfast is a sunrise that borrows the logo's rays directly.
 * Drawn on a 24-unit grid.
 */
const CRAFT_PATHS = {
  vegan: [
    'M12 21V11.5',
    'M12 14C7.2 14 4.5 11 4.5 6.5C9.3 6.5 12 9.3 12 14Z',
    'M12 11.5C12 7 14.8 4 19.5 4C19.5 8.7 16.7 11.5 12 11.5Z',
    'M12 14L7.8 9.6',
    'M12 11.5L16.4 7.3',
    'M8.5 21H15.5',
  ],
  cottage: [
    'M3.5 12L12 5.5L20.5 12',
    'M5.5 10.5V20.5H18.5V10.5',
    'M15.5 8.2V4.5H17.5V9.7',
    'M12 18.4C10.1 17.1 9.2 16 9.2 14.9C9.2 14.1 9.8 13.4 10.6 13.4C11.2 13.4 11.7 13.8 12 14.3C12.3 13.8 12.8 13.4 13.4 13.4C14.2 13.4 14.8 14.1 14.8 14.9C14.8 16 13.9 17.1 12 18.4Z',
  ],
  global: [
    'M12 3.5A8.5 8.5 0 1 0 12 20.5A8.5 8.5 0 1 0 12 3.5Z',
    'M12 3.5C9 6.5 9 17.5 12 20.5',
    'M12 3.5C15 6.5 15 17.5 12 20.5',
    'M3.5 12H20.5',
    'M5 7.8C9.6 9 14.4 9 19 7.8',
    'M5 16.2C9.6 15 14.4 15 19 16.2',
  ],
  bakery: [
    'M4 18.5V12.8C4 8.7 7.6 6 12 6C16.4 6 20 8.7 20 12.8V18.5Z',
    'M8.3 9.6L9.9 12.4',
    'M11.4 8.6L13 11.4',
    'M14.5 9.6L16.1 12.4',
    'M2.5 18.5H21.5',
  ],
  breakfast: [
    'M3 17H21',
    'M7 20H17',
    'M7.5 17A4.5 4.5 0 0 1 16.5 17',
    'M12 7V9.3',
    'M6.9 9.1L8.3 10.7',
    'M17.1 9.1L15.7 10.7',
    'M4.2 12.9L6.2 13.6',
    'M19.8 12.9L17.8 13.6',
  ],
  'late-night': [
    'M12.6 4.6A7.6 7.6 0 1 0 19.4 15A6 6 0 0 1 12.6 4.6Z',
    'M18 3.2C18.3 4.9 18.9 5.5 20.6 5.8C18.9 6.1 18.3 6.7 18 8.4C17.7 6.7 17.1 6.1 15.4 5.8C17.1 5.5 17.7 4.9 18 3.2Z',
  ],
  sweet: [
    'M5.8 11.2C5.8 8.3 8.5 6.6 12 6.6C15.5 6.6 18.2 8.3 18.2 11.2Z',
    'M6.4 11.2L8 20H16L17.6 11.2',
    'M10.2 11.2L10.8 20',
    'M13.8 11.2L13.2 20',
    'M12 6.6V5.4',
    'M12 3.4A1 1 0 1 0 12 5.4A1 1 0 1 0 12 3.4Z',
  ],
} as const;

export type CraftIconName = keyof typeof CRAFT_PATHS;

export function CraftIcon({
  name,
  size = 28,
  color = colors.gold,
  strokeWidth = 1.35,
  style,
}: {
  name: CraftIconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={style}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants">
      {CRAFT_PATHS[name].map((d) => (
        <Path key={d} d={d} />
      ))}
    </Svg>
  );
}
