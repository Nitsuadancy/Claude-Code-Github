import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { FormScreen } from '@/components/form-screen';
import { ProLocked, useProKitchen } from '@/components/pro-gate';
import { Body, Chip, FieldLabel, GoldButton, SectionTitle, TextField, Toggle } from '@/components/ui';
import { confirmAction } from '@/lib/alert';
import { checkCodeDraft, codeUses, describeCode, isCodeLive, MAX_ACTIVE_CODES, normalizeCode } from '@/lib/discounts';
import * as haptics from '@/lib/haptics';
import { newId } from '@/lib/validation';
import { useStore } from '@/state/store';
import { colors, fonts, radius, spacing } from '@/theme';
import type { DiscountCode, Restaurant } from '@/types';

const PITCH = 'Thank your regulars or run a launch special. You choose the amount, the end date and how many orders can use it.';

const PERCENTS = [10, 15, 20, 25];
const AMOUNTS = [300, 500, 1000];
const ENDS = [
  { label: 'No end date', days: null },
  { label: '1 week', days: 7 },
  { label: '2 weeks', days: 14 },
  { label: '1 month', days: 30 },
] as const;
const LIMITS = [null, 10, 25, 50] as const;

export default function DiscountCodes() {
  const { restaurant, pro } = useProKitchen();
  if (!restaurant || !pro) return <ProLocked title="Discount codes" icon="ticket-percent" pitch={PITCH} />;
  return <CodesScreen restaurant={restaurant} />;
}

function CodesScreen({ restaurant }: { restaurant: Restaurant }) {
  const { state, dispatch } = useStore();
  const [code, setCode] = useState('');
  const [kind, setKind] = useState<DiscountCode['kind']>('percent');
  const [value, setValue] = useState(15);
  const [newOnly, setNewOnly] = useState(false);
  const [ends, setEnds] = useState<number | null>(14);
  const [limit, setLimit] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const now = new Date();
  const codes = [...(restaurant.discountCodes ?? [])].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const live = codes.filter((c) => isCodeLive(c, state.orders, restaurant.id, now));

  const save = () => {
    const at = new Date();
    const draft: DiscountCode = {
      id: newId('code'),
      code: normalizeCode(code),
      kind,
      value,
      newCustomersOnly: newOnly,
      maxUses: limit,
      endsAt: ends ? new Date(at.getTime() + ends * 86_400_000).toISOString() : null,
      createdAt: at.toISOString(),
    };
    const problem = checkCodeDraft(draft, codes, null);
    if (problem) return setError(problem);
    if (live.length >= MAX_ACTIVE_CODES) return setError(`You can have ${MAX_ACTIVE_CODES} codes running at once.`);
    haptics.success();
    dispatch({ type: 'saveDiscountCode', restaurantId: restaurant.id, code: draft });
    setCode('');
    setError(null);
  };

  const manage = (c: DiscountCode) => {
    const used = codeUses(state.orders, restaurant.id, c.code);
    if (c.paused) {
      dispatch({ type: 'saveDiscountCode', restaurantId: restaurant.id, code: { ...c, paused: false } });
      return;
    }
    confirmAction(
      used ? `Stop ${c.code}?` : `Delete ${c.code}?`,
      used ? 'Customers can’t use it anymore. Orders that used it keep their discount.' : 'It stops working right away.',
      used ? 'Stop code' : 'Delete',
      () => dispatch({ type: 'removeDiscountCode', restaurantId: restaurant.id, codeId: c.id }),
    );
  };

  return (
    <FormScreen
      title="Discount codes"
      footer={
        <View style={{ gap: spacing.sm }}>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <GoldButton title="Create code" onPress={save} />
        </View>
      }>
      <Body muted>
        Customers type the code at checkout. The discount comes off your food price, and Manna’s fees are worked out on what
        they actually pay. Share it in your Instagram story or with your regulars.
      </Body>

      <TextField
        label="Code"
        value={code}
        onChangeText={(t) => {
          setCode(normalizeCode(t));
          setError(null);
        }}
        placeholder="WELCOME15"
        autoCapitalize="characters"
        autoCorrect={false}
      />

      <FieldLabel>Discount</FieldLabel>
      <View style={styles.chips}>
        <Chip label="Percent off" selected={kind === 'percent'} onPress={() => {
            setKind('percent');
            setValue(15);
          }} />
        <Chip label="Dollars off" selected={kind === 'amount'} onPress={() => {
            setKind('amount');
            setValue(500);
          }} />
      </View>
      <View style={styles.chips}>
        {(kind === 'percent' ? PERCENTS : AMOUNTS).map((v) => (
          <Chip
            key={v}
            label={kind === 'percent' ? `${v}%` : `$${v / 100}`}
            selected={value === v}
            onPress={() => setValue(v)}
          />
        ))}
      </View>

      <View style={styles.switchRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.switchTitle}>First orders only</Text>
          <Text style={styles.switchBody}>For people who haven’t ordered from you yet.</Text>
        </View>
        <Toggle accessibilityLabel="First orders only" value={newOnly} onValueChange={setNewOnly} />
      </View>

      <FieldLabel>Ends</FieldLabel>
      <View style={styles.chips}>
        {ENDS.map((e) => (
          <Chip key={e.label} label={e.label} selected={ends === e.days} onPress={() => setEnds(e.days)} />
        ))}
      </View>
      <FieldLabel>How many orders</FieldLabel>
      <View style={styles.chips}>
        {LIMITS.map((l) => (
          <Chip key={String(l)} label={l === null ? 'No limit' : `First ${l}`} selected={limit === l} onPress={() => setLimit(l)} />
        ))}
      </View>

      {codes.length ? <SectionTitle>Your codes</SectionTitle> : null}
      {codes.map((c) => {
        const used = codeUses(state.orders, restaurant.id, c.code);
        const on = isCodeLive(c, state.orders, restaurant.id, now);
        const status = c.paused
          ? 'Stopped'
          : c.endsAt && new Date(c.endsAt) <= now
            ? 'Ended'
            : !on
              ? 'Used up'
              : c.endsAt
                ? `Live until ${new Date(c.endsAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`
                : 'Live';
        return (
          <View key={c.id} style={styles.code}>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={styles.codeText}>{c.code}</Text>
              <Text style={styles.codeMeta}>
                {describeCode(c)} · used {used}
                {c.maxUses !== null ? ` of ${c.maxUses}` : ''} {used === 1 ? 'time' : 'times'}
              </Text>
              <Text style={[styles.codeStatus, { color: on ? colors.success : colors.textMuted }]}>{status}</Text>
            </View>
            {c.paused || on ? (
              <GoldButton
                title={c.paused ? 'Restart' : 'Stop'}
                variant="outline"
                fullWidth={false}
                onPress={() => manage(c)}
              />
            ) : null}
          </View>
        );
      })}
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  error: { fontFamily: fonts.medium, fontSize: 13, color: colors.danger, textAlign: 'center' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  switchTitle: { fontFamily: fonts.semibold, fontSize: 15, color: colors.ivory },
  switchBody: { fontFamily: fonts.body, fontSize: 13, color: colors.textMuted },
  code: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
  },
  codeText: { fontFamily: fonts.monoMedium, fontSize: 17, letterSpacing: 1, color: colors.ivory },
  codeMeta: { fontFamily: fonts.body, fontSize: 13, color: colors.textMuted },
  codeStatus: { fontFamily: fonts.semibold, fontSize: 12 },
});
