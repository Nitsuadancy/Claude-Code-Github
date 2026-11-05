import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { formatCents } from '@/lib/money';
import { formatOrderTime, isActive, ORDER_STATUS_LABEL } from '@/lib/orders';
import { colors, fonts, radius, spacing } from '@/theme';
import type { Order } from '@/types';

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
    order.status === 'declined' ? colors.danger : active ? colors.goldDark : colors.success;
  return (
    <View style={[styles.card, active && { borderColor: colors.gold }]}>
      <View style={styles.header}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        <Text style={styles.total}>{formatCents(order.totalCents)}</Text>
      </View>
      <Text style={[styles.status, { color: statusColor }]}>{ORDER_STATUS_LABEL[order.status]}</Text>
      <Text style={styles.meta}>{formatOrderTime(order.createdAt)}</Text>
      <View style={{ gap: 2 }}>
        {order.lines.map((l) => (
          <Text key={l.itemId} style={styles.line}>
            {l.quantity} × {l.name}
          </Text>
        ))}
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.xs,
    backgroundColor: colors.white,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md },
  title: { flex: 1, fontFamily: fonts.headingSemi, fontSize: 17, color: colors.text },
  total: { fontFamily: fonts.headingSemi, fontSize: 17, color: colors.text },
  status: { fontFamily: fonts.bodySemi, fontSize: 15 },
  meta: { fontFamily: fonts.body, fontSize: 13, color: colors.textMuted },
  line: { fontFamily: fonts.body, fontSize: 15, color: colors.text },
});
