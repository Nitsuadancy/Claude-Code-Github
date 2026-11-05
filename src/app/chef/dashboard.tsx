import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';

import { AccountSettings } from '@/components/account-settings';
import { OrderCard } from '@/components/order-card';
import { Body, Divider, Heading, Screen, SectionTitle } from '@/components/ui';
import { formatTime, isOpenAt } from '@/lib/hours';
import { formatCents } from '@/lib/money';
import { isActive, KITCHEN_ACTION_LABEL } from '@/lib/orders';
import { NEXT_STATUSES } from '@/state/reducer';
import { useMyRestaurant, useStore } from '@/state/store';
import { colors, fonts, radius, spacing } from '@/theme';

export default function ChefDashboard() {
  const { state, dispatch } = useStore();
  const restaurant = useMyRestaurant();
  const [showAccount, setShowAccount] = useState(false);

  if (!restaurant || restaurant.status !== 'live') return <Redirect href="/chef/setup" />;

  const orders = state.orders.filter((o) => o.restaurantId === restaurant.id);
  const active = orders.filter((o) => isActive(o.status));
  const past = orders.filter((o) => !isActive(o.status));
  const today = new Date().toDateString();
  const todaysSales = orders
    .filter((o) => o.status === 'completed' && new Date(o.createdAt).toDateString() === today)
    .reduce((sum, o) => sum + o.subtotalCents, 0);
  const inHours = isOpenAt(restaurant, new Date());

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <Body muted>Welcome back, {state.user?.name.split(' ')[0]}</Body>
        <Heading>{restaurant.name}</Heading>

        <View style={styles.statusCard}>
          <View style={{ flex: 1 }}>
            <Text style={styles.statusTitle}>
              {restaurant.acceptingOrders ? 'Accepting orders' : 'Paused'}
            </Text>
            <Body muted style={{ fontSize: 14 }}>
              {inHours
                ? `Within your hours (${formatTime(restaurant.openTime)}–${formatTime(restaurant.closeTime)})`
                : `Outside your hours. Opens ${formatTime(restaurant.openTime)}.`}
            </Body>
          </View>
          <Switch
            accessibilityLabel="Accepting orders"
            value={restaurant.acceptingOrders}
            trackColor={{ true: colors.gold, false: colors.border }}
            thumbColor={colors.white}
            onValueChange={(accepting) =>
              dispatch({ type: 'setAcceptingOrders', restaurantId: restaurant.id, accepting })
            }
          />
        </View>

        <View style={styles.stats}>
          <Stat label="Active orders" value={String(active.length)} />
          <Stat label="Today’s sales" value={formatCents(todaysSales)} />
          <Stat label="All-time orders" value={String(orders.length)} />
        </View>

        <SectionTitle>Incoming orders</SectionTitle>
        {active.length === 0 ? (
          <Body muted>No active orders. New orders show up here as soon as they’re placed.</Body>
        ) : null}
        {active.map((order) => (
          <OrderCard key={order.id} order={order} title={order.customerName || 'Customer'}>
            <Body muted style={{ fontSize: 14 }}>
              Deliver to: {order.deliveryAddress}
            </Body>
            <View style={styles.actions}>
              {NEXT_STATUSES[order.status].map((status) => (
                <Pressable
                  key={status}
                  accessibilityRole="button"
                  onPress={() => dispatch({ type: 'setOrderStatus', orderId: order.id, status })}
                  style={[styles.action, status === 'declined' && styles.decline]}>
                  <Text style={[styles.actionText, status === 'declined' && { color: colors.danger }]}>
                    {KITCHEN_ACTION_LABEL[status]}
                  </Text>
                </Pressable>
              ))}
            </View>
          </OrderCard>
        ))}

        <SectionTitle>Manage</SectionTitle>
        <View style={styles.links}>
          <LinkRow label="Edit menu" onPress={() => router.push('/chef/setup/menu')} />
          <LinkRow label="Edit restaurant information" onPress={() => router.push('/chef/setup/information')} />
          <LinkRow label="Documents" onPress={() => router.push('/chef/setup/documents')} />
          <LinkRow
            label="View my restaurant page"
            onPress={() =>
              router.push({ pathname: '/restaurant/[id]', params: { id: restaurant.id, preview: '1' } })
            }
          />
          <LinkRow label={showAccount ? 'Hide account' : 'Account'} onPress={() => setShowAccount((v) => !v)} />
        </View>
        {showAccount ? <AccountSettings showAddress={false} /> : null}

        {past.length ? (
          <>
            <SectionTitle>Past orders</SectionTitle>
            {past.map((order) => (
              <OrderCard key={order.id} order={order} title={order.customerName || 'Customer'} />
            ))}
          </>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function LinkRow({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <>
      <Pressable accessibilityRole="button" onPress={onPress} style={styles.linkRow}>
        <Text style={styles.linkText}>{label}</Text>
        <Text style={styles.chevron}>›</Text>
      </Pressable>
      <Divider />
    </>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1.5,
    borderColor: colors.gold,
    borderRadius: radius.lg,
    padding: spacing.md,
    backgroundColor: colors.goldTint,
  },
  statusTitle: { fontFamily: fonts.headingSemi, fontSize: 18, color: colors.text },
  stats: { flexDirection: 'row', gap: spacing.sm },
  stat: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: 2,
  },
  statValue: { fontFamily: fonts.heading, fontSize: 20, color: colors.text },
  statLabel: { fontFamily: fonts.body, fontSize: 13, color: colors.textMuted },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm, flexWrap: 'wrap' },
  action: {
    borderWidth: 1.5,
    borderColor: colors.gold,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
    minHeight: 44,
    justifyContent: 'center',
  },
  decline: { borderColor: colors.danger },
  actionText: { fontFamily: fonts.button, fontSize: 15, color: colors.text },
  links: {},
  linkRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: 52 },
  linkText: { fontFamily: fonts.body, fontSize: 17, color: colors.text },
  chevron: { fontSize: 24, color: colors.textMuted },
});
