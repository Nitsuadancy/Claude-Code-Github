import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { formatCents } from '@/lib/money';
import { colors, fonts, radius, spacing } from '@/theme';

export interface TicketLine {
  label: string;
  cents: number;
}

/**
 * A receipt in the style of a kitchen ticket: a dashed outline, dot leaders
 * and amounts in mono, with the total set large.
 */
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
      <Text style={styles.leader} numberOfLines={1} ellipsizeMode="clip">
        {' . '.repeat(40)}
      </Text>
      <Text style={[styles.amount, strong && { color: colors.text }]}>{formatCents(cents)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  ticket: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.borderStrong,
    borderRadius: radius.sm,
    padding: spacing.md,
    gap: spacing.md,
  },
  heading: { fontFamily: fonts.mono, fontSize: 12, letterSpacing: 0.4, color: colors.textMuted },
  block: { gap: 6 },
  row: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm },
  label: { fontFamily: fonts.body, fontSize: 14, color: colors.textMuted, flexShrink: 1 },
  leader: { flex: 1, minWidth: 12, fontFamily: fonts.mono, fontSize: 11, color: colors.textFaint, overflow: 'hidden' },
  amount: { fontFamily: fonts.mono, fontSize: 14, color: colors.textMuted },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.borderStrong,
  },
  totalLabel: { fontFamily: fonts.display, fontSize: 22, color: colors.ivory },
  totalValue: { fontFamily: fonts.monoMedium, fontSize: 18, color: colors.gold },
});
