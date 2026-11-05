/**
 * Manna design tokens.
 *
 * Taken from the Manna logo: deep black, ivory serif lettering and fine
 * champagne-gold rays. The whole app uses one dark, luxurious palette; gold
 * is an accent (lines, highlights, primary actions), never a background wash.
 */
export const colors = {
  // Surfaces, darkest to lightest.
  bg: '#0A0907',
  surface: '#14120E',
  surfaceRaised: '#1D1A15',
  border: '#2E2A22',
  borderStrong: '#4A4234',
  hairline: 'rgba(205, 165, 88, 0.28)',

  // Gold, from the logo's rays.
  gold: '#CDA558',
  goldBright: '#E6C77F',
  goldDeep: '#9C7A35',
  goldTint: 'rgba(205, 165, 88, 0.12)',
  goldGlow: 'rgba(205, 165, 88, 0.45)',
  onGold: '#140F06',

  // Text, from the logo's ivory lettering.
  ivory: '#FFF5E0',
  text: '#F2E9D8',
  textMuted: '#A89E8C',
  textFaint: '#6F675A',

  success: '#8FC38D',
  danger: '#E8826F',
  overlay: 'rgba(0, 0, 0, 0.72)',
  black: '#000000',
} as const;

/** Gold gradient for primary buttons and highlights. */
export const goldGradient = ['#EBD08E', '#CDA558', '#A8853D'] as const;

export const fonts = {
  /**
   * Cormorant Garamond: a classical serif in the same family of letterforms as
   * the MANNA wordmark. Used for titles, kitchen names and dish names.
   * It draws small for its size, so serif sizes run about 15% larger.
   */
  display: 'CormorantGaramond_600SemiBold',
  displayBold: 'CormorantGaramond_700Bold',
  displayItalic: 'CormorantGaramond_500Medium_Italic',
  /** Manrope: a clean, modern sans for everything else. */
  body: 'Manrope_400Regular',
  medium: 'Manrope_500Medium',
  semibold: 'Manrope_600SemiBold',
  bold: 'Manrope_700Bold',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const radius = {
  sm: 8,
  md: 14,
  lg: 22,
  pill: 999,
} as const;

/** react-native-web colors the Switch knob with its own prop; native uses thumbColor. */
export const webSwitchThumb = { activeThumbColor: '#FFF5E0' } as object;

/** Soft gold glow for primary actions. */
export const goldGlow = {
  shadowColor: colors.gold,
  shadowOpacity: 0.35,
  shadowRadius: 16,
  shadowOffset: { width: 0, height: 6 },
  elevation: 6,
} as const;
