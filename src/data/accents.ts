/**
 * Accent colors a cook can choose for their kitchen page and Story card.
 * The rest of Manna stays the same for every kitchen, so the app still feels
 * like one place. Every accent reads at better than 6.9:1 on the page
 * background (WCAG AA needs 4.5:1), and dark text reads on each of them.
 */
export const KITCHEN_ACCENTS = [
  { id: 'champagne', label: 'Champagne', color: '#D4B26E' },
  { id: 'terracotta', label: 'Terracotta', color: '#E2896A' },
  { id: 'sage', label: 'Sage', color: '#9DC59B' },
  { id: 'berry', label: 'Berry', color: '#E58AA8' },
  { id: 'lavender', label: 'Lavender', color: '#B7A4EC' },
  { id: 'sky', label: 'Sky', color: '#86BCE6' },
] as const;

export type AccentId = (typeof KITCHEN_ACCENTS)[number]['id'];

export const DEFAULT_ACCENT: AccentId = 'champagne';

export function isAccentId(value: unknown): value is AccentId {
  return KITCHEN_ACCENTS.some((a) => a.id === value);
}

/** The kitchen's accent color, falling back to Manna's champagne. */
export function accentColor(id: string | undefined): string {
  return KITCHEN_ACCENTS.find((a) => a.id === id)?.color ?? KITCHEN_ACCENTS[0].color;
}
