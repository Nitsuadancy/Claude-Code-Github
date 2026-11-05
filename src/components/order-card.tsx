import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { formatCents } from '@/lib/money';
import { formatOrderTime, isActive, ORDER_PROGRESS, ORDER_STATUS_LABEL } from '@/lib/orders';
import { formatSlot } from '@/lib/schedule';
import { colors, fonts, radius, spacing } from '@/theme';
import type { Order } from '@/types';
import { Icon } from './icon';

/** Gold progress bar across placed → accepted → preparing → ready → delivered. */
export function OrderProgress({ order }: { order: Order }) {
  if (order.status === 'declined') return null;
  const step = ORDER_PROGRESS.indexOf(order.status);
  return (
    <View
      style={styles.progress}
      accessibilityLabel={`Step ${step + 1} of ${ORDER_PROGRESS.length}: ${ORDER_STATUS_LABEL[order.status]}`}>
      {ORDER_PROGRESS.map((s, i) => (
        <View key={s} style={[styles.segment, i <= step && { backgroundColor: colors.gold }]} />
      ))}
    </View>
  );
}

export function OrderCard({
  order,
  title,
  children,
}: {
  order: Order;
  title: string;
  children?: ReactNode;
}) {
  const active = isActive(order.status);
  const statusColor =
    order.status === 'declined' ? colors.danger : active ? colors.gold : colors.success;
  return (
    <View style={[styles.card, active && { borderColor: colors.hairline }]}>
      <View style={styles.header}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={[styles.status, { color: statusColor }]}>{ORDER_STATUS_LABEL[order.status]}</Text>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
        </View>
        <Text style={styles.total}>{formatCents(order.totalCents)}</Text>
      </View>
      {active ? <OrderProgress order={order} /> : null}
      {order.scheduledFor && active ? (
        <View style={styles.scheduled}>
          <Icon name="calendar-clock" size={14} color={colors.gold} />
          <Text style={styles.scheduledText}>Scheduled for {formatSlot(order.scheduledFor, new Date())}</Text>
        </View>
      ) : null}
      {order.customerNote ? (
        <View style={styles.request} accessibilityLabel={`Customer note: ${order.customerNote}`}>
          <Icon name="message-alert-outline" size={16} color={colors.gold} />
          <Text style={styles.requestText}>“{order.customerNote}”</Text>
        </View>
      ) : null}
      <View style={{ gap: 2 }}>
        {order.lines.map((l) => (
          <Text key={l.itemId} style={styles.line}>
            {l.quantity} × {l.name}
          </Text>
        ))}
      </View>
      <Text style={styles.meta}>{formatOrderTime(order.createdAt)}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.md + 2,
    gap: spacing.sm + 2,
    backgroundColor: colors.surface,
  },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  title: { fontFamily: fonts.display, fontSize: 23, color: colors.ivory },
  total: { fontFamily: fonts.semibold, fontSize: 15, color: colors.ivory },
  status: {
    fontFamily: fonts.semibold,
    fontSize: 10,
    letterSpacing: 1.8,
    textTransform: 'uppercase',
  },
  progress: { flexDirection: 'row', gap: 4 },
  scheduled: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  request: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.sm + 2,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.hairline,
    backgroundColor: colors.goldTint,
  },
  requestText: { flex: 1, fontFamily: fonts.displayItalic, fontSize: 16, lineHeight: 23, color: colors.ivory },
  scheduledText: { fontFamily: fonts.semibold, fontSize: 12, color: colors.gold },
  segment: { flex: 1, height: 3, borderRadius: 2, backgroundColor: colors.border },
  meta: { fontFamily: fonts.body, fontSize: 12, color: colors.textFaint },
  line: { fontFamily: fonts.body, fontSize: 14, color: colors.text },
});
