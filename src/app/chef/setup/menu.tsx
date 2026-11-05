import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';

import { FormScreen } from '@/components/form-screen';
import { Body, GoldButton, SectionTitle, TextField } from '@/components/ui';
import { formatCents, parsePriceToCents } from '@/lib/money';
import { isMenuComplete } from '@/lib/setup';
import { newId } from '@/lib/validation';
import { useRestaurantDraft } from '@/state/use-restaurant-draft';
import { colors, fonts, radius, spacing } from '@/theme';
import type { MenuItem } from '@/types';

export default function MenuSetup() {
  const { draft, update, save } = useRestaurantDraft();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [errors, setErrors] = useState<{ name?: string; price?: string; menu?: string }>({});

  const resetForm = () => {
    setEditingId(null);
    setName('');
    setDescription('');
    setPrice('');
    setErrors({});
  };

  const saveItem = () => {
    const cents = parsePriceToCents(price);
    const e: typeof errors = {};
    if (!name.trim()) e.name = 'Name your dish.';
    if (cents === null || cents <= 0) e.price = 'Enter a price, like 12.50.';
    setErrors(e);
    if (Object.keys(e).length || cents === null) return;
    const item: MenuItem = {
      id: editingId ?? newId('item'),
      name: name.trim(),
      description: description.trim(),
      priceCents: cents,
      available: draft.menu.find((m) => m.id === editingId)?.available ?? true,
    };
    const menu = editingId
      ? draft.menu.map((m) => (m.id === editingId ? item : m))
      : [...draft.menu, item];
    save({ menu });
    resetForm();
  };

  const edit = (item: MenuItem) => {
    setEditingId(item.id);
    setName(item.name);
    setDescription(item.description);
    setPrice((item.priceCents / 100).toFixed(2));
    setErrors({});
  };

  const setMenu = (menu: MenuItem[]) => {
    update({ menu });
    save({ menu });
  };

  const done = () => {
    if (!isMenuComplete(draft)) {
      setErrors({ menu: 'Add at least one available dish.' });
      return;
    }
    save();
    router.back();
  };

  return (
    <FormScreen title="Menu Setup" footer={<GoldButton title="Save & Next" onPress={done} />}>
      <SectionTitle style={{ marginTop: 0 }}>{editingId ? 'Edit dish' : 'Add a dish'}</SectionTitle>
      <TextField label="Dish name" placeholder="Grandma’s Lasagna" value={name} onChangeText={setName} error={errors.name} />
      <TextField
        label="Description"
        placeholder="What makes it special? Note any allergens."
        value={description}
        onChangeText={setDescription}
        multiline
      />
      <TextField
        label="Price"
        placeholder="12.50"
        icon="currency-usd"
        keyboardType="decimal-pad"
        value={price}
        onChangeText={setPrice}
        error={errors.price}
      />
      <View style={styles.formButtons}>
        {editingId ? (
          <Pressable onPress={resetForm} style={styles.cancel}>
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
        ) : null}
        <GoldButton
          title={editingId ? 'Update dish' : 'Add to menu'}
          chevron={false}
          onPress={saveItem}
          style={{ flex: 1 }}
        />
      </View>

      <SectionTitle>Your menu ({draft.menu.length})</SectionTitle>
      {draft.menu.length === 0 ? <Body muted>No dishes yet. Add your first one above.</Body> : null}
      {draft.menu.map((item) => (
        <View key={item.id} style={styles.item}>
          <Pressable style={{ flex: 1, gap: 2 }} onPress={() => edit(item)} accessibilityLabel={`Edit ${item.name}`}>
            <Text style={styles.itemName}>{item.name}</Text>
            <Text style={styles.itemPrice}>{formatCents(item.priceCents)}</Text>
            <Text style={styles.itemMeta}>{item.available ? 'Available' : 'Sold out'}</Text>
          </Pressable>
          <Switch
            accessibilityLabel={`${item.name} available`}
            value={item.available}
            trackColor={{ true: colors.gold, false: colors.border }}
            thumbColor={colors.white}
            onValueChange={(available) =>
              setMenu(draft.menu.map((m) => (m.id === item.id ? { ...m, available } : m)))
            }
          />
          <Pressable
            accessibilityLabel={`Delete ${item.name}`}
            hitSlop={8}
            onPress={() => {
              if (editingId === item.id) resetForm();
              setMenu(draft.menu.filter((m) => m.id !== item.id));
            }}>
            <MaterialCommunityIcons name="trash-can-outline" size={24} color={colors.danger} />
          </Pressable>
        </View>
      ))}
      {errors.menu ? <Text style={styles.error}>{errors.menu}</Text> : null}
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  formButtons: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  cancel: { paddingHorizontal: spacing.md, minHeight: 44, justifyContent: 'center' },
  cancelText: { fontFamily: fonts.bodySemi, fontSize: 16, color: colors.textMuted },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  itemName: { fontFamily: fonts.headingSemi, fontSize: 16, color: colors.text },
  itemPrice: { fontFamily: fonts.body, fontSize: 15, color: colors.text },
  itemMeta: { fontFamily: fonts.body, fontSize: 13, color: colors.textMuted },
  error: { fontFamily: fonts.body, color: colors.danger, fontSize: 14 },
});
