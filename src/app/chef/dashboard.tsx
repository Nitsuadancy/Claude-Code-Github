import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AccountSettings } from '@/components/account-settings';
import { VerifiedSeal } from '@/components/chef';
import { PrepList, WeeklyChart } from '@/components/chef-insights';
import { OrderCard } from '@/components/order-card';
import { BakeDayCard } from '@/components/bake-day-card';
import { FirstOrders } from '@/components/first-orders';
import { PinnedUpdate } from '@/components/pinned-update';
import { TodayMenu } from '@/components/today-menu';
import { RatingSummary, ReviewCard } from '@/components/reviews';
import {
  Body,
  Eyebrow,
  GoldButton,
  Heading,
  type IconName,
  Screen,
  SectionHeader,
  TextField,
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
import { formatClock, isActive, KITCHEN_ACTION_LABEL } from '@/lib/orders';
import { isBakeDayKitchen } from '@/lib/ordering';
import { shareKitchen } from '@/lib/share';
import { NEXT_STATUSES, storedKitchen } from '@/state/reducer';
import { useMyRestaurant, useReviews, useStore } from '@/state/store';
import { colors, fonts, radius, spacing } from '@/theme';
import type { Restaurant } from '@/types';
import { Icon } from '@/components/icon';
import { EmptyArtwork } from '@/components/empty-state';

export default function ChefDashboard() {
  const { state, dispatch } = useStore();
  const restaurant = useMyRestaurant();
  const [showAccount, setShowAccount] = useState(false);
  const reviews = useReviews(restaurant?.id);

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
    .reduce((sum, o) => sum + o.subtotalCents + (o.tipCents ?? 0), 0);
  const inHours = isOpenAt(restaurant, new Date());
  const prep = prepList(state.orders, restaurant.id);
  const week = weeklyEarnings(state.orders, restaurant.id, new Date());
  const live = restaurant.acceptingOrders && inHours;
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
      <ScrollView contentContainerStyle={styles.content}>
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
          onPost={(text) => saveKitchen({ update: { text, postedAt: new Date().toISOString() } })}
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
          <OrderCard key={order.id} order={order} title={order.customerName || 'Customer'}>
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
                    <Text style={[styles.actionText, { color: decline ? colors.danger : colors.onGold }]}>
                      {KITCHEN_ACTION_LABEL[status]}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <NoteEditor
              note={order.chefNote}
              onSave={(note) => dispatch({ type: 'setOrderNote', orderId: order.id, note })}
            />
          </OrderCard>
        ))}

        {prep.length ? (
          <>
            <SectionHeader title="Today’s prep list" />
            <PrepList items={prep} />
          </>
        ) : null}

        {isNew ? null : <WeeklyChart days={week} />}

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

        <SectionHeader title="Manage" />
        <View style={styles.list}>
          <LinkRow icon="book-open-variant" label="Menu" onPress={() => router.push('/chef/setup/menu')} />
          <LinkRow icon="storefront-outline" label="Kitchen details" onPress={() => router.push('/chef/setup/information')} />
          <LinkRow icon="file-document-outline" label="Documents" onPress={() => router.push('/chef/setup/documents')} />
          <LinkRow icon="export-variant" label="Share your kitchen on Instagram" onPress={() => router.push('/chef/share')} />
          <LinkRow
            icon="star-four-points-outline"
            label={restaurant.founding ? 'Manna Pro · free for your first year' : 'Manna Pro · coming soon'}
            onPress={() => router.push('/chef/pro')}
          />
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
              <OrderCard key={order.id} order={order} title={order.customerName || 'Customer'} />
            ))}
          </>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

/** Lets the chef send a short personal note that shows on the customer's tracking screen. */
function NoteEditor({ note, onSave }: { note: string; onSave: (note: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(note);
  if (!editing) {
    return (
      <Pressable
        accessibilityRole="button"
        onPress={() => {
          setDraft(note);
          setEditing(true);
        }}
        style={styles.noteRow}>
        <Icon name="message-text-outline" size={16} color={colors.gold} />
        <Text style={[styles.noteText, !note && { color: colors.gold }]} numberOfLines={2}>
          {note ? `“${note}”` : 'Add a note for the customer'}
        </Text>
      </Pressable>
    );
  }
  return (
    <View style={{ gap: spacing.sm }}>
      <TextField
        placeholder="Pulling it out of the oven now!"
        value={draft}
        onChangeText={setDraft}
        maxLength={280}
        autoFocus
        accessibilityLabel="Note for the customer"
      />
      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        <GoldButton title="Cancel" variant="ghost" fullWidth={false} onPress={() => setEditing(false)} style={{ minWidth: 0, flex: 1 }} />
        <GoldButton
          title="Send note"
          fullWidth={false}
          onPress={() => {
            onSave(draft);
            setEditing(false);
          }}
          style={{ minWidth: 0, flex: 1 }}
        />
      </View>
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
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs, flexWrap: 'wrap' },
  action: {
    borderRadius: radius.sm,
    paddingHorizontal: spacing.lg,
    minHeight: 44,
    justifyContent: 'center',
  },
  primaryAction: { backgroundColor: colors.gold },
  decline: { borderWidth: 1, borderColor: colors.danger },
  actionText: { fontFamily: fonts.semibold, fontSize: 14, letterSpacing: 0.3 },
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
  linkText: { flex: 1, fontFamily: fonts.medium, fontSize: 15, color: colors.text },
});
