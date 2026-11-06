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
   * Gloock: a high-contrast display serif with the presence of a fine-dining
   * menu. Titles, kitchen names and dish names. It has one weight.
   */
  display: 'Gloock_400Regular',
  displayBold: 'Gloock_400Regular',
  /** Newsreader italic: chef bylines, dish descriptions, quotes. */
  displayItalic: 'Newsreader_400Regular_Italic',
  serif: 'Newsreader_400Regular',
  /** Instrument Sans: the interface. */
  body: 'InstrumentSans_400Regular',
  medium: 'InstrumentSans_500Medium',
  semibold: 'InstrumentSans_600SemiBold',
  bold: 'InstrumentSans_700Bold',
  /** DM Mono: order tickets, order numbers and pickup times, like a kitchen printer. */
  mono: 'DMMono_400Regular',
  monoMedium: 'DMMono_500Medium',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

/** Near-square corners, like printed menus and tickets. Pills only for avatars. */
export const radius = {
  sm: 2,
  md: 4,
  lg: 6,
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
