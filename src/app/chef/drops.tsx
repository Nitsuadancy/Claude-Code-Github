import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { FormScreen } from '@/components/form-screen';
import { Icon } from '@/components/icon';
import { ProLocked, useProKitchen } from '@/components/pro-gate';
import { Body, GoldButton, SectionTitle } from '@/components/ui';
import { formatDropDeadline, formatDropPickup } from '@/lib/drops';
import { useStore } from '@/state/store';
import { colors, fonts, radius, spacing } from '@/theme';
import type { Drop, Restaurant } from '@/types';

const PITCH =
  'Open a one-off menu with its own pickup day and deadline, like “Thanksgiving pies, order by Tuesday.” Drops show on your kitchen page and on the home screen.';

export default function Drops() {
  const { restaurant, pro } = useProKitchen();
  if (!restaurant || !pro) return <ProLocked title="Drops" icon="calendar-clock" pitch={PITCH} />;
  return <DropsScreen restaurant={restaurant} />;
}

function DropsScreen({ restaurant }: { restaurant: Restaurant }) {
  const { state } = useStore();
  const now = new Date();
  const drops = [...(restaurant.drops ?? [])].sort((a, b) => b.pickupStart.localeCompare(a.pickupStart));
  const live = drops.filter((d) => new Date(d.pickupEnd) > now);
  const past = drops.filter((d) => new Date(d.pickupEnd) <= now);
  const ordersFor = (d: Drop) =>
    state.orders.filter((o) => o.dropId === d.id && o.status !== 'declined' && o.status !== 'cancelled').length;

  return (
    <FormScreen
      title="Drops"
      footer={
        <GoldButton
          title="New drop"
          icon="plus"
          onPress={() => router.push({ pathname: '/chef/drop/[id]', params: { id: 'new' } })}
        />
      }>
      <Body muted>
        A drop is a one-off menu with its own pickup day and order deadline. It shows on your kitchen page and in the
        Drops row on the home screen. Tip: send an alert when it opens.
      </Body>
      {drops.length === 0 ? (
        <View style={styles.empty}>
          <Icon name="calendar-clock" size={28} color={colors.gold} />
          <Text style={styles.emptyTitle}>No drops yet</Text>
          <Body muted style={{ textAlign: 'center', fontSize: 14 }}>
            Holiday pies, a summer jam batch, a once-a-month bread: make it a drop and give people a reason to order now.
          </Body>
        </View>
      ) : null}
      {live.length ? <SectionTitle>Coming up</SectionTitle> : null}
      {live.map((d) => (
        <DropRow key={d.id} drop={d} orders={ordersFor(d)} now={now} />
      ))}
      {past.length ? <SectionTitle>Past drops</SectionTitle> : null}
      {past.map((d) => (
        <DropRow key={d.id} drop={d} orders={ordersFor(d)} now={now} />
      ))}
    </FormScreen>
  );
}

function DropRow({ drop, orders, now }: { drop: Drop; orders: number; now: Date }) {
  const open = new Date(drop.closesAt) > now;
  const done = new Date(drop.pickupEnd) <= now;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push({ pathname: '/chef/drop/[id]', params: { id: drop.id } })}
      style={({ pressed }) => [styles.row, pressed && { opacity: 0.8 }]}>
      <View style={{ flex: 1, gap: 3 }}>
        <Text style={[styles.status, { color: open ? colors.success : colors.textMuted }]}>
          {open ? 'Taking orders' : done ? 'Done' : 'Orders closed'} · {orders} {orders === 1 ? 'order' : 'orders'}
        </Text>
        <Text style={styles.title}>{drop.title}</Text>
        <Text style={styles.meta}>{formatDropPickup(drop, now)}</Text>
        {open ? <Text style={styles.meta}>{formatDropDeadline(drop, now)}</Text> : null}
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
  status: { fontFamily: fonts.semibold, fontSize: 12 },
  title: { fontFamily: fonts.semibold, fontSize: 17, color: colors.ivory },
  meta: { fontFamily: fonts.body, fontSize: 13, color: colors.textMuted },
});
