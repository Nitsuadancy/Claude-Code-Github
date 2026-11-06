import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { formatCents } from '@/lib/money';
import { colors, fonts, radius, spacing } from '@/theme';

export interface TicketLine {
  label: string;
  cents: number;
}

/** The order summary: items, charges and a large total, on a quiet card. */
export function Ticket({
  heading,
  items = [],
  charges,
  totalCents,
  footer,
}: {
  /** Mono line at the top, e.g. "No. 0472 · Cafe Parmesan". */
  heading?: string;
  items?: TicketLine[];
  charges: TicketLine[];
  totalCents: number;
  footer?: ReactNode;
}) {
  return (
    <View style={styles.ticket}>
      {heading ? <Text style={styles.heading}>{heading}</Text> : null}
      {items.length ? (
        <View style={styles.block}>
          {items.map((l) => (
            <TicketRow key={l.label} label={l.label} cents={l.cents} strong />
          ))}
        </View>
      ) : null}
      <View style={styles.block}>
        {charges.map((l) => (
          <TicketRow key={l.label} label={l.label} cents={l.cents} />
        ))}
      </View>
      <View style={styles.totalRow}>
        <Text style={styles.totalLabel}>Total</Text>
        <Text style={styles.totalValue}>{formatCents(totalCents)}</Text>
      </View>
      {footer}
    </View>
  );
}

function TicketRow({ label, cents, strong }: TicketLine & { strong?: boolean }) {
  return (
    <View style={styles.row} accessible accessibilityLabel={`${label}, ${formatCents(cents)}`}>
      <Text style={[styles.label, strong && { color: colors.text }]} numberOfLines={2}>
        {label}
      </Text>
      <Text style={[styles.amount, strong && { color: colors.text }]}>{formatCents(cents)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  ticket: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md + 2,
    gap: spacing.md,
  },
  heading: { fontFamily: fonts.medium, fontSize: 13, color: colors.textFaint },
  block: { gap: 6 },
  row: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: spacing.md },
  label: { fontFamily: fonts.body, fontSize: 14, color: colors.textMuted, flexShrink: 1 },
  amount: { fontFamily: fonts.medium, fontSize: 14, color: colors.textMuted, fontVariant: ['tabular-nums'] },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderStrong,
  },
  totalLabel: { fontFamily: fonts.display, fontSize: 20, letterSpacing: -0.4, color: colors.ivory },
  totalValue: { fontFamily: fonts.display, fontSize: 20, letterSpacing: -0.4, color: colors.ivory, fontVariant: ['tabular-nums'] },
});
