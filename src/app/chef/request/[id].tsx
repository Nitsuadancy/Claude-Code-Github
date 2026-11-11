import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { FormScreen } from '@/components/form-screen';
import { OptionSheet } from '@/components/option-sheet';
import { ProLocked, useProKitchen } from '@/components/pro-gate';
import { Body, GoldButton, PickerField, TextField } from '@/components/ui';
import { confirmAction } from '@/lib/alert';
import {
  canQuote,
  CUSTOM_NOTE_MAX,
  formatNeededBy,
  MIN_QUOTE_CENTS,
  quoteWindow,
  KITCHEN_REQUEST_LABEL,
} from '@/lib/custom-orders';
import * as haptics from '@/lib/haptics';
import { formatTime, TIME_SLOTS } from '@/lib/hours';
import { formatCents, parsePriceToCents } from '@/lib/money';
import { kitchenFee, kitchenFeeRate } from '@/lib/pricing';
import { formatPickup } from '@/lib/schedule';
import { useStore } from '@/state/store';
import { colors, fonts, radius, spacing } from '@/theme';
import type { CustomRequest, Restaurant } from '@/types';

const TIME_OPTIONS = TIME_SLOTS.map((t) => ({ value: t, label: formatTime(t) }));

export default function CustomRequestDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { restaurant, pro } = useProKitchen();
  const { state } = useStore();
  const request = state.customRequests.find((r) => r.id === id);
  if (!restaurant || !pro) {
    return <ProLocked title="Custom orders" icon="cake" pitch="Answer custom order requests with a price and a pickup time." />;
  }
  if (!request || request.restaurantId !== restaurant.id) {
    return (
      <FormScreen title="Request">
        <Body muted>That request couldn’t be found.</Body>
      </FormScreen>
    );
  }
  return <RequestDetail key={request.id} request={request} restaurant={restaurant} />;
}

function RequestDetail({ request, restaurant }: { request: CustomRequest; restaurant: Restaurant }) {
  const { dispatch } = useStore();
  const [price, setPrice] = useState(request.quote ? (request.quote.priceCents / 100).toFixed(2) : '');
  const [note, setNote] = useState(request.quote?.note ?? '');
  const [start, setStart] = useState('10:00');
  const [end, setEnd] = useState('12:00');
  const [sheet, setSheet] = useState<'start' | 'end' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const now = new Date();
  const cents = parsePriceToCents(price);
  const open = canQuote(request);
  const fee = cents ? kitchenFee(cents, kitchenFeeRate(restaurant, now)) : 0;

  const send = () => {
    if (cents === null || cents < MIN_QUOTE_CENTS) {
      setError(`Enter a price of at least ${formatCents(MIN_QUOTE_CENTS)}.`);
      return;
    }
    const window = quoteWindow(request.neededBy, start, end, new Date());
    if (!window.ok) {
      setError(window.error);
      return;
    }
    haptics.success();
    dispatch({
      type: 'quoteCustom',
      requestId: request.id,
      quote: { priceCents: cents, note, pickupStart: window.pickupStart, pickupEnd: window.pickupEnd, at: new Date().toISOString() },
    });
    router.back();
  };

  const decline = () =>
    confirmAction(
      'Can’t take this one?',
      note.trim() ? 'Your note goes to the customer with the answer.' : 'You can add a short note first, like “I’m booked that weekend.”',
      'Decline',
      () => {
        dispatch({ type: 'declineCustom', requestId: request.id, note, at: new Date().toISOString() });
        router.back();
      },
    );

  return (
    <FormScreen
      title="Custom order"
      footer={
        open ? (
          <View style={{ gap: spacing.sm }}>
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <GoldButton title={request.status === 'quoted' ? 'Send new price' : 'Send price'} onPress={send} />
          </View>
        ) : undefined
      }>
      <View style={{ gap: 4 }}>
        <Text style={styles.status}>{KITCHEN_REQUEST_LABEL[request.status]}</Text>
        <Text style={styles.title}>{request.occasion}</Text>
        <Text style={styles.meta}>
          From {request.customerName || 'a customer'} · for {request.servings} {request.servings === 1 ? 'person' : 'people'} ·
          needed {formatNeededBy(request.neededBy)}
          {request.budgetCents ? ` · budget ${formatCents(request.budgetCents)}` : ''}
        </Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.details}>{request.details}</Text>
      </View>

      {request.quote && !open ? (
        <Body muted>
          You quoted {formatCents(request.quote.priceCents)} ·{' '}
          {formatPickup(request.quote.pickupStart, request.quote.pickupEnd, now)}
        </Body>
      ) : null}

      {open ? (
        <>
          <TextField
            label="Your price"
            value={price}
            onChangeText={(t) => {
              setPrice(t);
              setError(null);
            }}
            keyboardType="decimal-pad"
            placeholder="85.00"
            icon="currency-usd"
          />
          {cents ? (
            <Text style={styles.payout}>
              You receive {formatCents(cents - fee)}
              {fee ? ` after Manna’s 5%` : ''}. The customer pays {formatCents(cents)} plus the movement fee.
            </Text>
          ) : null}
          <Text style={styles.label}>Pickup on {formatNeededBy(request.neededBy)}</Text>
          <View style={styles.times}>
            <View style={{ flex: 1 }}>
              <PickerField label="From" placeholder="Start" value={formatTime(start)} icon="clock-outline" onPress={() => setSheet('start')} />
            </View>
            <View style={{ flex: 1 }}>
              <PickerField label="Until" placeholder="End" value={formatTime(end)} icon="clock-outline" onPress={() => setSheet('end')} />
            </View>
          </View>
          <TextField
            label="Note to the customer (optional)"
            value={note}
            onChangeText={(t) => setNote(t.slice(0, CUSTOM_NOTE_MAX))}
            placeholder="Two layers, strawberry filling, buttercream. I’ll pipe the name in pink."
            multiline
            maxLength={CUSTOM_NOTE_MAX}
          />
          <GoldButton title="Can’t take it" variant="ghost" onPress={decline} />
        </>
      ) : null}

      <OptionSheet
        visible={sheet !== null}
        title={sheet === 'end' ? 'Pickup until' : 'Pickup from'}
        options={TIME_OPTIONS}
        selected={[sheet === 'end' ? end : start]}
        onSelect={([t]) => {
          if (!t) return;
          if (sheet === 'end') setEnd(t);
          else setStart(t);
          setError(null);
        }}
        onClose={() => setSheet(null)}
      />
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  error: { fontFamily: fonts.medium, fontSize: 13, color: colors.danger, textAlign: 'center' },
  status: { fontFamily: fonts.semibold, fontSize: 13, color: colors.gold },
  title: { fontFamily: fonts.display, fontSize: 28, color: colors.ivory },
  meta: { fontFamily: fonts.body, fontSize: 14, lineHeight: 20, color: colors.textMuted },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md },
  details: { fontFamily: fonts.body, fontSize: 15, lineHeight: 22, color: colors.ivory },
  payout: { fontFamily: fonts.medium, fontSize: 13, color: colors.success, marginTop: -spacing.sm },
  label: { fontFamily: fonts.medium, fontSize: 14, color: colors.text },
  times: { flexDirection: 'row', gap: spacing.md },
});
