import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { FormScreen } from '@/components/form-screen';
import { Icon } from '@/components/icon';
import { ProLocked, useProKitchen } from '@/components/pro-gate';
import { Body, SectionTitle } from '@/components/ui';
import { formatNeededBy, REQUEST_STATUS_LABEL } from '@/lib/custom-orders';
import { formatCents } from '@/lib/money';
import { useStore } from '@/state/store';
import { colors, fonts, radius, spacing } from '@/theme';
import type { CustomRequest, Restaurant } from '@/types';

const PITCH =
  'Take requests for birthday cakes, party trays and catering. Customers describe what they need, you send a price and a pickup time, and they pay in the app.';

export default function CustomRequests() {
  const { restaurant, pro } = useProKitchen();
  if (!restaurant || !pro) return <ProLocked title="Custom orders" icon="cake" pitch={PITCH} />;
  return <RequestsScreen restaurant={restaurant} />;
}

function RequestsScreen({ restaurant }: { restaurant: Restaurant }) {
  const { state } = useStore();
  const mine = state.customRequests
    .filter((r) => r.restaurantId === restaurant.id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const fresh = mine.filter((r) => r.status === 'open');
  const waiting = mine.filter((r) => r.status === 'quoted');
  const done = mine.filter((r) => r.status !== 'open' && r.status !== 'quoted');

  return (
    <FormScreen title="Custom orders">
      <Body muted>
        Customers ask for something off your menu from the bottom of your kitchen page. Send a price and a pickup time,
        and it becomes an order when they accept.
      </Body>
      {mine.length === 0 ? (
        <View style={styles.empty}>
          <Icon name="cake" size={28} color={colors.gold} />
          <Text style={styles.emptyTitle}>No requests yet</Text>
          <Body muted style={{ textAlign: 'center', fontSize: 14 }}>
            Mention custom orders in your next Instagram story. Requests land here.
          </Body>
        </View>
      ) : null}
      {fresh.length ? <SectionTitle>New</SectionTitle> : null}
      {fresh.map((r) => (
        <RequestRow key={r.id} request={r} />
      ))}
      {waiting.length ? <SectionTitle>Waiting on the customer</SectionTitle> : null}
      {waiting.map((r) => (
        <RequestRow key={r.id} request={r} />
      ))}
      {done.length ? <SectionTitle>Earlier</SectionTitle> : null}
      {done.map((r) => (
        <RequestRow key={r.id} request={r} />
      ))}
    </FormScreen>
  );
}

function RequestRow({ request }: { request: CustomRequest }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push({ pathname: '/chef/request/[id]', params: { id: request.id } })}
      style={({ pressed }) => [styles.row, request.status === 'open' && styles.rowNew, pressed && { opacity: 0.8 }]}>
      <View style={{ flex: 1, gap: 3 }}>
        <Text style={[styles.status, request.status === 'open' && { color: colors.gold }]}>
          {request.status === 'quoted' && request.quote
            ? `Price sent · ${formatCents(request.quote.priceCents)}`
            : REQUEST_STATUS_LABEL[request.status]}
        </Text>
        <Text style={styles.title}>
          {request.occasion} for {request.servings}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {request.customerName || 'Customer'} · needed {formatNeededBy(request.neededBy)}
        </Text>
      </View>
      <Icon name="chevron-right" size={18} color={colors.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  empty: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xl },
  emptyTitle: { fontFamily: fonts.semibold, fontSize: 18, color: colors.ivory },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
  },
  rowNew: { borderWidth: 1, borderColor: colors.gold },
  status: { fontFamily: fonts.semibold, fontSize: 12, color: colors.textMuted },
  title: { fontFamily: fonts.semibold, fontSize: 17, color: colors.ivory },
  meta: { fontFamily: fonts.body, fontSize: 13, color: colors.textMuted },
});
