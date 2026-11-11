import * as Sharing from 'expo-sharing';
import { type ComponentRef, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { captureRef } from 'react-native-view-shot';

import { FormScreen } from '@/components/form-screen';
import { ProLocked, useProKitchen } from '@/components/pro-gate';
import { Body, Chip, FieldLabel, GoldButton, TextField } from '@/components/ui';
import { cottageStatement } from '@/data/regions';
import { notify } from '@/lib/alert';
import * as haptics from '@/lib/haptics';
import { allergenLine, INGREDIENTS_MAX, labelGaps, NET_WEIGHT_MAX } from '@/lib/labels';
import { storedKitchen } from '@/state/reducer';
import { useStore } from '@/state/store';
import { colors, fonts, radius, spacing } from '@/theme';
import type { MenuItem, Restaurant } from '@/types';

const PITCH =
  'Make a label for every dish with its ingredients, allergens, net weight and the statement your state asks for. Save it as an image to print.';

export default function Labels() {
  const { restaurant, pro } = useProKitchen();
  if (!restaurant || !pro) return <ProLocked title="Labels" icon="printer" pitch={PITCH} />;
  return <LabelsScreen restaurant={restaurant} />;
}

function LabelsScreen({ restaurant }: { restaurant: Restaurant }) {
  const { state, dispatch } = useStore();
  const [itemId, setItemId] = useState(restaurant.menu[0]?.id ?? null);
  const item = restaurant.menu.find((m) => m.id === itemId) ?? restaurant.menu[0];
  const [saving, setSaving] = useState(false);
  const label = useRef<ComponentRef<typeof View>>(null);

  if (!item) {
    return (
      <FormScreen title="Labels">
        <Body muted>Add dishes to your menu first.</Body>
      </FormScreen>
    );
  }

  // Edits go to the stored kitchen, not the on-screen copy with reviews blended in.
  const update = (changes: Partial<MenuItem>) => {
    const stored = storedKitchen(state);
    if (!stored) return;
    dispatch({
      type: 'saveRestaurant',
      restaurant: { ...stored, menu: stored.menu.map((m) => (m.id === item.id ? { ...m, ...changes } : m)) },
    });
  };

  const address = [restaurant.address, restaurant.city, restaurant.state, restaurant.areaCode].filter(Boolean).join(', ');
  const gaps = labelGaps(item, restaurant.address);
  const allergens = allergenLine(item.allergens);

  const save = async () => {
    setSaving(true);
    try {
      // view-shot's types predate React Native's new element type.
      const uri = await captureRef(label as Parameters<typeof captureRef>[0], { format: 'png', quality: 1, width: 1200 });
      if (!(await Sharing.isAvailableAsync())) throw new Error('Sharing unavailable');
      haptics.success();
      await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: `${item.name} label`, UTI: 'public.png' });
    } catch {
      notify('Open Manna on your phone', 'Saving a label works in the Manna app on your phone.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <FormScreen
      title="Labels"
      footer={<GoldButton title="Save label to print" icon="printer" loading={saving} onPress={save} />}>
      <FieldLabel>Dish</FieldLabel>
      <View style={styles.chips}>
        {restaurant.menu.map((m) => (
          <Chip key={m.id} label={m.name} selected={m.id === item.id} onPress={() => setItemId(m.id)} />
        ))}
      </View>

      <View ref={label} collapsable={false} style={styles.label}>
        <Text style={styles.product}>{item.name}</Text>
        {item.netWeight ? <Text style={styles.line}>Net wt. {item.netWeight}</Text> : null}
        <Text style={styles.line}>
          <Text style={styles.bold}>Ingredients: </Text>
          {item.ingredients?.trim() || '—'}
        </Text>
        {allergens ? <Text style={[styles.line, styles.bold]}>{allergens}</Text> : null}
        <View style={styles.divider} />
        <Text style={styles.line}>
          {restaurant.name} · {address || 'Your address'}
        </Text>
        <Text style={styles.statement}>{cottageStatement(restaurant.state)}</Text>
      </View>

      {gaps.length ? (
        <Text style={styles.gaps}>Still needed: {gaps.join(', ')}.</Text>
      ) : (
        <Text style={styles.ready}>Ready to print.</Text>
      )}

      <TextField
        label="Ingredients, heaviest first"
        value={item.ingredients ?? ''}
        onChangeText={(t) => update({ ingredients: t.slice(0, INGREDIENTS_MAX) })}
        placeholder="Peaches, sugar, wheat flour, butter (milk), eggs, cinnamon, salt"
        multiline
        maxLength={INGREDIENTS_MAX}
      />
      <TextField
        label="Net weight"
        value={item.netWeight ?? ''}
        onChangeText={(t) => update({ netWeight: t.slice(0, NET_WEIGHT_MAX) })}
        placeholder="2 lb (907 g)"
        maxLength={NET_WEIGHT_MAX}
      />
      <Body muted style={{ fontSize: 13 }}>
        Allergens come from your menu. Check your state’s and county’s labeling rules: you’re responsible for what your
        labels say.
      </Body>
    </FormScreen>
  );
}

const INK = '#111111';

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  label: {
    backgroundColor: '#FFFFFF',
    borderRadius: radius.md,
    padding: spacing.lg,
    gap: 6,
  },
  product: { fontFamily: fonts.display, fontSize: 24, color: INK },
  line: { fontFamily: fonts.body, fontSize: 14, lineHeight: 19, color: INK },
  bold: { fontFamily: fonts.semibold, color: INK },
  divider: { height: 1, backgroundColor: '#D9D9D9', marginVertical: 4 },
  statement: { fontFamily: fonts.semibold, fontSize: 13, lineHeight: 18, color: INK },
  gaps: { fontFamily: fonts.medium, fontSize: 13, color: colors.gold },
  ready: { fontFamily: fonts.medium, fontSize: 13, color: colors.success },
});
