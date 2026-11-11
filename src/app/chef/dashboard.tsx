import { Redirect, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AccountSettings } from '@/components/account-settings';
import { VerifiedSeal } from '@/components/chef';
import { PrepList, WeeklyChart } from '@/components/chef-insights';
import { MessageButton } from '@/components/message-button';
import { OrderCard } from '@/components/order-card';
import { BakeDayCard } from '@/components/bake-day-card';
import { FirstOrders } from '@/components/first-orders';
import { PayoutsCard } from '@/components/payouts-card';
import { registerForPush } from '@/lib/push';
import { supabase } from '@/lib/supabase';
import { Photo } from '@/components/photo';
import { PinnedUpdate } from '@/components/pinned-update';
import { usePullToRefresh } from '@/components/pull-to-refresh';
import { TodayMenu } from '@/components/today-menu';
import { UpdateComposer } from '@/components/update-composer';
import { RatingSummary, ReviewCard } from '@/components/reviews';
import {
  Body,
  Eyebrow,
  Heading,
  type IconName,
  Screen,
  SectionHeader,
  Toggle,
} from '@/components/ui';
import { accentColor } from '@/data/accents';
import { confirmAction, notify } from '@/lib/alert';
import * as haptics from '@/lib/haptics';
import { bakeDayDate, nextBakeDayStatus, upcomingBakeDays } from '@/lib/bake-days';
import { firstOrderSteps, type FirstOrderStep } from '@/lib/launch';
import { formatTime, hoursOn, isOpenAt, nextOpening, WEEKDAYS } from '@/lib/hours';
import { prepList, weeklyEarnings } from '@/lib/insights';
import { formatCents } from '@/lib/money';
import { kitchenFeeNote, kitchenPayout } from '@/lib/pricing';
import { hasPro } from '@/lib/pro';
import { creditLine } from '@/lib/referrals';
import { newRequests } from '@/lib/custom-orders';
import { PRO_FEATURES } from '@/data/pro';
import { chatState } from '@/lib/order-chat';
import { canPostOrderUpdate, ORDER_UPDATE_MAX, orderUpdates } from '@/lib/order-updates';
import { formatClock, isActive, KITCHEN_ACTION_LABEL } from '@/lib/orders';
import { isBakeDayKitchen } from '@/lib/ordering';
import { shareKitchen } from '@/lib/share';
import { newId } from '@/lib/validation';
import { NEXT_STATUSES, storedKitchen } from '@/state/reducer';
import { useMyRestaurant, useReviews, useStore } from '@/state/store';
import { colors, fonts, radius, spacing } from '@/theme';
import type { Order, Restaurant } from '@/types';
import { Icon } from '@/components/icon';
import { EmptyArtwork } from '@/components/empty-state';

export default function ChefDashboard() {
  const { state, dispatch } = useStore();
  const restaurant = useMyRestaurant();
  const [showAccount, setShowAccount] = useState(false);
  const reviews = useReviews(restaurant?.id);
  const refreshControl = usePullToRefresh();
  const isLive = restaurant?.status === 'live';

  // A live kitchen needs to hear about new orders: ask once for notifications.
  useEffect(() => {
    if (supabase && isLive) void registerForPush(supabase, { ask: true });
  }, [isLive]);

  if (!restaurant || restaurant.status !== 'live') return <Redirect href="/chef/setup" />;

  const orders = state.orders.filter((o) => o.restaurantId === restaurant.id);
  // Customers waiting at the door come first.
  const active = orders
    .filter((o) => isActive(o.status))
    .sort((a, b) => Number(!!b.arrivedAt) - Number(!!a.arrivedAt));
  const past = orders.filter((o) => !isActive(o.status));
  const today = new Date().toDateString();
  const todaysSales = orders
    .filter((o) => o.status === 'completed' && new Date(o.createdAt).toDateString() === today)
    .reduce((sum, o) => sum + kitchenPayout(o), 0);
  const inHours = isOpenAt(restaurant, new Date());
  const prep = prepList(state.orders, restaurant.id);
  const week = weeklyEarnings(state.orders, restaurant.id, new Date());
  const live = restaurant.acceptingOrders && inHours;
  const pro = hasPro(restaurant, new Date());
  const newCustom = newRequests(state.customRequests, restaurant.id).length;
  const now = new Date();
  const todaysHours = hoursOn(restaurant, WEEKDAYS.at((now.getDay() + 6) % 7)!);
  const bakeDayKitchen = isBakeDayKitchen(restaurant);
  const bakeStatus = bakeDayKitchen ? nextBakeDayStatus(restaurant, state.orders, now) : null;
  const skippedSet = new Set(restaurant.skippedBakeDays ?? []);
  const skippedDays = bakeDayKitchen
    ? upcomingBakeDays(restaurant, now, { includeSkipped: true }).filter((d) => skippedSet.has(d.date))
    : [];
  // Until the first order arrives, a checklist replaces the empty sales charts.
  const isNew = orders.length === 0;
  const steps = firstOrderSteps(restaurant, state.sharedSteps);
  const saveKitchen = (changes: Partial<Restaurant>) => {
    const stored = storedKitchen(state);
    if (stored) dispatch({ type: 'saveRestaurant', restaurant: { ...stored, ...changes } });
  };
  const onStep = (step: FirstOrderStep) => {
    if (step.id === 'photos') router.push('/chef/setup/menu');
    else if (step.id === 'bio') router.push('/chef/setup/information');
    else if (step.id === 'story') router.push('/chef/share');
    else {
      dispatch({ type: 'markShared', step: 'link' });
      void shareKitchen(restaurant);
    }
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content} refreshControl={refreshControl}>
        <View style={{ gap: spacing.xs }}>
          <Eyebrow>Welcome back, {state.user?.name.split(' ')[0]}</Eyebrow>
          <Heading size={34}>{restaurant.name}</Heading>
          <View style={styles.verifyRow}>
            {restaurant.verified ? (
              <>
                <VerifiedSeal />
                <Text style={styles.verifyText}>Verified kitchen</Text>
              </>
            ) : (
              <>
                <Icon name="progress-clock" size={16} color={colors.textMuted} />
                <Text style={styles.verifyText}>
                  Verification pending. The Manna team will review your documents.
                </Text>
              </>
            )}
          </View>
        </View>

        {bakeDayKitchen ? (
          <BakeDayCard
            status={bakeStatus}
            skipped={skippedDays}
            accepting={restaurant.acceptingOrders}
            now={now}
            onToggleAccepting={(accepting) => dispatch({ type: 'setAcceptingOrders', restaurantId: restaurant.id, accepting })}
            onSkip={(day, count) => {
              if (count > 0) {
                notify(
                  'You have orders for that day',
                  `${count} ${count === 1 ? 'customer has' : 'customers have'} already ordered for ${bakeDayDate(day, now)}. Bake for them, or decline their orders below before skipping.`,
                );
                return;
              }
              confirmAction(
                `Skip ${bakeDayDate(day, now)}?`,
                'Customers won’t be able to order for that day. Your other bake days stay open.',
                'Skip it',
                () => saveKitchen({ skippedBakeDays: [...(restaurant.skippedBakeDays ?? []), day.date] }),
                'Keep it',
              );
            }}
            onUnskip={(day) =>
              saveKitchen({ skippedBakeDays: (restaurant.skippedBakeDays ?? []).filter((d) => d !== day.date) })
            }
          />
        ) : (
          <View style={[styles.statusCard, live && { borderColor: colors.success }]}>
            <View style={[styles.statusDot, { backgroundColor: live ? colors.success : colors.textFaint }]} />
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={styles.statusTitle}>
                {!restaurant.acceptingOrders ? 'Paused' : inHours ? 'Open for orders' : 'Closed for now'}
              </Text>
              <Body muted style={{ fontSize: 13 }}>
                {inHours && todaysHours
                  ? `Today: ${formatTime(todaysHours.open)} – ${formatTime(todaysHours.close)}`
                  : (nextOpening(restaurant, now) ?? 'Set your hours in Kitchen details')}
              </Body>
            </View>
            <Toggle
              accessibilityLabel="Accepting orders"
              value={restaurant.acceptingOrders}
              onValueChange={(accepting) =>
                dispatch({ type: 'setAcceptingOrders', restaurantId: restaurant.id, accepting })
              }
            />
          </View>
        )}

        {state.user ? <PayoutsCard userId={state.user.id} /> : null}

        {isNew ? (
          <FirstOrders steps={steps} onStep={onStep} />
        ) : (
          <View style={styles.stats}>
            <Stat label="Active" value={String(active.length)} />
            <Stat label="Today" value={formatCents(todaysSales)} />
            <Stat label="All time" value={String(orders.length)} />
          </View>
        )}

        <TodayMenu
          restaurant={restaurant}
          orders={state.orders}
          onMenuChange={(menu) => {
            const stored = storedKitchen(state);
            if (stored) dispatch({ type: 'saveRestaurant', restaurant: { ...stored, menu } });
          }}
          onEdit={() => router.push('/chef/setup/menu')}
          day={
            bakeStatus
              ? { date: new Date(bakeStatus.day.pickupStart), label: bakeDayDate(bakeStatus.day, now) }
              : undefined
          }
        />

        <PinnedUpdate
          update={restaurant.update}
          accent={accentColor(restaurant.accent)}
          onPost={({ text, photoUri }) => saveKitchen({ update: { text, photoUri, postedAt: new Date().toISOString() } })}
          onRemove={() => saveKitchen({ update: undefined })}
        />

        {isNew ? null : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Bring your Instagram followers. Make a Story with your QR code"
            onPress={() => router.push('/chef/share')}
            style={({ pressed }) => [styles.growth, pressed && { opacity: 0.8 }]}>
            <View style={styles.growthIcon}>
              <Icon name="export-variant" size={20} color={colors.bg} />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={styles.growthTitle}>Bring your followers</Text>
              <Text style={styles.growthBody}>Make an Instagram Story with your QR code.</Text>
            </View>
            <Icon name="chevron-right" size={20} color={colors.textMuted} />
          </Pressable>
        )}

        {isNew ? null : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Invite a cook and get a month with no Manna fee"
            onPress={() => router.push('/chef/invite')}
            style={({ pressed }) => [styles.growth, pressed && { opacity: 0.8 }]}>
            <View style={styles.growthIcon}>
              <Icon name="chef-hat" size={20} color={colors.bg} />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={styles.growthTitle}>Invite a cook, get a month free</Text>
              <Text style={styles.growthBody}>
                {creditLine(restaurant.feeCreditUntil, now) ?? 'You both skip the Manna fee for a month when they open.'}
              </Text>
            </View>
            <Icon name="chevron-right" size={20} color={colors.textMuted} />
          </Pressable>
        )}

        <SectionHeader eyebrow="Live" title="Incoming orders" />
        {active.length === 0 ? (
          <View style={styles.emptyCard}>
            <EmptyArtwork art="oven" size={56} />
            <Body muted style={{ flex: 1, fontSize: 14 }}>
              No active orders. New orders appear here the moment they’re placed.
            </Body>
          </View>
        ) : null}
        {active.map((order) => (
          <OrderCard key={order.id} order={order} title={order.customerName || 'Customer'} amountCents={kitchenPayout(order)}>
            {order.arrivedAt ? (
              <View style={styles.arrived}>
                <Icon name="map-marker-outline" size={16} color={colors.bg} />
                <Text style={styles.arrivedText}>Here for pickup · {formatClock(order.arrivedAt)}</Text>
              </View>
            ) : null}
            {order.scheduledFor ? null : (
              <View style={styles.pickup}>
                <Icon name="clock-outline" size={16} color={colors.textMuted} />
                <Body muted style={{ flex: 1, fontSize: 13 }}>
                  Pickup when ready, about {formatClock(order.estimatedReadyAt)}
                </Body>
              </View>
            )}
            <View style={styles.actions}>
              {NEXT_STATUSES[order.status].map((status) => {
                const decline = status === 'declined';
                return (
                  <Pressable
                    key={status}
                    accessibilityRole="button"
                    onPress={() => {
                      if (decline) haptics.warning();
                      else haptics.tap();
                      dispatch({ type: 'setOrderStatus', orderId: order.id, status });
                    }}
                    style={({ pressed }) => [
                      styles.action,
                      decline ? styles.decline : styles.primaryAction,
                      pressed && { opacity: 0.8 },
                    ]}>
                    <Text style={[styles.actionText, { color: decline ? colors.danger : colors.bg }]}>
                      {KITCHEN_ACTION_LABEL[status]}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            {chatState(order, new Date()) === 'open' ? (
              <MessageButton
                compact
                orderId={order.id}
                label={`Message ${(order.customerName || 'customer').split(' ')[0]}`}
                onPress={() => router.push({ pathname: '/chat/[orderId]', params: { orderId: order.id } })}
              />
            ) : null}
            {order.status === 'placed' ? null : (
              <OrderUpdates
                order={order}
                onPost={(update) =>
                  dispatch({
                    type: 'postOrderUpdate',
                    orderId: order.id,
                    update: { id: newId('upd'), at: new Date().toISOString(), ...update },
                  })
                }
              />
            )}
          </OrderCard>
        ))}

        {prep.length ? (
          <>
            <SectionHeader title="Today’s prep list" />
            <PrepList items={prep} />
          </>
        ) : null}

        {isNew ? null : <WeeklyChart days={week} note={kitchenFeeNote(restaurant, now)} />}

        <SectionHeader title="Reviews" />
        {reviews.length ? (
          <>
            <RatingSummary restaurant={restaurant} />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: spacing.md, paddingHorizontal: spacing.lg }}
              style={{ marginHorizontal: -spacing.lg }}>
              {reviews.slice(0, 5).map((r) => (
                <ReviewCard
                  key={r.id}
                  review={r}
                  now={new Date()}
                  onReport={() =>
                    confirmAction(
                      'Report this review?',
                      'Report reviews that are abusive, false or not about a real order. Manna’s team checks every report within 24 hours and removes reviews that break the rules.',
                      'Report',
                      () => dispatch({ type: 'reportReview', reviewId: r.id }),
                    )
                  }
                />
              ))}
            </ScrollView>
          </>
        ) : (
          <View style={styles.emptyCard}>
            <EmptyArtwork art="review" size={56} />
            <Body muted style={{ flex: 1, fontSize: 14 }}>
              After each pickup, customers are invited to rate their meal. Reviews will appear here.
            </Body>
          </View>
        )}

        <SectionHeader title="Manna Pro" />
        {pro ? (
          <View style={styles.list}>
            {PRO_FEATURES.filter((f) => f.route).map((f) => (
              <LinkRow
                key={f.key}
                icon={f.icon}
                label={f.key === 'custom' && newCustom ? `${f.title} · ${newCustom} new` : f.title}
                onPress={() => router.push(f.route!)}
              />
            ))}
            <LinkRow icon="star-four-points-outline" label="Your plan" onPress={() => router.push('/chef/pro')} last />
          </View>
        ) : (
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/chef/pro')}
            style={({ pressed }) => [styles.growth, pressed && { opacity: 0.8 }]}>
            <View style={styles.growthIcon}>
              <Icon name="sparkles" size={20} color={colors.bg} />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={styles.growthTitle}>Get featured and take custom orders</Text>
              <Text style={styles.growthBody}>Drops, alerts to your followers, discount codes and more. $19.99 a month or $199 a year.</Text>
            </View>
            <Icon name="chevron-right" size={20} color={colors.textMuted} />
          </Pressable>
        )}

        <SectionHeader title="Manage" />
        <View style={styles.list}>
          <LinkRow icon="book-open-variant" label="Menu" onPress={() => router.push('/chef/setup/menu')} />
          <LinkRow icon="storefront-outline" label="Kitchen details" onPress={() => router.push('/chef/setup/information')} />
          <LinkRow icon="file-document-outline" label="Documents" onPress={() => router.push('/chef/setup/documents')} />
          <LinkRow icon="printer" label="Printable labels" onPress={() => router.push('/chef/labels')} />
          <LinkRow icon="export-variant" label="Share your kitchen on Instagram" onPress={() => router.push('/chef/share')} />
          <LinkRow
            icon="eye-outline"
            label="View my kitchen page"
            onPress={() =>
              router.push({ pathname: '/restaurant/[id]', params: { id: restaurant.id, preview: '1' } })
            }
          />
          <LinkRow
            icon="account-outline"
            label="Account"
            onPress={() => setShowAccount((v) => !v)}
            open={showAccount}
            last
          />
        </View>
        {showAccount ? <AccountSettings /> : null}

        {past.length ? (
          <>
            <SectionHeader title="Past orders" />
            {past.map((order) => (
              <OrderCard compact key={order.id} order={order} title={order.customerName || 'Customer'} amountCents={kitchenPayout(order)} />
            ))}
          </>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

/**
 * Oven updates for one order: a line and a photo that show on the customer's
 * order screen ("Rolls are proofing", a tray fresh out of the oven).
 */
function OrderUpdates({ order, onPost }: { order: Order; onPost: (update: { text: string; photoUri?: string }) => void }) {
  const [composing, setComposing] = useState(false);
  const sent = orderUpdates(order);
  const latest = sent[sent.length - 1];
  const canPost = canPostOrderUpdate(order, { text: 'x' });

  if (composing) {
    return (
      <UpdateComposer
        label="Update for the customer"
        placeholder="Pulling it out of the oven now!"
        hint="They see it on their order, with the photo."
        maxLength={ORDER_UPDATE_MAX}
        postTitle="Send update"
        onPost={(update) => {
          onPost(update);
          setComposing(false);
        }}
        onCancel={() => setComposing(false)}
      />
    );
  }
  return (
    <View style={{ gap: spacing.sm }}>
      {latest ? (
        <View style={styles.sentUpdate}>
          {latest.photoUri ? <Photo uri={latest.photoUri} size="thumb" style={styles.sentThumb} /> : null}
          <Text style={styles.noteText} numberOfLines={2}>
            {latest.text ? `“${latest.text}”` : 'Photo sent'}
            {sent.length > 1 ? <Text style={styles.sentCount}>{`  ·  ${sent.length} updates sent`}</Text> : null}
          </Text>
        </View>
      ) : null}
      {canPost ? (
        <Pressable accessibilityRole="button" onPress={() => setComposing(true)} style={styles.noteRow}>
          <Icon name="camera-plus-outline" size={16} color={colors.gold} />
          <Text style={[styles.noteText, { color: colors.gold }]}>
            {sent.length ? 'Send another update' : 'Send an oven update'}
          </Text>
        </Pressable>
      ) : null}
    </View>
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

function LinkRow({
  icon,
  label,
  onPress,
  open,
  last,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  open?: boolean;
  last?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.linkRow,
        !last && styles.linkRowBorder,
        pressed && { backgroundColor: colors.goldTint },
      ]}>
      <Icon name={icon} size={20} color={colors.gold} />
      <Text style={styles.linkText}>{label}</Text>
      <Icon name={open ? 'chevron-up' : 'chevron-right'} size={20} color={colors.textFaint} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  growth: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  growthIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  growthTitle: { fontFamily: fonts.semibold, fontSize: 16, color: colors.ivory },
  growthBody: { fontFamily: fonts.body, fontSize: 13, color: colors.textMuted },
  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl },
  arrived: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.success,
    borderRadius: radius.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  arrivedText: { fontFamily: fonts.semibold, fontSize: 14, color: colors.bg },
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1.5,
    borderColor: 'transparent',
    borderRadius: radius.md,
    padding: spacing.md,
    backgroundColor: colors.surface,
  },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  statusTitle: { fontFamily: fonts.display, fontSize: 19, color: colors.ivory },
  stats: { flexDirection: 'row', gap: spacing.sm },
  stat: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: 4,
  },
  statValue: { fontFamily: fonts.display, fontSize: 22, color: colors.ivory, fontVariant: ['tabular-nums'] },
  statLabel: {
    fontFamily: fonts.semibold,
    fontSize: 13,
    color: colors.textMuted,
  },
  emptyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.borderStrong,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  pickup: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  // Same shapes as the app's main buttons: an ivory pill to move the order on, an outline to decline.
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
  action: {
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
    minHeight: 46,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryAction: { flex: 2, backgroundColor: colors.ivory },
  decline: { flex: 1, borderWidth: 1, borderColor: colors.borderStrong },
  actionText: { fontFamily: fonts.semibold, fontSize: 15 },
  list: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, minHeight: 56 },
  linkRowBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  verifyRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.xs },
  verifyText: { fontFamily: fonts.medium, fontSize: 12, color: colors.textMuted, flexShrink: 1 },
  noteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    minHeight: 40,
  },
  noteText: { flex: 1, fontFamily: fonts.medium, fontSize: 13, color: colors.text },
  sentUpdate: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  sentThumb: { width: 40, height: 40, borderRadius: radius.sm },
  sentCount: { fontFamily: fonts.body, color: colors.textMuted },
  linkText: { flex: 1, fontFamily: fonts.medium, fontSize: 15, color: colors.text },
});
