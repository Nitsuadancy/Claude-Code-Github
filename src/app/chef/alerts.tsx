import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { FormScreen } from '@/components/form-screen';
import { ProLocked, useProKitchen } from '@/components/pro-gate';
import { Body, Chip, GoldButton, SectionTitle, TextField } from '@/components/ui';
import { notify } from '@/lib/alert';
import { ALERT_MAX, ALERTS_PER_WEEK, alertSuggestions, alertsLeft, canSendAlert, nextAlertAt, recentAlerts } from '@/lib/alerts';
import * as haptics from '@/lib/haptics';
import { formatClock } from '@/lib/orders';
import { relativeDay } from '@/lib/reviews';
import { newId } from '@/lib/validation';
import { useStore } from '@/state/store';
import { colors, fonts, radius, spacing } from '@/theme';
import type { Restaurant } from '@/types';

const PITCH =
  'Tell everyone who saved your kitchen when a bake day opens, a drop goes live or a favorite is back. Alerts land in their Activity.';

export default function KitchenAlerts() {
  const { restaurant, pro } = useProKitchen();
  if (!restaurant || !pro) return <ProLocked title="Alerts" icon="megaphone" pitch={PITCH} />;
  return <AlertsScreen restaurant={restaurant} />;
}

function AlertsScreen({ restaurant }: { restaurant: Restaurant }) {
  const { state, dispatch } = useStore();
  const [text, setText] = useState('');
  const now = new Date();
  const left = alertsLeft(state.alerts, restaurant.id, now);
  const sent = recentAlerts(state.alerts, restaurant.id, now);
  const next = nextAlertAt(state.alerts, restaurant.id, now);
  const ok = canSendAlert(state.alerts, restaurant.id, text, now);

  const send = () => {
    if (!ok) return;
    haptics.success();
    dispatch({
      type: 'sendAlert',
      alert: {
        id: newId('alert'),
        restaurantId: restaurant.id,
        restaurantName: restaurant.name,
        text,
        at: new Date().toISOString(),
      },
    });
    setText('');
    notify('Alert sent', 'Everyone who saved your kitchen will see it in their Activity.');
  };

  return (
    <FormScreen
      title="Alerts"
      footer={
        <View style={{ gap: spacing.sm }}>
          <Text style={styles.left}>
            {left > 0
              ? `${left} of ${ALERTS_PER_WEEK} alerts left this week`
              : `You’ve sent ${ALERTS_PER_WEEK} this week. Next one ${next ? `${relativeDay(next.toISOString(), now).toLowerCase()} at ${formatClock(next.toISOString())}` : 'soon'}.`}
          </Text>
          <GoldButton title="Send alert" icon="megaphone" disabled={!ok} onPress={send} />
        </View>
      }>
      <Body muted>
        Send a short note to everyone who saved {restaurant.name}. It lands in their Activity with a dot on the bell.
        Up to {ALERTS_PER_WEEK} a week, so each one gets noticed.
      </Body>

      <TextField
        label="Your alert"
        value={text}
        onChangeText={(t) => setText(t.slice(0, ALERT_MAX))}
        placeholder="Saturday’s bake day is open. Cinnamon rolls are back!"
        multiline
        maxLength={ALERT_MAX}
      />
      <Text style={styles.count}>
        {text.length}/{ALERT_MAX}
      </Text>

      <SectionTitle>Ideas</SectionTitle>
      <View style={styles.ideas}>
        {alertSuggestions(restaurant, now).map((idea) => (
          <Chip key={idea} label={idea} onPress={() => setText(idea)} />
        ))}
      </View>

      {sent.length ? (
        <>
          <SectionTitle>Sent this week</SectionTitle>
          {sent.map((a) => (
            <View key={a.id} style={styles.sent}>
              <Text style={styles.sentText}>{a.text}</Text>
              <Text style={styles.sentWhen}>
                {relativeDay(a.at, now)} · {formatClock(a.at)}
              </Text>
            </View>
          ))}
        </>
      ) : null}
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  left: { fontFamily: fonts.medium, fontSize: 13, color: colors.textMuted, textAlign: 'center' },
  count: { fontFamily: fonts.body, fontSize: 12, color: colors.textFaint, textAlign: 'right', marginTop: -spacing.sm },
  ideas: { gap: spacing.sm, alignItems: 'flex-start' },
  sent: { backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, gap: 4 },
  sentText: { fontFamily: fonts.body, fontSize: 15, lineHeight: 21, color: colors.ivory },
  sentWhen: { fontFamily: fonts.body, fontSize: 12, color: colors.textMuted },
});
