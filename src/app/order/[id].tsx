import { router, useLocalSearchParams } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { type ComponentRef, useCallback, useEffect, useRef, useState } from 'react';
import { Linking, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { captureRef } from 'react-native-view-shot';

import { ChefAvatar } from '@/components/chef';
import { Pulse } from '@/components/motion';
import { OrderCelebration } from '@/components/order-celebration';
import { MessageButton } from '@/components/message-button';
import { OrderHelpSheet } from '@/components/order-help-sheet';
import { RateOrderSheet, Stars } from '@/components/reviews';
import { Ticket } from '@/components/ticket';
import {
  BackButton,
  Body,
  Card,
  Eyebrow,
  GoldButton,
  Heading,
  type IconName,
  Screen,
} from '@/components/ui';
import { confirmAction, notify } from '@/lib/alert';
import { addPickupToCalendar } from '@/lib/calendar';
import * as haptics from '@/lib/haptics';
import {
  canCustomerCancel,
  canSayArrived,
  endedWithoutSale,
  formatClock,
  formatOrderTime,
  isActive,
  isAddressShared,
  orderNumber,
  ORDER_HEADLINE,
  ORDER_PROGRESS,
  ORDER_STATUS_LABEL,
  PICKUP_WITHIN_HOURS,
  pickupStatusLine,
} from '@/lib/orders';
import { chatState } from '@/lib/order-chat';
import { directionsUrl, helpTopicsFor, pickupEvent } from '@/lib/order-extras';
import { publicName } from '@/lib/reviews';
import { formatPickup } from '@/lib/schedule';
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
  const [helping, setHelping] = useState(false);
  const [savingReceipt, setSavingReceipt] = useState(false);
  const receipt = useRef<ComponentRef<typeof View>>(null);
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
  const declined = endedWithoutSale(order.status);
  const current = ORDER_PROGRESS.indexOf(order.status);
  const timeFor = (status: string) => order.statusHistory.find((h) => h.status === status)?.at;
  const mine = order.customerId === state.user?.id;
  const addressShared = isAddressShared(order.status) && order.pickupAddress.trim().length > 0;
  const helpTopics = helpTopicsFor(order.status);
  const helpLabel = helpTopics.find((t) => t.kind === order.issue?.kind)?.label;
  const chat = chatState(order, new Date());
  const hasMessages = state.messages.some((m) => m.orderId === order.id);
  const openChat = () => router.push({ pathname: '/chat/[orderId]', params: { orderId: order.id } });

  const saveReceipt = async () => {
    setSavingReceipt(true);
    try {
      // view-shot's types predate React Native's new element type.
      const uri = await captureRef(receipt as Parameters<typeof captureRef>[0], { format: 'png', quality: 1 });
      if (!(await Sharing.isAvailableAsync())) throw new Error('Sharing unavailable');
      haptics.success();
      await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: `Receipt No. ${orderNumber(order.id)}`, UTI: 'public.png' });
    } catch {
      notify('Open Manna on your phone', 'Saving a receipt image works in the Manna app on your phone.');
    } finally {
      setSavingReceipt(false);
    }
  };

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
                  ? formatPickup(order.scheduledFor, order.pickupBy, new Date())
                  : pickupStatusLine(order)}
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
                        <View style={styles.dotNow}>
                          <View style={styles.dotCore} />
                        </View>
                      </Pulse>
                    ) : done ? (
                      <Icon name="check-circle" size={22} color={colors.gold} />
                    ) : (
                      <Icon name="checkbox-blank-circle-outline" size={22} color={colors.borderStrong} />
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
              {order.status === 'cancelled'
                ? 'You cancelled before the kitchen started, so you won’t be charged.'
                : 'The kitchen couldn’t take this order, so you won’t be charged. Try another dish or another kitchen.'}
            </Body>
          </Card>
        )}

        {order.customerId === state.user?.id && canSayArrived(order, new Date()) ? (
          <GoldButton
            title="I’m here"
            icon="map-marker-outline"
            onPress={() => {
              haptics.success();
              dispatch({ type: 'markArrived', orderId: order.id, customerId: order.customerId });
            }}
          />
        ) : null}
        {order.arrivedAt && isActive(order.status) ? (
          <Body muted style={{ textAlign: 'center' }}>
            {chefName} knows you’re here. Hang tight.
          </Body>
        ) : null}

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

        <View ref={receipt} collapsable={false} style={styles.receipt}>
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
              <View style={{ gap: spacing.sm }}>
                <View style={[styles.row, { justifyContent: 'flex-start', gap: spacing.sm }]}>
                  <Icon name="map-marker-outline" size={16} color={colors.textMuted} />
                  <Body muted style={{ flex: 1, fontSize: 13 }}>
                    {isAddressShared(order.status) && order.pickupAddress
                      ? `Pick up at ${order.pickupAddress}`
                      : declined
                        ? 'No pickup needed.'
                        : `Pickup in ${restaurant?.neighborhood || 'the neighborhood'}. The exact address appears here once ${chefName} accepts.`}
                  </Body>
                </View>
                {isAddressShared(order.status) && order.pickupInstructions ? (
                  <View style={[styles.row, { justifyContent: 'flex-start', gap: spacing.sm }]}>
                    <Icon name="home-heart" size={16} color={colors.textMuted} />
                    <Body style={{ flex: 1, fontSize: 13 }}>{order.pickupInstructions}</Body>
                  </View>
                ) : null}
                {isActive(order.status) ? (
                  <Body muted style={{ fontSize: 12, lineHeight: 17 }}>
                    {order.pickupBy
                      ? `Pick up by ${formatClock(order.pickupBy)}.`
                      : `Pick up within ${PICKUP_WITHIN_HOURS} hours of your order being ready.`}{' '}
                    Food that isn’t picked up is still paid to {chefName}, since it was made for you.
                  </Body>
                ) : null}
              </View>
            }
          />
        </View>

        {mine && !declined ? (
          <View style={styles.actions}>
            {isActive(order.status) && addressShared ? (
              <OrderAction
                icon="navigation"
                label="Directions"
                onPress={() => void Linking.openURL(directionsUrl(order.pickupAddress, Platform.OS))}
              />
            ) : null}
            {isActive(order.status) ? (
              <OrderAction
                icon="calendar-plus"
                label="Add to calendar"
                onPress={() => void addPickupToCalendar(pickupEvent(order, restaurant?.neighborhood))}
              />
            ) : null}
            <OrderAction icon="image-down" label="Save receipt" busy={savingReceipt} onPress={saveReceipt} />
          </View>
        ) : null}

        {mine && (chat === 'open' || hasMessages) ? (
          <MessageButton
            orderId={order.id}
            label={chat === 'open' ? `Message ${chefName}` : 'View messages'}
            onPress={openChat}
          />
        ) : null}

        {canCustomerCancel(order.status) && order.customerId === state.user?.id ? (
          <GoldButton
            title="Cancel order"
            variant="ghost"
            onPress={() =>
              confirmAction(
                'Cancel this order?',
                `${chefName} hasn’t started on it yet, so you won’t be charged.`,
                'Cancel order',
                () => dispatch({ type: 'cancelOrder', orderId: order.id, customerId: order.customerId }),
                'Keep it',
              )
            }
          />
        ) : null}

        {restaurant ? (
          <GoldButton
            title={`Visit ${order.restaurantName}`}
            variant="outline"
            onPress={() => router.push({ pathname: '/restaurant/[id]', params: { id: restaurant.id } })}
          />
        ) : null}

        {mine && order.issue ? (
          <View style={styles.issue}>
            <Icon name="lifebuoy" size={18} color={colors.gold} />
            <Body style={{ flex: 1, fontSize: 14 }}>
              We have your message{helpLabel ? ` about “${helpLabel.toLowerCase()}”` : ''}, sent{' '}
              {formatOrderTime(order.issue.at)}. Manna’s team replies within 24 hours.
            </Body>
          </View>
        ) : mine ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => setHelping(true)}
            hitSlop={8}
            style={({ pressed }) => [styles.helpRow, pressed && { opacity: 0.7 }]}>
            <Icon name="lifebuoy" size={18} color={colors.textMuted} />
            <Text style={styles.helpText}>Need help with this order?</Text>
          </Pressable>
        ) : null}
      </ScrollView>

      <OrderHelpSheet
        visible={helping}
        topics={helpTopics}
        onMessageKitchen={
          chat === 'open'
            ? () => {
                setHelping(false);
                openChat();
              }
            : undefined
        }
        kitchenName={chefName}
        onClose={() => setHelping(false)}
        onSend={(kind, note) => {
          haptics.success();
          dispatch({ type: 'reportOrderIssue', orderId: order.id, customerId: order.customerId, kind, note });
          setHelping(false);
        }}
      />

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

/** One of the small square buttons under the receipt (directions, calendar, save). */
function OrderAction({
  icon,
  label,
  onPress,
  busy,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  busy?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ busy: !!busy }}
      disabled={busy}
      onPress={onPress}
      style={({ pressed }) => [styles.action, (pressed || busy) && { backgroundColor: colors.surfaceRaised }]}>
      <Icon name={icon} size={18} color={colors.gold} />
      <Text style={styles.actionText} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  receipt: { backgroundColor: colors.bg },
  actions: { flexDirection: 'row', gap: spacing.sm },
  action: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xs,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  actionText: { fontFamily: fonts.medium, fontSize: 12, color: colors.text },
  helpRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, alignSelf: 'center', paddingVertical: spacing.sm },
  helpText: { fontFamily: fonts.medium, fontSize: 14, color: colors.textMuted },
  issue: { flexDirection: 'row', gap: spacing.md, padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.goldTint },
  ticketNo: { fontFamily: fonts.mono, fontSize: 12, letterSpacing: 0.4, color: colors.textMuted },
  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl },
  header: { gap: spacing.sm, marginTop: spacing.sm },
  eta: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  etaText: { fontFamily: fonts.medium, fontSize: 14, color: colors.text },
  step: { flexDirection: 'row', gap: spacing.md, minHeight: 48 },
  rail: { alignItems: 'center', width: 22 },
  dotNow: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.goldTint,
    borderWidth: 1.5,
    borderColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotCore: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.gold },
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
  totalValue: { fontFamily: fonts.semibold, fontSize: 16, color: colors.gold, fontVariant: ['tabular-nums'] },
});
