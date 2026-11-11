import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { FormScreen } from '@/components/form-screen';
import { Icon } from '@/components/icon';
import { OptionSheet } from '@/components/option-sheet';
import { ProLocked, useProKitchen } from '@/components/pro-gate';
import { Body, Chip, FieldLabel, GoldButton, PickerField, TextField, TextLink } from '@/components/ui';
import { confirmAction } from '@/lib/alert';
import {
  checkDrop,
  DROP_NOTE_MAX,
  DROP_TITLE_MAX,
  dropDateOptions,
  draftFromDrop,
  type DropDraft,
  findDrop,
  formatDropDeadline,
} from '@/lib/drops';
import * as haptics from '@/lib/haptics';
import { formatTime, TIME_SLOTS } from '@/lib/hours';
import { formatCents } from '@/lib/money';
import { newId } from '@/lib/validation';
import { useStore } from '@/state/store';
import { colors, fonts, radius, spacing } from '@/theme';
import type { Drop, Restaurant } from '@/types';

const TIME_OPTIONS = TIME_SLOTS.map((t) => ({ value: t, label: formatTime(t) }));
const CLOSE_OPTIONS = [1, 2, 3] as const;

export default function DropEditor() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { restaurant, pro } = useProKitchen();
  if (!restaurant || !pro) {
    return (
      <ProLocked
        title="Drops"
        icon="calendar-clock"
        pitch="Open a one-off menu with its own pickup day and deadline, like “Thanksgiving pies, order by Tuesday.”"
      />
    );
  }
  const existing = id === 'new' ? undefined : findDrop(restaurant, id);
  return <Editor key={existing?.id ?? 'new'} restaurant={restaurant} existing={existing} />;
}

function newDraft(now: Date): DropDraft {
  return {
    title: '',
    note: '',
    itemIds: [],
    date: dropDateOptions(now)[6],
    pickupStart: '10:00',
    pickupEnd: '14:00',
    closeDaysBefore: 2,
  };
}

function Editor({ restaurant, existing }: { restaurant: Restaurant; existing?: Drop }) {
  const { state, dispatch } = useStore();
  const [now] = useState(() => new Date());
  const [draft, setDraft] = useState<DropDraft>(() => (existing ? draftFromDrop(existing) : newDraft(now)));
  const [sheet, setSheet] = useState<'start' | 'end' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const set = (changes: Partial<DropDraft>) => {
    setDraft((d) => ({ ...d, ...changes }));
    setError(null);
  };

  const orders = existing
    ? state.orders.filter((o) => o.dropId === existing.id && o.status !== 'declined' && o.status !== 'cancelled').length
    : 0;
  // Once people have ordered, the pickup day and times are what they planned around.
  const timesLocked = orders > 0;
  const open = existing ? new Date(existing.closesAt) > now : true;
  const dates = dropDateOptions(now);
  if (!dates.includes(draft.date)) dates.unshift(draft.date);
  const check = checkDrop(draft, restaurant.menu, new Date());

  const save = () => {
    const result = checkDrop(draft, restaurant.menu, new Date());
    if (!result.ok && !(timesLocked && existing)) {
      setError(result.error);
      return;
    }
    if (!draft.title.trim()) return setError('Give your drop a name.');
    if (!draft.itemIds.length) return setError('Pick at least one dish.');
    const drop: Drop = {
      id: existing?.id ?? newId('drop'),
      title: draft.title.trim(),
      ...(draft.note.trim() ? { note: draft.note.trim() } : {}),
      itemIds: draft.itemIds,
      pickupStart: timesLocked && existing ? existing.pickupStart : result.ok ? result.pickupStart.toISOString() : '',
      pickupEnd: timesLocked && existing ? existing.pickupEnd : result.ok ? result.pickupEnd.toISOString() : '',
      closesAt: timesLocked && existing ? existing.closesAt : result.ok ? result.closesAt.toISOString() : '',
      createdAt: existing?.createdAt ?? new Date().toISOString(),
    };
    haptics.success();
    dispatch({ type: 'saveDrop', restaurantId: restaurant.id, drop });
    router.back();
    if (!existing) {
      confirmAction(
        'Your drop is live',
        'It’s on your kitchen page and in the Drops row on the home screen. Let everyone who saved your kitchen know?',
        'Send an alert',
        () => router.push('/chef/alerts'),
        'Not now',
      );
    }
  };

  const remove = () => {
    if (!existing) return;
    if (orders > 0) {
      confirmAction(
        'Close orders now?',
        `${orders} ${orders === 1 ? 'order stays' : 'orders stay'} as they are. No one else can order from this drop.`,
        'Close orders',
        () => dispatch({ type: 'closeDrop', restaurantId: restaurant.id, dropId: existing.id, at: new Date().toISOString() }),
      );
      return;
    }
    confirmAction('Delete this drop?', 'It comes off your kitchen page right away.', 'Delete', () => {
      dispatch({ type: 'deleteDrop', restaurantId: restaurant.id, dropId: existing.id });
      router.back();
    });
  };

  const toggleItem = (itemId: string) =>
    set({
      itemIds: draft.itemIds.includes(itemId) ? draft.itemIds.filter((x) => x !== itemId) : [...draft.itemIds, itemId],
    });

  return (
    <FormScreen
      title={existing ? 'Edit drop' : 'New drop'}
      footer={
        <View style={{ gap: spacing.sm }}>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <GoldButton title={existing ? 'Save changes' : 'Open drop'} onPress={save} />
        </View>
      }>
      <TextField
        label="Name"
        value={draft.title}
        onChangeText={(title) => set({ title: title.slice(0, DROP_TITLE_MAX) })}
        placeholder="Thanksgiving pies"
        maxLength={DROP_TITLE_MAX}
      />
      <TextField
        label="A line about it (optional)"
        value={draft.note}
        onChangeText={(note) => set({ note: note.slice(0, DROP_NOTE_MAX) })}
        placeholder="Pumpkin, pecan and sweet potato, baked Wednesday morning."
        multiline
        maxLength={DROP_NOTE_MAX}
      />

      <FieldLabel>Dishes in this drop</FieldLabel>
      <View style={styles.items}>
        {restaurant.menu.map((m, i) => {
          const on = draft.itemIds.includes(m.id);
          return (
            <Pressable
              key={m.id}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: on }}
              onPress={() => toggleItem(m.id)}
              style={[styles.item, i > 0 && styles.rule]}>
              <Icon
                name={on ? 'check-circle' : 'checkbox-blank-circle-outline'}
                size={22}
                color={on ? colors.gold : colors.textMuted}
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.itemName}>{m.name}</Text>
                <Text style={styles.itemMeta}>
                  {formatCents(m.priceCents)}
                  {m.dropOnly ? ' · Drops only' : ''}
                  {m.dailyLimit !== null ? ` · ${m.dailyLimit} max` : ''}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>
      <TextLink title="Add a dish just for drops" onPress={() => router.push('/chef/setup/menu')} />

      {timesLocked ? (
        <Body muted style={{ fontSize: 14 }}>
          {orders} {orders === 1 ? 'person has' : 'people have'} ordered, so the pickup day and times stay as they are.
        </Body>
      ) : (
        <>
          <FieldLabel>Pickup day</FieldLabel>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dates}>
            {dates.map((d) => {
              const [y, mo, da] = d.split('-').map(Number);
              const label = new Date(y, mo - 1, da).toLocaleDateString(undefined, {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
              });
              return <Chip key={d} label={label} selected={draft.date === d} onPress={() => set({ date: d })} />;
            })}
          </ScrollView>
          <View style={styles.times}>
            <View style={{ flex: 1 }}>
              <PickerField
                label="Pickup from"
                placeholder="Start"
                value={formatTime(draft.pickupStart)}
                icon="clock-outline"
                onPress={() => setSheet('start')}
              />
            </View>
            <View style={{ flex: 1 }}>
              <PickerField
                label="Until"
                placeholder="End"
                value={formatTime(draft.pickupEnd)}
                icon="clock-outline"
                onPress={() => setSheet('end')}
              />
            </View>
          </View>
          <FieldLabel>Orders close</FieldLabel>
          <View style={styles.chips}>
            {CLOSE_OPTIONS.map((n) => (
              <Chip
                key={n}
                label={n === 1 ? 'Night before' : `${n} days before`}
                selected={draft.closeDaysBefore === n}
                onPress={() => set({ closeDaysBefore: n })}
              />
            ))}
          </View>
          {check.ok ? (
            <Body muted style={{ fontSize: 13 }}>
              {formatDropDeadline(
                {
                  id: '',
                  title: '',
                  itemIds: [],
                  createdAt: '',
                  pickupStart: check.pickupStart.toISOString(),
                  pickupEnd: check.pickupEnd.toISOString(),
                  closesAt: check.closesAt.toISOString(),
                },
                now,
              )}
              , so you know how much to bake.
            </Body>
          ) : null}
        </>
      )}

      {existing ? (
        <GoldButton
          title={orders > 0 ? (open ? 'Close orders now' : 'Orders closed') : 'Delete drop'}
          variant="ghost"
          disabled={orders > 0 && !open}
          onPress={remove}
        />
      ) : null}

      <OptionSheet
        visible={sheet !== null}
        title={sheet === 'end' ? 'Pickup until' : 'Pickup from'}
        options={TIME_OPTIONS}
        selected={[sheet === 'end' ? draft.pickupEnd : draft.pickupStart]}
        onSelect={([t]) => {
          if (!t) return;
          set(sheet === 'end' ? { pickupEnd: t } : { pickupStart: t });
        }}
        onClose={() => setSheet(null)}
      />
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  error: { fontFamily: fonts.medium, fontSize: 13, color: colors.danger, textAlign: 'center' },
  items: { backgroundColor: colors.surface, borderRadius: radius.lg, paddingHorizontal: spacing.md },
  item: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md },
  rule: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  itemName: { fontFamily: fonts.semibold, fontSize: 15, color: colors.ivory },
  itemMeta: { fontFamily: fonts.body, fontSize: 13, color: colors.textMuted },
  dates: { gap: spacing.sm, paddingRight: spacing.lg },
  times: { flexDirection: 'row', gap: spacing.md },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
