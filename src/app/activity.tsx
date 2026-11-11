import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';

import { EmptyState } from '@/components/empty-state';
import { FadeIn, PressableScale } from '@/components/motion';
import { Photo } from '@/components/photo';
import { BackButton, Heading, type IconName, Screen } from '@/components/ui';
import { type ActivityItem, buildActivity } from '@/lib/activity';
import { formatClock } from '@/lib/orders';
import { relativeDay } from '@/lib/reviews';
import { useFollowedAlerts, useStore, useVisibleMessages } from '@/state/store';
import { colors, fonts, radius, spacing } from '@/theme';
import { Icon } from '@/components/icon';

const ICONS: Record<ActivityItem['kind'], IconName> = {
  placed: 'receipt-text-outline',
  accepted: 'check-circle-outline',
  preparing: 'pot-steam-outline',
  ready: 'shopping-outline',
  completed: 'star-outline',
  declined: 'close-circle-outline',
  cancelled: 'close-circle-outline',
  note: 'message-text-outline',
  message: 'message-text-outline',
  alert: 'megaphone',
  quote: 'cake',
};

function openItem(item: ActivityItem) {
  if (item.requestId) router.push({ pathname: '/custom/[id]', params: { id: item.requestId } });
  else if (item.restaurantId) router.push({ pathname: '/restaurant/[id]', params: { id: item.restaurantId } });
  else if (!item.orderId) return;
  else if (item.kind === 'message') router.push({ pathname: '/chat/[orderId]', params: { orderId: item.orderId } });
  else router.push({ pathname: '/order/[id]', params: { id: item.orderId } });
}

/** Order updates, kitchen notes and messages, alerts and custom-order replies, opened from the bell on the home screen. */
export default function Activity() {
  const { state, dispatch } = useStore();
  const visible = useVisibleMessages();
  const alerts = useFollowedAlerts();
  const items = useMemo(
    () => buildActivity(state.orders, state.user?.id ?? '', visible, { alerts, requests: state.customRequests }),
    [state.orders, state.user?.id, visible, alerts, state.customRequests],
  );
  // Remember what was unseen when the screen opened, so new items stay highlighted.
  const [seenBefore] = useState(state.activitySeenAt);

  useEffect(() => {
    dispatch({ type: 'markActivitySeen', at: new Date().toISOString() });
  }, [dispatch]);

  const now = new Date();
  return (
    <Screen>
      <FlatList
        data={items}
        keyExtractor={(i) => i.id}
        contentContainerStyle={styles.content}
        ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
        ListHeaderComponent={
          <View style={styles.header}>
            <BackButton />
            <Heading>Activity</Heading>
          </View>
        }
        renderItem={({ item, index }) => {
          const fresh = !seenBefore || item.at > seenBefore;
          return (
            <FadeIn index={index}>
              <PressableScale
                accessibilityRole="button"
                accessibilityLabel={`${item.title}. ${item.body}`}
                onPress={() => openItem(item)}
                style={[styles.item, fresh && styles.fresh]}>
                {item.photoUri ? (
                  <Photo uri={item.photoUri} size="thumb" style={styles.thumb} />
                ) : (
                  <View style={[styles.icon, item.kind === 'note' && { borderColor: colors.gold }]}>
                    <Icon
                      name={ICONS[item.kind]}
                      size={20}
                      color={item.kind === 'declined' || item.kind === 'cancelled' ? colors.danger : colors.gold}
                    />
                  </View>
                )}
                <View style={{ flex: 1, gap: 3 }}>
                  <Text style={styles.title}>{item.title}</Text>
                  <Text
                    style={[styles.body, item.kind === 'note' && styles.note]}
                    numberOfLines={2}>
                    {item.body}
                  </Text>
                  <Text style={styles.when}>
                    {relativeDay(item.at, now)} · {formatClock(item.at)}
                  </Text>
                </View>
                {fresh ? <View style={styles.dot} accessibilityLabel="New" /> : null}
              </PressableScale>
            </FadeIn>
          );
        }}
        ListEmptyComponent={
          <EmptyState
            art="bell"
            title="All quiet for now"
            body="Updates from kitchens about your orders will appear here."
          />
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  header: { gap: spacing.xs, marginBottom: spacing.lg },
  item: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  fresh: { borderColor: colors.hairline, backgroundColor: '#18140C' },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.hairline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumb: { width: 44, height: 44, borderRadius: radius.md },
  title: { fontFamily: fonts.display, fontSize: 15, color: colors.ivory },
  body: { fontFamily: fonts.body, fontSize: 13, color: colors.textMuted, lineHeight: 18 },
  note: { fontFamily: fonts.displayItalic, fontSize: 14, color: colors.text },
  when: { fontFamily: fonts.medium, fontSize: 11, color: colors.textFaint, marginTop: 2 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.gold, marginTop: 6 },
  empty: { alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xxl },
});
