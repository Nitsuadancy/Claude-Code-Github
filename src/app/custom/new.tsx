import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { FormScreen } from '@/components/form-screen';
import { Body, Chip, FieldLabel, GoldButton, TextField } from '@/components/ui';
import {
  acceptsCustomOrders,
  checkRequest,
  CUSTOM_DETAILS_MAX,
  formatNeededBy,
  MIN_LEAD_DAYS,
  OCCASIONS,
  type RequestDraft,
  requestDateOptions,
} from '@/lib/custom-orders';
import * as haptics from '@/lib/haptics';
import { parsePriceToCents } from '@/lib/money';
import { digitsOnly, newId } from '@/lib/validation';
import { useRestaurant, useStore } from '@/state/store';
import { colors, fonts, spacing } from '@/theme';

/** Ask a Pro kitchen for something off the menu: a birthday cake, a party tray, catering. */
export default function NewCustomRequest() {
  const { kitchen } = useLocalSearchParams<{ kitchen: string }>();
  const restaurant = useRestaurant(kitchen);
  const { state, dispatch } = useStore();
  const [now] = useState(() => new Date());
  const dates = requestDateOptions(now);
  const [draft, setDraft] = useState<RequestDraft>({
    occasion: '',
    details: '',
    servings: '',
    neededBy: dates[4] ?? dates[0],
    budget: '',
  });
  const [error, setError] = useState<string | null>(null);
  const set = (changes: Partial<RequestDraft>) => {
    setDraft((d) => ({ ...d, ...changes }));
    setError(null);
  };

  if (!restaurant || !acceptsCustomOrders(restaurant, now)) {
    return (
      <FormScreen title="Custom order">
        <Body muted>This kitchen isn’t taking custom orders right now.</Body>
      </FormScreen>
    );
  }

  const send = () => {
    const user = state.user;
    if (!user) return;
    const problem = checkRequest(draft, new Date());
    if (problem) {
      setError(problem);
      return;
    }
    const budget = draft.budget.trim() ? parsePriceToCents(draft.budget) : null;
    const id = newId('request');
    haptics.success();
    dispatch({
      type: 'requestCustom',
      request: {
        id,
        restaurantId: restaurant.id,
        restaurantName: restaurant.name,
        customerId: user.id,
        customerName: user.name,
        occasion: draft.occasion,
        details: draft.details,
        servings: Number(draft.servings),
        neededBy: draft.neededBy,
        ...(budget ? { budgetCents: budget } : {}),
        createdAt: new Date().toISOString(),
        status: 'open',
      },
    });
    router.replace({ pathname: '/custom/[id]', params: { id } });
  };

  return (
    <FormScreen
      title="Custom order"
      footer={
        <View style={{ gap: spacing.sm }}>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <GoldButton title={`Send to ${restaurant.chefName.replace(/\.$/, '')}`} onPress={send} />
        </View>
      }>
      <Body muted>
        Tell {restaurant.chefName} what you have in mind. They’ll send a price and a pickup time, and you decide whether to
        order. Nothing is charged until you accept.
      </Body>

      <FieldLabel>What’s it for?</FieldLabel>
      <View style={styles.chips}>
        {OCCASIONS.map((o) => (
          <Chip key={o} label={o} selected={draft.occasion === o} onPress={() => set({ occasion: o })} />
        ))}
      </View>

      <TextField
        label="What would you like?"
        value={draft.details}
        onChangeText={(details) => set({ details: details.slice(0, CUSTOM_DETAILS_MAX) })}
        placeholder="A two-layer chocolate cake with strawberry filling, “Happy 7th, Maya” on top. One guest is allergic to nuts."
        multiline
        maxLength={CUSTOM_DETAILS_MAX}
      />

      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <TextField
            label="How many people?"
            value={draft.servings}
            onChangeText={(t) => set({ servings: digitsOnly(t).slice(0, 3) })}
            keyboardType="number-pad"
            placeholder="20"
          />
        </View>
        <View style={{ flex: 1 }}>
          <TextField
            label="Budget (optional)"
            value={draft.budget}
            onChangeText={(budget) => set({ budget })}
            keyboardType="decimal-pad"
            placeholder="$80"
          />
        </View>
      </View>

      <FieldLabel>When do you need it?</FieldLabel>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dates}>
        {dates.slice(0, 28).map((d) => (
          <Chip key={d} label={formatNeededBy(d)} selected={draft.neededBy === d} onPress={() => set({ neededBy: d })} />
        ))}
      </ScrollView>
      <Text style={styles.hint}>Kitchens need at least {MIN_LEAD_DAYS} days to plan and shop.</Text>
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  error: { fontFamily: fonts.medium, fontSize: 13, color: colors.danger, textAlign: 'center' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  row: { flexDirection: 'row', gap: spacing.md },
  dates: { gap: spacing.sm, paddingRight: spacing.lg },
  hint: { fontFamily: fonts.body, fontSize: 12, color: colors.textFaint },
});
