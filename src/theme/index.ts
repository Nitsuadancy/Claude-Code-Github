/**
 * Manna design tokens, taken from the product mockups:
 * deep black canvases for onboarding, white canvases for forms and browsing,
 * and a warm gold accent used for headings, outlines and glows.
 */
export const colors = {
  gold: '#E3AE0A',
  goldLight: '#F5C518',
  goldDark: '#B98800',
  goldTint: '#FFF8E1',
  goldGlow: 'rgba(227, 174, 10, 0.35)',
  black: '#000000',
  surfaceDark: '#0B0A06',
  cardDark: '#14120A',
  white: '#FFFFFF',
  text: '#2B2B2B',
  textMuted: '#7A7A7A',
  textOnDark: '#EDEDED',
  border: '#C9C9C9',
  borderDark: '#3A3A3A',
  danger: '#D64545',
  success: '#2E9E5B',
  overlay: 'rgba(0, 0, 0, 0.6)',
} as const;

export const fonts = {
  heading: 'Montserrat_700Bold',
  headingSemi: 'Montserrat_600SemiBold',
  button: 'Montserrat_500Medium',
  body: 'Raleway_500Medium',
  bodySemi: 'Raleway_600SemiBold',
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
  md: 12,
  lg: 20,
  pill: 999,
} as const;

/** Soft gold glow used under primary buttons and selected cards. */
export const goldGlow = {
  shadowColor: colors.gold,
  shadowOpacity: 0.45,
  shadowRadius: 18,
  shadowOffset: { width: 0, height: 4 },
  elevation: 8,
} as const;
