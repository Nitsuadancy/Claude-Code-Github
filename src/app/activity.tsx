import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';

import { FadeIn, PressableScale } from '@/components/motion';
import { BackButton, Body, Heading, type IconName, Screen } from '@/components/ui';
import { type ActivityItem, buildActivity } from '@/lib/activity';
import { formatClock } from '@/lib/orders';
import { relativeDay } from '@/lib/reviews';
import { useStore } from '@/state/store';
import { colors, fonts, radius, spacing } from '@/theme';
import { Icon } from '@/components/icon';

const ICONS: Record<ActivityItem['kind'], IconName> = {
  placed: 'receipt-text-outline',
  accepted: 'check-circle-outline',
  preparing: 'pot-steam-outline',
  ready: 'bike-fast',
  completed: 'star-outline',
  declined: 'close-circle-outline',
  note: 'message-text-outline',
};

/** Order updates and chef notes, opened from the bell on the home screen. */
export default function Activity() {
  const { state, dispatch } = useStore();
  const items = useMemo(() => buildActivity(state.orders, state.user?.id ?? ''), [state.orders, state.user?.id]);
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
                onPress={() => router.push({ pathname: '/order/[id]', params: { id: item.orderId } })}
                style={[styles.item, fresh && styles.fresh]}>
                <View style={[styles.icon, item.kind === 'note' && { borderColor: colors.gold }]}>
                  <Icon
                    name={ICONS[item.kind]}
                    size={20}
                    color={item.kind === 'declined' ? colors.danger : colors.gold}
                  />
                </View>
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
          <View style={styles.empty}>
            <View style={styles.emptyIcon}>
              <Icon name="bell-outline" size={28} color={colors.gold} />
            </View>
            <Heading size={22} style={{ textAlign: 'center' }}>
              All quiet for now
            </Heading>
            <Body muted style={{ textAlign: 'center' }}>
              Updates from kitchens about your orders will appear here.
            </Body>
          </View>
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
  title: { fontFamily: fonts.display, fontSize: 15, color: colors.ivory },
  body: { fontFamily: fonts.body, fontSize: 13, color: colors.textMuted, lineHeight: 18 },
  note: { fontFamily: fonts.displayItalic, fontSize: 14, color: colors.text },
  when: { fontFamily: fonts.medium, fontSize: 11, color: colors.textFaint, marginTop: 2 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.gold, marginTop: 6 },
  empty: { alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xxl },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 1,
    borderColor: colors.hairline,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
