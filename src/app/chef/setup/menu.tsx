import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';

import { DietaryIcons } from '@/components/dish';
import { FormScreen } from '@/components/form-screen';
import { Body, Chip, Eyebrow, FieldLabel, GoldButton, SectionTitle, TextField } from '@/components/ui';
import { ALLERGENS, DIETARY_TAGS } from '@/lib/dietary';
import { pickImages } from '@/lib/images';
import { MENU_SECTIONS } from '@/lib/menu';
import { formatCents, parsePriceToCents } from '@/lib/money';
import { isMenuComplete } from '@/lib/setup';
import { digitsOnly, newId } from '@/lib/validation';
import { useRestaurantDraft } from '@/state/use-restaurant-draft';
import { colors, fonts, radius, spacing, webSwitchThumb } from '@/theme';
import type { Allergen, DietaryTag, MenuItem } from '@/types';
import { Icon } from '@/components/icon';

function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

export default function MenuSetup() {
  const { draft, update, save } = useRestaurantDraft();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [photoUri, setPhotoUri] = useState<string | undefined>();
  const [dietary, setDietary] = useState<DietaryTag[]>([]);
  const [allergens, setAllergens] = useState<Allergen[]>([]);
  const [limit, setLimit] = useState('');
  const [section, setSection] = useState('');
  const [errors, setErrors] = useState<{ name?: string; price?: string; limit?: string; menu?: string }>({});

  const resetForm = () => {
    setEditingId(null);
    setName('');
    setDescription('');
    setPrice('');
    setPhotoUri(undefined);
    setDietary([]);
    setAllergens([]);
    setLimit('');
    setSection('');
    setErrors({});
  };

  const saveItem = () => {
    const cents = parsePriceToCents(price);
    const dailyLimit = limit.trim() ? Number(limit) : null;
    const e: typeof errors = {};
    if (!name.trim()) e.name = 'Name your dish.';
    if (cents === null || cents <= 0) e.price = 'Enter a price, like 12.50.';
    if (dailyLimit !== null && dailyLimit < 1) e.limit = 'Use at least 1, or leave blank for no limit.';
    setErrors(e);
    if (Object.keys(e).length || cents === null) return;
    const item: MenuItem = {
      id: editingId ?? newId('item'),
      name: name.trim(),
      description: description.trim(),
      priceCents: cents,
      available: draft.menu.find((m) => m.id === editingId)?.available ?? true,
      photoUri,
      dietary,
      allergens,
      dailyLimit,
      section: section || undefined,
    };
    const menu = editingId ? draft.menu.map((m) => (m.id === editingId ? item : m)) : [...draft.menu, item];
    // The first dish becomes the signature until the chef picks another.
    save({ menu, signatureItemId: draft.signatureItemId ?? item.id });
    resetForm();
  };

  const edit = (item: MenuItem) => {
    setEditingId(item.id);
    setName(item.name);
    setDescription(item.description);
    setPrice((item.priceCents / 100).toFixed(2));
    setPhotoUri(item.photoUri);
    setDietary(item.dietary);
    setAllergens(item.allergens);
    setLimit(item.dailyLimit === null ? '' : String(item.dailyLimit));
    setSection(item.section ?? '');
    setErrors({});
  };

  const setMenu = (menu: MenuItem[], signatureItemId = draft.signatureItemId) => {
    const signature = menu.some((m) => m.id === signatureItemId) ? signatureItemId : menu[0]?.id;
    update({ menu, signatureItemId: signature });
    save({ menu, signatureItemId: signature });
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
    <FormScreen title="Menu" footer={<GoldButton title="Done" chevron onPress={done} />}>
      <SectionTitle style={{ marginTop: 0 }}>{editingId ? 'Edit dish' : 'Add a dish'}</SectionTitle>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={photoUri ? 'Change dish photo' : 'Add dish photo'}
        onPress={async () => {
          const [uri] = await pickImages(1);
          if (uri) setPhotoUri(uri);
        }}
        style={styles.photo}>
        {photoUri ? (
          <Image source={{ uri: photoUri }} style={StyleSheet.absoluteFill} contentFit="cover" />
        ) : (
          <View style={styles.photoEmpty}>
            <Icon name="camera-plus-outline" size={28} color={colors.gold} />
            <Text style={styles.photoText}>Add a mouth-watering photo</Text>
            <Text style={styles.photoHint}>Natural light, close up, on a clean plate</Text>
          </View>
        )}
      </Pressable>

      <TextField label="Dish name" placeholder="Grandma’s Peach Cobbler" value={name} onChangeText={setName} error={errors.name} />
      <TextField
        label="Description"
        placeholder="What makes it special?"
        value={description}
        onChangeText={setDescription}
        multiline
      />
      <View style={styles.pair}>
        <TextField
          containerStyle={{ flex: 1 }}
          label="Price"
          placeholder="12.50"
          icon="currency-usd"
          keyboardType="decimal-pad"
          value={price}
          onChangeText={setPrice}
          error={errors.price}
        />
        <TextField
          containerStyle={{ flex: 1 }}
          label="Daily limit"
          placeholder="No limit"
          keyboardType="number-pad"
          maxLength={3}
          value={limit}
          onChangeText={(t) => setLimit(digitsOnly(t))}
          error={errors.limit}
        />
      </View>
      <Body muted style={styles.hint}>
        The most you’ll make in a day. Customers see “Only 3 left today” as it runs low.
      </Body>

      <FieldLabel>Menu section (optional)</FieldLabel>
      <View style={styles.chips}>
        {MENU_SECTIONS.map((name) => (
          <Chip key={name} label={name} selected={section === name} onPress={() => setSection(section === name ? '' : name)} />
        ))}
      </View>

      <FieldLabel>Dietary</FieldLabel>
      <View style={styles.chips}>
        {DIETARY_TAGS.map((t) => (
          <Chip
            key={t.value}
            label={t.label}
            selected={dietary.includes(t.value)}
            onPress={() => setDietary((d) => toggle(d, t.value))}
          />
        ))}
      </View>

      <FieldLabel>Contains (allergens)</FieldLabel>
      <View style={styles.chips}>
        {ALLERGENS.map((a) => (
          <Chip
            key={a.value}
            label={a.label}
            selected={allergens.includes(a.value)}
            onPress={() => setAllergens((list) => toggle(list, a.value))}
          />
        ))}
      </View>
      <Body muted style={styles.hint}>
        Customers with allergies rely on this. When in doubt, include it.
      </Body>

      <View style={styles.formButtons}>
        {editingId ? (
          <Pressable onPress={resetForm} style={styles.cancel}>
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
        ) : null}
        <GoldButton
          title={editingId ? 'Update dish' : 'Add to menu'}
          variant="outline"
          onPress={saveItem}
          style={{ flex: 1 }}
        />
      </View>

      <SectionTitle>Your menu ({draft.menu.length})</SectionTitle>
      {draft.menu.length > 1 ? (
        <Body muted style={styles.hint}>
          Tap the star to choose your signature dish. It’s shown first on your page.
        </Body>
      ) : null}
      {draft.menu.length === 0 ? <Body muted>No dishes yet. Add your first one above.</Body> : null}
      {draft.menu.map((item) => {
        const signature = item.id === draft.signatureItemId;
        return (
          <View key={item.id} style={[styles.item, signature && { borderColor: colors.hairline }]}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={signature ? `${item.name} is your signature dish` : `Make ${item.name} your signature dish`}
              hitSlop={8}
              onPress={() => setMenu(draft.menu, item.id)}>
              <Icon
                name={signature ? 'star' : 'star-outline'}
                size={22}
                color={signature ? colors.gold : colors.textFaint}
              />
            </Pressable>
            {item.photoUri ? <Image source={{ uri: item.photoUri }} style={styles.thumb} /> : null}
            <Pressable style={{ flex: 1, gap: 3 }} onPress={() => edit(item)} accessibilityLabel={`Edit ${item.name}`}>
              {signature ? <Eyebrow style={{ fontSize: 9 }}>Signature</Eyebrow> : null}
              <Text style={styles.itemName}>{item.name}</Text>
              <View style={styles.metaRow}>
                <Text style={styles.itemPrice}>{formatCents(item.priceCents)}</Text>
                <DietaryIcons tags={item.dietary} />
              </View>
              <Text style={styles.itemMeta}>
                {item.section ? `${item.section} · ` : ''}
                {item.available ? 'Available' : 'Sold out'}
                {item.dailyLimit !== null ? ` · ${item.dailyLimit} per day` : ''}
              </Text>
            </Pressable>
            <Switch
              accessibilityLabel={`${item.name} available`}
              value={item.available}
              trackColor={{ true: colors.gold, false: colors.border }}
              thumbColor={colors.ivory}
              {...webSwitchThumb}
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
              <Icon name="trash-can-outline" size={22} color={colors.danger} />
            </Pressable>
          </View>
        );
      })}
      {errors.menu ? <Text style={styles.error}>{errors.menu}</Text> : null}
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  photo: {
    height: 180,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.borderStrong,
    overflow: 'hidden',
    backgroundColor: colors.surface,
  },
  photoEmpty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 6 },
  photoText: { fontFamily: fonts.semibold, fontSize: 14, color: colors.gold },
  photoHint: { fontFamily: fonts.body, fontSize: 12, color: colors.textMuted },
  pair: { flexDirection: 'row', gap: spacing.md },
  hint: { fontSize: 12, lineHeight: 18, marginTop: -spacing.xs },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  formButtons: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.sm },
  cancel: { paddingHorizontal: spacing.md, minHeight: 44, justifyContent: 'center' },
  cancelText: { fontFamily: fonts.semibold, fontSize: 15, color: colors.textMuted },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    backgroundColor: colors.surface,
  },
  thumb: { width: 52, height: 52, borderRadius: radius.sm },
  itemName: { fontFamily: fonts.display, fontSize: 20, color: colors.ivory },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  itemPrice: { fontFamily: fonts.semibold, fontSize: 13, color: colors.gold },
  itemMeta: { fontFamily: fonts.body, fontSize: 12, color: colors.textMuted },
  error: { fontFamily: fonts.body, color: colors.danger, fontSize: 14 },
});
