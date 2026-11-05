import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { allergenConflicts, conflictSentence, type DietProfile, dishFits } from '@/lib/diet';
import { ALLERGENS, DIETARY_TAGS } from '@/lib/dietary';
import { useStore } from '@/state/store';
import { colors, fonts, radius, spacing } from '@/theme';
import type { Allergen, DietaryTag, MenuItem } from '@/types';

import { Body, Card, Chip, Eyebrow, FieldLabel, Heading } from './ui';

/** "Fits your diet" in gold, or an allergy warning, for one dish. */
export function DietNote({ item, profile }: { item: MenuItem; profile: DietProfile }) {
  const warning = conflictSentence(allergenConflicts(item, profile.avoid));
  if (warning) {
    return (
      <View style={styles.row} accessibilityLabel={`Allergy warning: ${warning}`}>
        <MaterialCommunityIcons name="alert-circle-outline" size={14} color={colors.danger} />
        <Text style={[styles.text, { color: colors.danger }]}>{warning}</Text>
      </View>
    );
  }
  if (dishFits(item, profile)) {
    return (
      <View style={styles.row}>
        <MaterialCommunityIcons name="check-decagram-outline" size={14} color={colors.gold} />
        <Text style={[styles.text, { color: colors.gold }]}>Fits your diet</Text>
      </View>
    );
  }
  return null;
}

function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

/** Profile section where customers pick their diets and allergens. Saves on every tap. */
export function DietPreferences() {
  const { state, dispatch } = useStore();
  const dietary = state.user?.dietary ?? [];
  const avoid = state.user?.avoidAllergens ?? [];
  const set = (changes: { dietary?: DietaryTag[]; avoidAllergens?: Allergen[] }) =>
    dispatch({ type: 'updateProfile', changes });

  return (
    <Card highlight style={{ gap: spacing.md }}>
      <View style={{ gap: 4 }}>
        <Eyebrow>Personalize</Eyebrow>
        <Heading size={20}>Diet & allergies</Heading>
        <Body muted style={{ fontSize: 13, lineHeight: 19 }}>
          We’ll highlight dishes that fit and warn you about allergens. Always confirm with the chef
          if an allergy is serious.
        </Body>
      </View>
      <FieldLabel>I eat</FieldLabel>
      <View style={styles.chips}>
        {DIETARY_TAGS.filter((t) => t.value !== 'spicy').map((t) => (
          <Chip
            key={t.value}
            label={t.label}
            selected={dietary.includes(t.value)}
            onPress={() => set({ dietary: toggle(dietary, t.value) })}
          />
        ))}
      </View>
      <FieldLabel>I avoid</FieldLabel>
      <View style={styles.chips}>
        {ALLERGENS.map((a) => (
          <Chip
            key={a.value}
            label={a.label}
            selected={avoid.includes(a.value)}
            onPress={() => set({ avoidAllergens: toggle(avoid, a.value) })}
          />
        ))}
      </View>
    </Card>
  );
}

/** Cart warning when anything in the order contains an allergen the customer avoids. */
export function CartAllergyWarning({ names }: { names: string[] }) {
  if (!names.length) return null;
  return (
    <View style={styles.cartWarning} accessibilityRole="alert">
      <MaterialCommunityIcons name="alert-outline" size={20} color={colors.danger} />
      <Text style={styles.cartWarningText}>
        {names.join(', ')} {names.length === 1 ? 'contains' : 'contain'} an allergen you avoid. Add a note for
        the chef or remove {names.length === 1 ? 'it' : 'them'}.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  text: { fontFamily: fonts.semibold, fontSize: 12, letterSpacing: 0.2, flexShrink: 1 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  cartWarning: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'flex-start',
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.danger,
    backgroundColor: 'rgba(232,130,111,0.08)',
  },
  cartWarningText: { flex: 1, fontFamily: fonts.medium, fontSize: 13, lineHeight: 19, color: colors.text },
});
