import { router, useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { FormScreen } from '@/components/form-screen';
import { Icon } from '@/components/icon';
import { Ticket } from '@/components/ticket';
import { Body, GoldButton } from '@/components/ui';
import { confirmAction, notify } from '@/lib/alert';
import {
  canAcceptQuote,
  canQuote,
  formatNeededBy,
  quoteTotals,
  REQUEST_STATUS_LABEL,
} from '@/lib/custom-orders';
import * as haptics from '@/lib/haptics';
import { formatCents } from '@/lib/money';
import { MOVEMENT_FEE_TERMS } from '@/lib/pricing';
import { formatPickup } from '@/lib/schedule';
import { newId } from '@/lib/validation';
import { acceptQuote as acceptRemoteQuote } from '@/lib/remote/api';
import { supabase } from '@/lib/supabase';
import { useServerRefresh, useStore } from '@/state/store';
import { colors, fonts, radius, spacing } from '@/theme';

/** A customer's custom order request: what they asked for, and the kitchen's price once it's in. */
export default function CustomRequestScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { state, dispatch } = useStore();
  const refreshFromServer = useServerRefresh();
  const request = state.customRequests.find((r) => r.id === id);
  const me = state.user?.id;

  if (!request || request.customerId !== me) {
    return (
      <FormScreen title="Custom order">
        <Body muted>That request couldn’t be found.</Body>
      </FormScreen>
    );
  }

  const now = new Date();
  const quote = request.quote;
  const totals = quote ? quoteTotals(quote) : null;

  const accept = async () => {
    if (!quote || !totals) return;
    if (supabase) {
      // Backend on: the server checks the price is still open and creates the order.
      try {
        const serverId = await acceptRemoteQuote(supabase, request.id);
        await refreshFromServer();
        haptics.success();
        router.replace({ pathname: '/order/[id]', params: { id: serverId, celebrate: '1' } });
      } catch (e) {
        notify('That didn’t go through', e instanceof Error ? e.message : 'Check your connection and try again.');
      }
      return;
    }
    const orderId = newId('order');
    haptics.success();
    dispatch({ type: 'acceptQuote', requestId: request.id, customerId: request.customerId, orderId, at: new Date().toISOString() });
    router.replace({ pathname: '/order/[id]', params: { id: orderId, celebrate: '1' } });
  };
  const withdraw = () =>
    confirmAction(
      request.status === 'quoted' ? 'Turn down this price?' : 'Withdraw your request?',
      `${request.restaurantName} will see that you’ve changed your mind.`,
      request.status === 'quoted' ? 'Turn down' : 'Withdraw',
      () => dispatch({ type: 'withdrawCustom', requestId: request.id, customerId: request.customerId }),
      'Keep it',
    );

  return (
    <FormScreen
      title="Custom order"
      footer={
        canAcceptQuote(request, now) && totals ? (
          <View style={{ gap: spacing.sm }}>
            <GoldButton title={`Accept and order · ${formatCents(totals.totalCents)}`} onPress={() => void accept()} />
            <Text style={styles.fine}>Payments aren’t connected yet. Accepting places the order without charging a card.</Text>
          </View>
        ) : request.status === 'accepted' && request.orderId ? (
          <GoldButton
            title="View your order"
            chevron
            onPress={() => router.push({ pathname: '/order/[id]', params: { id: request.orderId! } })}
          />
        ) : undefined
      }>
      <View style={{ gap: 4 }}>
        <Text style={styles.kitchen}>{request.restaurantName}</Text>
        <Text style={styles.title}>{request.occasion}</Text>
        <Text
          style={[
            styles.status,
            {
              color:
                request.status === 'declined' || request.status === 'withdrawn'
                  ? colors.danger
                  : request.status === 'open'
                    ? colors.textMuted
                    : colors.gold,
            },
          ]}>
          {REQUEST_STATUS_LABEL[request.status]}
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.details}>{request.details}</Text>
        <Text style={styles.meta}>
          For {request.servings} {request.servings === 1 ? 'person' : 'people'} · Needed {formatNeededBy(request.neededBy)}
          {request.budgetCents ? ` · Budget ${formatCents(request.budgetCents)}` : ''}
        </Text>
      </View>

      {request.status === 'open' ? (
        <View style={styles.waiting}>
          <Icon name="progress-clock" size={20} color={colors.gold} />
          <Body muted style={{ flex: 1, fontSize: 14 }}>
            {request.restaurantName} will send a price and a pickup time. You’ll see it in Activity.
          </Body>
        </View>
      ) : null}

      {request.status === 'declined' ? (
        <View style={styles.waiting}>
          <Icon name="close-circle-outline" size={20} color={colors.danger} />
          <Body muted style={{ flex: 1, fontSize: 14 }}>
            {request.declineNote ? `“${request.declineNote}”` : `${request.restaurantName} can’t take this one.`}
          </Body>
        </View>
      ) : null}

      {quote && totals && (request.status === 'quoted' || request.status === 'accepted') ? (
        <Ticket
          heading={formatPickup(quote.pickupStart, quote.pickupEnd, now)}
          items={[{ label: `Custom: ${request.occasion}`, cents: quote.priceCents }]}
          charges={[
            { label: 'Subtotal', cents: quote.priceCents },
            { label: 'Movement fee', cents: totals.movementFeeCents },
          ]}
          totalCents={totals.totalCents}
          footer={
            <View style={{ gap: spacing.sm }}>
              {quote.note ? <Text style={styles.quoteNote}>“{quote.note}”</Text> : null}
              <Text style={styles.fine}>Movement fee: {MOVEMENT_FEE_TERMS}. The pickup address is shared once you order.</Text>
            </View>
          }
        />
      ) : null}

      {request.status === 'quoted' && quote && new Date(quote.pickupStart) <= now ? (
        <Body muted>This price’s pickup time has passed. Send a new request if you still need it.</Body>
      ) : null}

      {canQuote(request) ? (
        <GoldButton
          title={request.status === 'quoted' ? 'No thanks' : 'Withdraw request'}
          variant="ghost"
          onPress={withdraw}
        />
      ) : null}
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  kitchen: { fontFamily: fonts.medium, fontSize: 14, color: colors.textMuted },
  title: { fontFamily: fonts.display, fontSize: 28, color: colors.ivory },
  status: { fontFamily: fonts.semibold, fontSize: 13 },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, gap: spacing.sm },
  details: { fontFamily: fonts.body, fontSize: 15, lineHeight: 22, color: colors.ivory },
  meta: { fontFamily: fonts.body, fontSize: 13, color: colors.textMuted },
  waiting: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  quoteNote: { fontFamily: fonts.body, fontSize: 14, lineHeight: 20, color: colors.text, fontStyle: 'italic' },
  fine: { fontFamily: fonts.body, fontSize: 12, lineHeight: 17, color: colors.textMuted, textAlign: 'center' },
});
