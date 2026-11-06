/**
 * Manna design tokens.
 *
 * Quiet luxury: a deep neutral black, warm white type and champagne gold kept
 * for the brand and a few highlights. Photography carries the color.
 */
export const colors = {
  // Surfaces, darkest to lightest.
  bg: '#0B0B0B',
  surface: '#161616',
  surfaceRaised: '#1F1F1E',
  border: '#272726',
  borderStrong: '#3B3A37',
  hairline: 'rgba(255, 255, 255, 0.10)',

  // Champagne gold, from the logo's rays.
  gold: '#D4B26E',
  goldBright: '#E8CD92',
  goldDeep: '#A88A4E',
  goldTint: 'rgba(212, 178, 110, 0.12)',
  goldGlow: 'rgba(212, 178, 110, 0.4)',
  onGold: '#141109',

  // Type.
  ivory: '#F7F4EE',
  text: '#ECE9E3',
  textMuted: '#9A968F',
  textFaint: '#64625D',

  success: '#7FC79A',
  danger: '#F08A76',
  overlay: 'rgba(0, 0, 0, 0.72)',
  black: '#000000',
} as const;

/** Gold gradient for primary buttons and highlights. */
export const goldGradient = ['#EBD08E', '#CDA558', '#A8853D'] as const;

export const fonts = {
  /**
   * One typeface, Hanken Grotesk, set large and tight for headlines. The serif
   * lives only in the MANNA wordmark.
   */
  display: 'HankenGrotesk_600SemiBold',
  displayBold: 'HankenGrotesk_700Bold',
  displayItalic: 'HankenGrotesk_400Regular',
  serif: 'HankenGrotesk_400Regular',
  body: 'HankenGrotesk_400Regular',
  medium: 'HankenGrotesk_500Medium',
  semibold: 'HankenGrotesk_600SemiBold',
  bold: 'HankenGrotesk_700Bold',
  mono: 'HankenGrotesk_500Medium',
  monoMedium: 'HankenGrotesk_600SemiBold',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

/** Smooth, generous corners, like iOS. */
export const radius = {
  sm: 10,
  md: 16,
  lg: 24,
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
