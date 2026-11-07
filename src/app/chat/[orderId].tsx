import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Icon } from '@/components/icon';
import { OptionSheet } from '@/components/option-sheet';
import { Body, GoldButton, Screen } from '@/components/ui';
import { confirmAction } from '@/lib/alert';
import * as haptics from '@/lib/haptics';
import {
  CHAT_CLOSES_HOURS,
  chatState,
  kitchenParticipantId,
  MESSAGE_MAX,
  mentionsOffAppPayment,
  messageDayLabel,
  quickReplies,
  sideFor,
  visibleMessages,
} from '@/lib/order-chat';
import { formatClock, orderNumber, ORDER_STATUS_LABEL } from '@/lib/orders';
import { isBackendConfigured } from '@/lib/supabase';
import { newId } from '@/lib/validation';
import { useRestaurant, useStore } from '@/state/store';
import { colors, fonts, radius, spacing } from '@/theme';
import type { OrderMessage } from '@/types';

type Row = { kind: 'day'; key: string; label: string } | { kind: 'message'; key: string; message: OrderMessage; last: boolean };

/**
 * The chat for one order, between the customer and the kitchen: changes,
 * timing and pickup. Opens when the kitchen accepts and closes a day after
 * pickup. Phone numbers stay private.
 */
export default function OrderChat() {
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const { state, dispatch } = useStore();
  const order = state.orders.find((o) => o.id === orderId);
  const restaurant = useRestaurant(order?.restaurantId);
  const [draft, setDraft] = useState('');
  const [menu, setMenu] = useState(false);
  const now = new Date();

  const me = state.user?.id ?? '';
  const kitchenId = restaurant ? kitchenParticipantId(restaurant) : `kitchen:${order?.restaurantId ?? ''}`;
  const side = order ? sideFor(order, me, kitchenId) : null;
  const otherId = side === 'customer' ? kitchenId : (order?.customerId ?? '');
  const openOrderId = order?.id;
  // The React Compiler memoizes these; no useMemo needed.
  const messages = openOrderId
    ? visibleMessages(state.messages, openOrderId, me, state.reportedMessageIds, state.blocks)
    : [];
  const latest = messages[messages.length - 1]?.at;

  // Opening the chat, or a new message arriving while it's open, counts as reading it.
  useEffect(() => {
    if (openOrderId && side) dispatch({ type: 'markChatRead', orderId: openOrderId, userId: me, at: latest });
  }, [openOrderId, side, me, latest, dispatch]);

  const rows = (() => {
    const out: Row[] = [];
    let day = '';
    messages.forEach((m, i) => {
      const label = messageDayLabel(m.at, new Date());
      if (label !== day) {
        out.push({ kind: 'day', key: `day:${m.at}`, label });
        day = label;
      }
      const next = messages[i + 1];
      const last = !next || next.senderId !== m.senderId || Date.parse(next.at) - Date.parse(m.at) > 5 * 60_000;
      out.push({ kind: 'message', key: m.id, message: m, last });
    });
    // The list is inverted so it starts at the newest message.
    return out.reverse();
  })();

  if (!order || !side) {
    return (
      <Screen style={{ padding: spacing.lg, gap: spacing.lg }}>
        <BackRow />
        <Body>This chat isn’t available.</Body>
      </Screen>
    );
  }

  const chefName = restaurant?.chefName ?? order.restaurantName;
  const otherName = side === 'customer' ? chefName : order.customerName || 'the customer';
  // Cooks often go by a title ("Mrs. Susie"), so only the customer's name is shortened.
  const otherFirst = side === 'customer' ? chefName : otherName.split(' ')[0];
  const title = side === 'customer' ? order.restaurantName : order.customerName || 'Customer';
  const status = chatState(order, now);
  const iBlocked = state.blocks.some((b) => b.blockerId === me && b.blockedId === otherId);
  const theyBlocked = state.blocks.some((b) => b.blockerId === otherId && b.blockedId === me);
  const canType = status === 'open' && !iBlocked && !theyBlocked;
  const offApp = mentionsOffAppPayment(draft);

  const send = (text: string) => {
    if (!text.trim()) return;
    haptics.tap();
    dispatch({ type: 'sendMessage', orderId: order.id, senderId: me, kitchenId, text, id: newId('msg') });
    setDraft('');
  };

  const report = (m: OrderMessage) =>
    confirmAction(
      'Report this message?',
      'It will be hidden for you and sent to Manna’s team, who check every report within 24 hours.',
      'Report',
      () => {
        haptics.warning();
        dispatch({ type: 'reportMessage', messageId: m.id });
      },
    );

  const block = () =>
    confirmAction(
      `Block ${otherName}?`,
      `${otherFirst} won’t be able to message you, and you won’t see their messages. Your order isn’t affected. You can unblock them from this chat.`,
      'Block',
      () => {
        haptics.warning();
        dispatch({ type: 'blockUser', blockerId: me, blockedId: otherId });
      },
    );

  return (
    <Screen>
      <View style={styles.header}>
        <BackRow />
        <View style={{ flex: 1 }}>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          <Text style={styles.subtitle} numberOfLines={1}>
            No. {orderNumber(order.id)} · {ORDER_STATUS_LABEL[order.status]}
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Chat options"
          hitSlop={10}
          onPress={() => setMenu(true)}
          style={({ pressed }) => [styles.headerButton, pressed && { opacity: 0.7 }]}>
          <Icon name="dots-horizontal" size={22} color={colors.ivory} />
        </Pressable>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}>
        <FlatList
          inverted
          data={rows}
          keyExtractor={(r) => r.key}
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          // Inverted: the footer sits at the top, above the first message.
          ListFooterComponent={
            <View style={styles.intro}>
              <Icon name="message-text-outline" size={20} color={colors.gold} />
              <Text style={styles.introText}>
                Message {otherFirst} about this order: changes, timing or pickup. Your phone number stays private, and
                the chat closes {CHAT_CLOSES_HOURS} hours after pickup.
              </Text>
              {!isBackendConfigured ? (
                <Text style={styles.demo}>Demo: messages stay on this phone until Manna’s servers are connected.</Text>
              ) : null}
            </View>
          }
          renderItem={({ item }) =>
            item.kind === 'day' ? (
              <Text style={styles.day}>{item.label}</Text>
            ) : (
              <Bubble message={item.message} mine={item.message.senderId === me} last={item.last} onReport={report} />
            )
          }
        />

        {canType ? (
          <View style={styles.composerWrap}>
            {draft.length === 0 ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={styles.replies}>
                {quickReplies(side, order.status).map((r) => (
                  <Pressable
                    key={r}
                    accessibilityRole="button"
                    accessibilityLabel={`Send: ${r}`}
                    onPress={() => send(r)}
                    style={({ pressed }) => [styles.reply, pressed && { backgroundColor: colors.surfaceRaised }]}>
                    <Text style={styles.replyText}>{r}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            ) : null}
            {offApp ? (
              <Text style={styles.hint}>
                Keep payments in Manna. Payments made outside the app aren’t covered if something goes wrong.
              </Text>
            ) : null}
            <View style={styles.composer}>
              <TextInput
                value={draft}
                onChangeText={setDraft}
                placeholder={`Message ${otherFirst}`}
                placeholderTextColor={colors.textFaint}
                selectionColor={colors.gold}
                cursorColor={colors.gold}
                keyboardAppearance="dark"
                multiline
                // The web's text area starts two rows tall; native grows with the text on its own.
                numberOfLines={Platform.OS === 'web' ? 1 : undefined}
                maxLength={MESSAGE_MAX}
                accessibilityLabel={`Message ${otherFirst}`}
                style={styles.input}
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Send"
                disabled={!draft.trim()}
                onPress={() => send(draft)}
                style={({ pressed }) => [
                  styles.send,
                  !draft.trim() && { backgroundColor: colors.surfaceRaised },
                  pressed && { opacity: 0.8 },
                ]}>
                <Icon name="arrow-up" size={20} color={draft.trim() ? colors.bg : colors.textFaint} />
              </Pressable>
            </View>
          </View>
        ) : (
          <View style={styles.closed}>
            <Body muted style={styles.closedText}>
              {iBlocked
                ? `You blocked ${otherName}.`
                : theyBlocked
                  ? 'Messages are off for this order.'
                  : status === 'not-yet'
                    ? side === 'customer'
                      ? `You can message ${otherFirst} once they accept your order.`
                      : `Accept the order to message ${otherFirst}.`
                    : order.status === 'completed'
                      ? `This chat closed ${CHAT_CLOSES_HOURS} hours after pickup.`
                      : 'This order didn’t go ahead, so the chat is closed.'}
            </Body>
            {iBlocked ? (
              <GoldButton
                title={`Unblock ${otherFirst}`}
                variant="ghost"
                onPress={() => dispatch({ type: 'unblockUser', blockerId: me, blockedId: otherId })}
              />
            ) : side === 'customer' && status === 'closed' ? (
              <GoldButton
                title="Get help from Manna"
                variant="ghost"
                onPress={() => router.navigate({ pathname: '/order/[id]', params: { id: order.id } })}
              />
            ) : null}
          </View>
        )}
      </KeyboardAvoidingView>

      <OptionSheet
        visible={menu}
        title="Chat options"
        options={[
          iBlocked
            ? { value: 'unblock' as const, label: `Unblock ${otherName}` }
            : { value: 'block' as const, label: `Block ${otherName}` },
          ...(side === 'customer'
            ? [{ value: 'help' as const, label: 'Get help from Manna' }]
            : [{ value: 'order' as const, label: 'View order' }]),
        ]}
        selected={[]}
        onSelect={([choice]) => {
          if (choice === 'block') block();
          if (choice === 'unblock') dispatch({ type: 'unblockUser', blockerId: me, blockedId: otherId });
          if (choice === 'help') router.navigate({ pathname: '/order/[id]', params: { id: order.id } });
          if (choice === 'order') router.navigate('/chef/dashboard');
        }}
        onClose={() => setMenu(false)}
      />
    </Screen>
  );
}

function BackRow() {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Back"
      hitSlop={10}
      onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
      style={({ pressed }) => [styles.headerButton, pressed && { opacity: 0.7 }]}>
      <Icon name="arrow-left" size={22} color={colors.ivory} />
    </Pressable>
  );
}

function Bubble({
  message,
  mine,
  last,
  onReport,
}: {
  message: OrderMessage;
  mine: boolean;
  last: boolean;
  onReport: (m: OrderMessage) => void;
}) {
  return (
    <View style={[styles.bubbleRow, mine ? styles.mineRow : styles.theirsRow, last && { marginBottom: spacing.sm }]}>
      <Pressable
        accessibilityRole="text"
        accessibilityLabel={`${mine ? 'You' : 'They'} said: ${message.text}. ${formatClock(message.at)}`}
        accessibilityHint={mine ? undefined : 'Long press to report'}
        onLongPress={mine ? undefined : () => onReport(message)}
        delayLongPress={350}
        style={[
          styles.bubble,
          mine ? styles.mine : styles.theirs,
          last && (mine ? { borderBottomRightRadius: 6 } : { borderBottomLeftRadius: 6 }),
        ]}>
        <Text style={[styles.bubbleText, mine && { color: colors.bg }]}>{message.text}</Text>
      </Pressable>
      {last ? <Text style={[styles.time, mine && { textAlign: 'right' }]}>{formatClock(message.at)}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.hairline,
  },
  headerButton: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: fonts.semibold, fontSize: 17, color: colors.ivory },
  subtitle: { fontFamily: fonts.body, fontSize: 12, color: colors.textMuted, fontVariant: ['tabular-nums'] },
  list: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md, flexGrow: 1, justifyContent: 'flex-end' },
  intro: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  introText: { fontFamily: fonts.body, fontSize: 13, lineHeight: 19, color: colors.textMuted, textAlign: 'center' },
  demo: { fontFamily: fonts.body, fontSize: 12, lineHeight: 17, color: colors.textFaint, textAlign: 'center' },
  day: {
    alignSelf: 'center',
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.textFaint,
    marginVertical: spacing.md,
  },
  bubbleRow: { marginBottom: 3, maxWidth: '82%' },
  mineRow: { alignSelf: 'flex-end' },
  theirsRow: { alignSelf: 'flex-start' },
  bubble: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20 },
  mine: { backgroundColor: colors.ivory },
  theirs: { backgroundColor: colors.surfaceRaised },
  bubbleText: { fontFamily: fonts.body, fontSize: 16, lineHeight: 22, color: colors.ivory },
  time: { fontFamily: fonts.body, fontSize: 11, color: colors.textFaint, marginTop: 4, marginHorizontal: 6 },
  composerWrap: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.hairline,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },
  replies: { gap: spacing.sm, paddingHorizontal: spacing.lg },
  reply: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  replyText: { fontFamily: fonts.medium, fontSize: 14, color: colors.text },
  hint: {
    fontFamily: fonts.body,
    fontSize: 12,
    lineHeight: 17,
    color: colors.gold,
    paddingHorizontal: spacing.lg,
  },
  composer: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm, paddingHorizontal: spacing.lg },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 132,
    paddingHorizontal: spacing.md,
    paddingTop: 11,
    paddingBottom: 11,
    borderRadius: 22,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.hairline,
    fontFamily: fonts.body,
    fontSize: 16,
    color: colors.ivory,
  },
  send: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.ivory,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closed: {
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.hairline,
  },
  closedText: { textAlign: 'center', fontSize: 14 },
});
