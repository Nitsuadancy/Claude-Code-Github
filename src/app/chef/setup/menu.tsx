import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { FormScreen } from '@/components/form-screen';
import { Body, Chip, FieldLabel, GoldButton, SectionTitle, TextField, Toggle } from '@/components/ui';
import { ALLERGENS, DIETARY_TAGS } from '@/lib/dietary';
import { pickImages } from '@/lib/images';
import { MENU_SECTIONS, moveItem } from '@/lib/menu';
import { photoSource } from '@/lib/photo';
import { formatCents, parsePriceToCents } from '@/lib/money';
import { isMenuComplete } from '@/lib/setup';
import { digitsOnly, newId } from '@/lib/validation';
import { useFieldErrors } from '@/lib/use-field-errors';
import { useRestaurantDraft } from '@/state/use-restaurant-draft';
import { colors, fonts, radius, spacing } from '@/theme';
import type { Allergen, DietaryTag, MenuItem } from '@/types';
import { Icon } from '@/components/icon';
import { Photo } from '@/components/photo';

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
  const { errors, setErrors, clear } = useFieldErrors<'name' | 'price' | 'limit' | 'menu'>();

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
          <Image source={photoSource(photoUri, 'card')} style={StyleSheet.absoluteFill} contentFit="cover" />
        ) : (
          <View style={styles.photoEmpty}>
            <Icon name="camera-plus-outline" size={28} color={colors.gold} />
            <Text style={styles.photoText}>Add a mouth-watering photo</Text>
            <Text style={styles.photoHint}>Natural light, close up, on a clean plate</Text>
          </View>
        )}
      </Pressable>

      <TextField label="Dish name" placeholder="Grandma’s Peach Cobbler" value={name}
        onChangeText={(t) => {
          setName(t);
          clear('name');
        }}
        error={errors.name}
      />
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
          onChangeText={(t) => {
            setPrice(t);
            clear('price');
          }}
          error={errors.price}
        />
        <TextField
          containerStyle={{ flex: 1 }}
          label="Daily limit"
          placeholder="No limit"
          keyboardType="number-pad"
          maxLength={3}
          value={limit}
          onChangeText={(t) => {
            setLimit(digitsOnly(t));
            clear('limit');
          }}
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
      {editingId ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            const id = editingId;
            resetForm();
            setMenu(draft.menu.filter((m) => m.id !== id));
          }}
          style={styles.deleteDish}>
          <Icon name="trash-can-outline" size={18} color={colors.danger} />
          <Text style={styles.deleteDishText}>Delete this dish</Text>
        </Pressable>
      ) : null}

      <SectionTitle>Your menu ({draft.menu.length})</SectionTitle>
      {draft.menu.length > 1 ? (
        <Body muted style={styles.hint}>
          Tap a dish to edit it. The star marks your signature dish, shown first; the arrows set the order of
          the rest.
        </Body>
      ) : null}
      {draft.menu.length === 0 ? <Body muted>No dishes yet. Add your first one above.</Body> : null}
      {draft.menu.map((item, i) => {
        const signature = item.id === draft.signatureItemId;
        const first = i === 0;
        const last = i === draft.menu.length - 1;
        return (
          <View key={item.id} style={[styles.item, signature && { borderColor: colors.hairline }]}>
            {draft.menu.length > 1 ? (
              <View style={styles.order}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Move ${item.name} up`}
                  accessibilityState={{ disabled: first }}
                  disabled={first}
                  hitSlop={6}
                  onPress={() => setMenu(moveItem(draft.menu, i, -1))}>
                  <Icon name="chevron-up" size={18} color={first ? colors.border : colors.textMuted} />
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Move ${item.name} down`}
                  accessibilityState={{ disabled: last }}
                  disabled={last}
                  hitSlop={6}
                  onPress={() => setMenu(moveItem(draft.menu, i, 1))}>
                  <Icon name="chevron-down" size={18} color={last ? colors.border : colors.textMuted} />
                </Pressable>
              </View>
            ) : null}
            {item.photoUri ? (
              <Photo uri={item.photoUri} size="thumb" style={styles.thumb} />
            ) : (
              <View style={[styles.thumb, styles.thumbEmpty]}>
                <Icon name="camera-plus-outline" size={16} color={colors.textFaint} />
              </View>
            )}
            <Pressable
              style={({ pressed }) => [{ flex: 1, gap: 3 }, pressed && { opacity: 0.7 }]}
              onPress={() => edit(item)}
              accessibilityRole="button"
              accessibilityLabel={`Edit ${item.name}`}>
              <Text style={styles.itemName} numberOfLines={2}>
                {item.name}
              </Text>
              <Text style={styles.itemMeta} numberOfLines={1}>
                <Text style={styles.itemPrice}>{formatCents(item.priceCents)}</Text>
                {item.section ? `  ·  ${item.section}` : ''}
                {item.dailyLimit !== null ? `  ·  ${item.dailyLimit} a day` : ''}
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={signature ? `${item.name} is your signature dish` : `Make ${item.name} your signature dish`}
              hitSlop={10}
              onPress={() => setMenu(draft.menu, item.id)}>
              <Icon name={signature ? 'star' : 'star-outline'} size={18} color={signature ? colors.gold : colors.textFaint} />
            </Pressable>
            <Toggle
              accessibilityLabel={`${item.name} available`}
              value={item.available}
              onValueChange={(available) =>
                setMenu(draft.menu.map((m) => (m.id === item.id ? { ...m, available } : m)))
              }
            />
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
  order: { gap: 6, marginLeft: -4 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 4,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    backgroundColor: colors.surface,
  },
  thumb: { width: 48, height: 48, borderRadius: radius.sm },
  thumbEmpty: { backgroundColor: colors.surfaceRaised, alignItems: 'center', justifyContent: 'center' },
  deleteDish: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingVertical: spacing.sm },
  deleteDishText: { fontFamily: fonts.semibold, fontSize: 14, color: colors.danger },
  itemName: { fontFamily: fonts.semibold, fontSize: 16, color: colors.ivory },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  itemPrice: { fontFamily: fonts.semibold, fontSize: 13, color: colors.gold },
  itemMeta: { fontFamily: fonts.body, fontSize: 13, color: colors.textMuted },
  error: { fontFamily: fonts.body, color: colors.danger, fontSize: 14 },
});
