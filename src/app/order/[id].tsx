import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ChefAvatar } from '@/components/chef';
import { Pulse } from '@/components/motion';
import { OrderCelebration } from '@/components/order-celebration';
import { RateOrderSheet, Stars } from '@/components/reviews';
import { Ticket } from '@/components/ticket';
import {
  BackButton,
  Body,
  Card,
  Eyebrow,
  GoldButton,
  Heading,
  Screen,
} from '@/components/ui';
import * as haptics from '@/lib/haptics';
import { formatClock, formatOrderTime, isActive, isAddressShared, orderNumber, ORDER_HEADLINE, ORDER_PROGRESS, ORDER_STATUS_LABEL } from '@/lib/orders';
import { publicName } from '@/lib/reviews';
import { formatSlot } from '@/lib/schedule';
import { newId } from '@/lib/validation';
import { useRestaurant, useStore } from '@/state/store';
import { colors, fonts, radius, spacing } from '@/theme';
import { Icon } from '@/components/icon';

/** Live tracking for one order, with a celebration when it was just placed. */
export default function OrderTracking() {
  const { id, celebrate } = useLocalSearchParams<{ id: string; celebrate?: string }>();
  const { state, dispatch } = useStore();
  const order = state.orders.find((o) => o.id === id);
  const restaurant = useRestaurant(order?.restaurantId);
  const [celebrating, setCelebrating] = useState(celebrate === '1');
  const [rating, setRating] = useState(false);
  const myReview = state.reviews.find((r) => r.orderId === id);
  const endCelebration = useCallback(() => setCelebrating(false), []);

  useEffect(() => {
    if (celebrate === '1') haptics.success();
  }, [celebrate]);

  if (!order) {
    return (
      <Screen style={{ padding: spacing.lg, gap: spacing.lg }}>
        <BackButton />
        <Body>That order couldn’t be found.</Body>
      </Screen>
    );
  }

  const chefName = restaurant?.chefName ?? order.restaurantName;
  const declined = order.status === 'declined';
  const current = ORDER_PROGRESS.indexOf(order.status);
  const timeFor = (status: string) => order.statusHistory.find((h) => h.status === status)?.at;

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <BackButton
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/foodie/orders'))}
        />

        <View style={styles.header}>
          <Text style={styles.ticketNo}>
            No. {orderNumber(order.id)} · {order.restaurantName}
          </Text>
          <Heading size={30}>{ORDER_HEADLINE[order.status]}</Heading>
          {isActive(order.status) ? (
            <View style={styles.eta}>
              <Icon name="timer-sand" size={16} color={colors.gold} />
              <Text style={styles.etaText}>
                {order.scheduledFor
                  ? `Pickup ${formatSlot(order.scheduledFor, new Date())}`
                  : `Estimated ready by ${formatClock(order.estimatedReadyAt)}`}
              </Text>
            </View>
          ) : null}
        </View>

        {!declined ? (
          <Card>
            {ORDER_PROGRESS.map((status, i) => {
              const done = i <= current;
              const now = i === current && isActive(order.status);
              const at = timeFor(status);
              const last = i === ORDER_PROGRESS.length - 1;
              return (
                <View key={status} style={styles.step}>
                  <View style={styles.rail}>
                    {now ? (
                      <Pulse size={22} color={colors.gold}>
                        <View style={[styles.dot, styles.dotNow]} />
                      </Pulse>
                    ) : (
                      <View style={[styles.dot, done && styles.dotDone]}>
                        {done ? <Icon name="check" size={12} color={colors.onGold} /> : null}
                      </View>
                    )}
                    {!last ? <View style={[styles.line, i < current && { backgroundColor: colors.gold }]} /> : null}
                  </View>
                  <View style={styles.stepText}>
                    <Text style={[styles.stepLabel, !done && { color: colors.textFaint }, now && { color: colors.gold }]}>
                      {ORDER_STATUS_LABEL[status]}
                    </Text>
                    {at && done ? <Text style={styles.stepTime}>{formatClock(at)}</Text> : null}
                  </View>
                </View>
              );
            })}
          </Card>
        ) : (
          <Card>
            <Body>
              The kitchen couldn’t take this order, so you won’t be charged. Try another dish or
              another kitchen.
            </Body>
          </Card>
        )}

        {order.status === 'completed' && !myReview && order.customerId === state.user?.id ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => setRating(true)}
            style={({ pressed }) => [styles.rateCard, pressed && { opacity: 0.85 }]}>
            <View style={{ flex: 1, gap: 4 }}>
              <Eyebrow>How was it?</Eyebrow>
              <Text style={styles.rateTitle}>Rate your meal from {chefName}</Text>
            </View>
            <Stars value={0} size={20} />
          </Pressable>
        ) : null}
        {myReview ? (
          <View style={styles.thanks}>
            <Stars value={myReview.stars} size={16} />
            <Text style={styles.thanksText}>Thanks for your review. It helps {chefName} grow.</Text>
          </View>
        ) : null}

        {order.chefNote ? (
          <View style={styles.note}>
            <ChefAvatar name={chefName} photoUri={restaurant?.chefPhotoUri} size={44} />
            <View style={{ flex: 1, gap: 4 }}>
              <Eyebrow>A note from {chefName}</Eyebrow>
              <Text style={styles.noteText}>“{order.chefNote}”</Text>
            </View>
          </View>
        ) : null}

        <Ticket
          heading={`No. ${orderNumber(order.id)} · ${formatOrderTime(order.createdAt)}`}
          items={order.lines.map((l) => ({ label: `${l.quantity} × ${l.name}`, cents: l.priceCents * l.quantity }))}
          charges={[
            { label: 'Subtotal', cents: order.subtotalCents },
            { label: 'Movement fee', cents: order.movementFeeCents },
            ...(order.deliveryFeeCents ? [{ label: 'Delivery', cents: order.deliveryFeeCents }] : []),
            ...(order.tipCents ? [{ label: `Tip for ${chefName}`, cents: order.tipCents }] : []),
          ]}
          totalCents={order.totalCents}
          footer={
            <View style={[styles.row, { justifyContent: 'flex-start', gap: spacing.sm }]}>
              <Icon name="map-marker-outline" size={16} color={colors.textMuted} />
              <Body muted style={{ flex: 1, fontSize: 13 }}>
                {isAddressShared(order.status) && order.pickupAddress
                  ? `Pick up at ${order.pickupAddress}`
                  : order.status === 'declined'
                    ? 'No pickup needed.'
                    : `Pickup in ${restaurant?.neighborhood || 'the neighborhood'}. The exact address appears here once ${chefName} accepts.`}
              </Body>
            </View>
          }
        />

        {restaurant ? (
          <GoldButton
            title={`Visit ${order.restaurantName}`}
            variant="outline"
            onPress={() => router.push({ pathname: '/restaurant/[id]', params: { id: restaurant.id } })}
          />
        ) : null}
      </ScrollView>

      <RateOrderSheet
        visible={rating}
        restaurantName={order.restaurantName}
        chefName={chefName}
        onClose={() => setRating(false)}
        onSubmit={(stars, tags, text) => {
          if (!state.user) return;
          dispatch({
            type: 'addReview',
            review: {
              id: newId('review'),
              orderId: order.id,
              restaurantId: order.restaurantId,
              customerId: state.user.id,
              customerName: publicName(state.user.name),
              stars,
              tags,
              text,
              createdAt: new Date().toISOString(),
            },
          });
          setRating(false);
        }}
      />

      {celebrating ? <OrderCelebration chefName={chefName} onDone={endCelebration} /> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  ticketNo: { fontFamily: fonts.mono, fontSize: 12, letterSpacing: 0.4, color: colors.textMuted },
  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl },
  header: { gap: spacing.sm, marginTop: spacing.sm },
  eta: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  etaText: { fontFamily: fonts.medium, fontSize: 14, color: colors.text },
  step: { flexDirection: 'row', gap: spacing.md, minHeight: 48 },
  rail: { alignItems: 'center', width: 22 },
  dot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  dotDone: { backgroundColor: colors.gold, borderColor: colors.gold },
  dotNow: { backgroundColor: colors.surface, borderWidth: 6, borderColor: colors.gold },
  line: { flex: 1, width: 1, backgroundColor: colors.borderStrong, marginVertical: 2 },
  stepText: { flex: 1, flexDirection: 'row', justifyContent: 'space-between', paddingTop: 1 },
  stepLabel: { fontFamily: fonts.medium, fontSize: 15, color: colors.text },
  stepTime: { fontFamily: fonts.body, fontSize: 12, color: colors.textMuted },
  note: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.hairline,
    backgroundColor: colors.goldTint,
  },
  rateCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.gold,
    backgroundColor: colors.goldTint,
  },
  rateTitle: { fontFamily: fonts.display, fontSize: 18, color: colors.ivory },
  thanks: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  thanksText: { flex: 1, fontFamily: fonts.medium, fontSize: 13, color: colors.textMuted },
  noteText: { fontFamily: fonts.displayItalic, fontSize: 16, lineHeight: 26, color: colors.ivory },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  line1: { fontFamily: fonts.body, fontSize: 14, color: colors.text },
  fee: { fontFamily: fonts.body, fontSize: 13, color: colors.textMuted },
  totalLabel: { fontFamily: fonts.display, fontSize: 18, color: colors.ivory },
  totalValue: { fontFamily: fonts.semibold, fontSize: 16, color: colors.gold },
});
