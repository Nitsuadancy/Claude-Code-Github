import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  type ScrollViewInstance,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { ChefAvatar } from '@/components/chef';
import { OptionSheet } from '@/components/option-sheet';
import { RestaurantCard } from '@/components/restaurant-card';
import { TwoStepHeader } from '@/components/two-step-header';
import {
  BackButton,
  Body,
  Eyebrow,
  GoldButton,
  PickerField,
  Screen,
  SectionTitle,
  TextField,
  TextLink,
} from '@/components/ui';
import { CATEGORIES, CUISINES } from '@/data/categories';
import { NEIGHBORHOODS } from '@/data/neighborhoods';
import { capitalize, formatTime, TIME_SLOTS, WEEKDAYS } from '@/lib/hours';
import { pickImages } from '@/lib/images';
import { digitsOnly, isValidZip } from '@/lib/validation';
import { useRestaurantDraft } from '@/state/use-restaurant-draft';
import { colors, fonts, radius, spacing } from '@/theme';
import type { CategoryId, Weekday } from '@/types';
import { Icon } from '@/components/icon';

type Sheet = 'cuisine' | 'specialties' | 'open' | 'close' | 'prep' | null | 'neighborhood';

const PREP_OPTIONS = [15, 20, 25, 30, 40, 45, 60, 75, 90].map((m) => ({
  value: String(m),
  label: `About ${m} minutes`,
}));

const BIO_MAX = 280;
type Errors = Partial<Record<'name' | 'cuisine' | 'neighborhood' | 'address' | 'city' | 'areaCode' | 'days' | 'hours', string>>;

const TIME_OPTIONS = TIME_SLOTS.map((t) => ({ value: t, label: formatTime(t) }));

export default function RestaurantInformation() {
  const { draft, update, save } = useRestaurantDraft();
  const [step, setStep] = useState<1 | 2>(1);
  const [sheet, setSheet] = useState<Sheet>(null);
  const [errors, setErrors] = useState<Errors>({});
  const [spotPlace, setSpotPlace] = useState('');
  const [spotWhen, setSpotWhen] = useState('');
  const scroller = useRef<ScrollViewInstance>(null);

  const next = () => {
    if (step === 1) {
      const e: Errors = {};
      if (!draft.name.trim()) e.name = 'Give your kitchen a name.';
      if (!draft.cuisine) e.cuisine = 'Choose a cuisine.';
      setErrors(e);
      if (Object.keys(e).length) return;
      save({ name: draft.name.trim() });
      setStep(2);
      scroller.current?.scrollTo({ y: 0, animated: false });
      return;
    }
    const e: Errors = {};
    if (!draft.neighborhood) e.neighborhood = 'Choose your neighborhood.';
    if (!draft.address.trim()) e.address = 'Enter the pickup address.';
    if (!draft.city.trim()) e.city = 'Enter a city.';
    if (!isValidZip(draft.areaCode)) e.areaCode = 'Enter a 5-digit ZIP code.';
    if (draft.workingDays.length === 0) e.days = 'Pick at least one day.';
    if (!draft.openTime || !draft.closeTime) e.hours = 'Set your opening and closing times.';
    else if (draft.openTime === draft.closeTime) e.hours = 'Opening and closing times can’t match.';
    setErrors(e);
    if (Object.keys(e).length) return;
    save();
    router.back();
  };

  const toggleDay = (day: Weekday) =>
    update({
      workingDays: draft.workingDays.includes(day)
        ? draft.workingDays.filter((d) => d !== day)
        : [...draft.workingDays, day],
    });

  const allSelected = draft.workingDays.length === WEEKDAYS.length;

  return (
    <Screen>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.topBar}>
          <BackButton onPress={() => (step === 2 ? setStep(1) : router.back())} />
          <Text style={styles.topTitle}>Kitchen details</Text>
          <View style={{ width: 44 }} />
        </View>
        <ScrollView ref={scroller} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <TwoStepHeader step={step} labels={['Details', 'Location & hours']} />

          {step === 1 ? (
            <>
              <View style={styles.preview}>
                <Eyebrow>Live preview</Eyebrow>
                <RestaurantCard
                  restaurant={{
                    ...draft,
                    name: draft.name.trim() || 'Your kitchen',
                    cuisine: draft.cuisine || 'Cuisine',
                    chefName: draft.chefName || 'you',
                    status: 'live',
                  }}
                  favorite={false}
                  now={new Date()}
                  onPress={() => {}}
                  onToggleFavorite={() => {}}
                />
              </View>
              <SectionTitle style={{ marginTop: spacing.sm }}>Tell us about your kitchen</SectionTitle>
              <TextField
                label="Kitchen name"
                placeholder="e.g. Mrs. Susie’s Kitchen"
                icon="storefront-outline"
                value={draft.name}
                onChangeText={(name) => update({ name })}
                error={errors.name}
              />
              <PickerField
                label="Cuisine"
                placeholder="Choose a cuisine"
                value={draft.cuisine || null}
                onPress={() => setSheet('cuisine')}
                error={errors.cuisine}
              />
              <PickerField
                label="Specialties (optional)"
                placeholder="Vegan, Bakery, Late Night Bites…"
                value={
                  draft.categories.length
                    ? draft.categories.map((c) => CATEGORIES.find((x) => x.id === c)?.label).join(', ')
                    : null
                }
                onPress={() => setSheet('specialties')}
              />

              <SectionTitle>Logo</SectionTitle>
              <Body muted style={styles.hint}>
                Square image works best. Large photos are resized for you.
              </Body>
              {draft.logoUri ? (
                <View style={styles.logoWrap}>
                  <Image source={{ uri: draft.logoUri }} style={styles.logo} contentFit="cover" />
                  <Pressable
                    accessibilityLabel="Change logo"
                    style={styles.editBadge}
                    onPress={async () => {
                      const [uri] = await pickImages(1);
                      if (uri) update({ logoUri: uri });
                    }}>
                    <Icon name="pencil-outline" size={20} color={colors.text} />
                  </Pressable>
                </View>
              ) : (
                <UploadBox
                  label="Upload logo"
                  onPress={async () => {
                    const [uri] = await pickImages(1);
                    if (uri) update({ logoUri: uri });
                  }}
                />
              )}

              <SectionTitle>Cover photos</SectionTitle>
              <Body muted style={styles.hint}>
                Up to 3 pictures of your food, straight from your camera roll.
              </Body>
              {draft.coverUris.length < 3 ? (
                <UploadBox
                  label="Upload cover photos"
                  onPress={async () => {
                    const uris = await pickImages(3 - draft.coverUris.length);
                    if (uris.length) update({ coverUris: [...draft.coverUris, ...uris].slice(0, 3) });
                  }}
                />
              ) : null}
              <View style={styles.covers}>
                {draft.coverUris.map((uri) => (
                  <View key={uri}>
                    <Image source={{ uri }} style={styles.cover} contentFit="cover" />
                    <Pressable
                      accessibilityLabel="Remove picture"
                      style={styles.remove}
                      onPress={() => update({ coverUris: draft.coverUris.filter((u) => u !== uri) })}>
                      <Icon name="close" size={18} color={colors.text} />
                    </Pressable>
                  </View>
                ))}
              </View>

              <SectionTitle>Your story</SectionTitle>
              <Body muted style={styles.hint}>
                Foodies love knowing who’s cooking. Share where your recipes come from.
              </Body>
              <View style={styles.storyRow}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={draft.chefPhotoUri ? 'Change your photo' : 'Add your photo'}
                  onPress={async () => {
                    const [uri] = await pickImages(1);
                    if (uri) update({ chefPhotoUri: uri });
                  }}>
                  <ChefAvatar name={draft.chefName || 'Chef'} photoUri={draft.chefPhotoUri} size={76} />
                  <View style={styles.avatarBadge}>
                    <Icon name="camera-plus-outline" size={14} color={colors.onGold} />
                  </View>
                </Pressable>
                <Body muted style={{ flex: 1, fontSize: 13, lineHeight: 19 }}>
                  A warm, well-lit photo of you in your kitchen builds trust instantly.
                </Body>
              </View>
              <TextField
                label={`Your story (${draft.chefBio.length}/${BIO_MAX})`}
                placeholder="I learned to cook in my grandmother’s kitchen…"
                multiline
                maxLength={BIO_MAX}
                value={draft.chefBio}
                onChangeText={(chefBio) => update({ chefBio })}
              />
              <PickerField
                label="Typical prep time"
                placeholder="How long does an order take?"
                icon="timer-sand"
                value={`About ${draft.prepMinutes} minutes`}
                onPress={() => setSheet('prep')}
              />
            </>
          ) : (
            <>
              <SectionTitle style={{ marginTop: spacing.sm }}>Where and when you cook</SectionTitle>
              <PickerField
                label="Neighborhood"
                placeholder="Choose your neighborhood"
                icon="map-marker-radius"
                value={draft.neighborhood || null}
                onPress={() => setSheet('neighborhood')}
                error={errors.neighborhood}
              />
              <TextField
                label="Pickup address"
                placeholder="Street address"
                icon="map-marker-outline"
                textContentType="fullStreetAddress"
                value={draft.address}
                onChangeText={(address) => update({ address })}
                error={errors.address}
              />
              <View style={styles.pair}>
                <TextField
                  containerStyle={{ flex: 1 }}
                  label="City"
                  placeholder="City"
                  textContentType="addressCity"
                  value={draft.city}
                  onChangeText={(city) => update({ city })}
                  error={errors.city}
                />
                <TextField
                  containerStyle={{ flex: 1 }}
                  label="ZIP code"
                  placeholder="ZIP"
                  keyboardType="number-pad"
                  textContentType="postalCode"
                  maxLength={5}
                  value={draft.areaCode}
                  onChangeText={(t) => update({ areaCode: digitsOnly(t) })}
                  error={errors.areaCode}
                />
              </View>
              <Body muted style={{ fontSize: 13 }}>
                Customers see only your neighborhood. Your address is shared with a customer once you accept their order.
              </Body>

              <View style={styles.sectionHeader}>
                <SectionTitle>Working days</SectionTitle>
                <TextLink
                  title={allSelected ? 'Clear All' : 'Select All'}
                  onPress={() => update({ workingDays: allSelected ? [] : [...WEEKDAYS] })}
                  style={{ marginTop: spacing.md }}
                />
              </View>
              <View style={styles.days}>
                {[WEEKDAYS.slice(0, 4), WEEKDAYS.slice(4)].map((column) => (
                  <View key={column[0]} style={styles.dayColumn}>
                    {column.map((day) => {
                      const on = draft.workingDays.includes(day);
                      return (
                        <Pressable
                          key={day}
                          accessibilityRole="checkbox"
                          accessibilityState={{ checked: on }}
                          onPress={() => toggleDay(day)}
                          style={styles.day}>
                          <Icon
                            name={on ? 'check-circle' : 'checkbox-blank-circle-outline'}
                            size={26}
                            color={on ? colors.gold : colors.border}
                          />
                          <Text style={styles.dayText}>{capitalize(day)}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                ))}
              </View>
              {errors.days ? <Text style={styles.error}>{errors.days}</Text> : null}

              <SectionTitle>Hours</SectionTitle>
              <View style={styles.pair}>
                <PickerField
                  containerStyle={{ flex: 1 }}
                  label="Opens"
                  placeholder="Opening time"
                  icon="clock-outline"
                  value={draft.openTime ? formatTime(draft.openTime) : null}
                  onPress={() => setSheet('open')}
                />
                <PickerField
                  containerStyle={{ flex: 1 }}
                  label="Closes"
                  placeholder="Closing time"
                  icon="clock-outline"
                  value={draft.closeTime ? formatTime(draft.closeTime) : null}
                  onPress={() => setSheet('close')}
                />
              </View>
              {errors.hours ? <Text style={styles.error}>{errors.hours}</Text> : null}
              <Body muted style={styles.hint}>
                Closing after midnight? Pick an earlier close time, like 6:00 PM to 2:00 AM.
              </Body>

              <SectionTitle>Find me in person (optional)</SectionTitle>
              <Body muted style={styles.hint}>
                Sell at a market or a coffee shop pop-up? Add it so customers can find you there too.
              </Body>
              {(draft.inPerson ?? []).map((spot, i) => (
                <View key={`${spot.place}-${i}`} style={styles.spotRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.spotPlace}>{spot.place}</Text>
                    <Text style={styles.spotWhen}>{spot.when}</Text>
                  </View>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Remove ${spot.place}`}
                    hitSlop={10}
                    onPress={() => update({ inPerson: (draft.inPerson ?? []).filter((_, j) => j !== i) })}>
                    <Icon name="close" size={18} color={colors.textMuted} />
                  </Pressable>
                </View>
              ))}
              {(draft.inPerson ?? []).length < 3 ? (
                <View style={{ gap: spacing.sm }}>
                  <TextField
                    label="Where"
                    placeholder="Saturday market, College Park"
                    icon="map-marker-outline"
                    value={spotPlace}
                    onChangeText={setSpotPlace}
                  />
                  <TextField
                    label="When"
                    placeholder="Saturdays, 8 AM – noon"
                    icon="clock-outline"
                    value={spotWhen}
                    onChangeText={setSpotWhen}
                  />
                  <GoldButton
                    title="Add this spot"
                    variant="outline"
                    disabled={!spotPlace.trim() || !spotWhen.trim()}
                    onPress={() => {
                      update({
                        inPerson: [...(draft.inPerson ?? []), { place: spotPlace.trim(), when: spotWhen.trim() }],
                      });
                      setSpotPlace('');
                      setSpotWhen('');
                    }}
                  />
                </View>
              ) : null}
            </>
          )}
        </ScrollView>
        <View style={styles.footer}>
          <GoldButton title={step === 1 ? 'Next' : 'Save'} chevron onPress={next} />
        </View>
      </KeyboardAvoidingView>

      <OptionSheet
        visible={sheet === 'cuisine'}
        title="Cuisine"
        options={CUISINES.map((c) => ({ value: c, label: c }))}
        selected={draft.cuisine ? [draft.cuisine] : []}
        onSelect={([cuisine]) => update({ cuisine: cuisine ?? '' })}
        onClose={() => setSheet(null)}
      />
      <OptionSheet
        visible={sheet === 'prep'}
        title="Typical prep time"
        options={PREP_OPTIONS}
        selected={[String(draft.prepMinutes)]}
        onSelect={([m]) => update({ prepMinutes: Number(m ?? 30) })}
        onClose={() => setSheet(null)}
      />
      <OptionSheet<CategoryId>
        visible={sheet === 'specialties'}
        title="Specialties"
        multiple
        options={CATEGORIES.map((c) => ({ value: c.id, label: c.label }))}
        selected={draft.categories}
        onSelect={(categories) => update({ categories })}
        onClose={() => setSheet(null)}
      />
      <OptionSheet
        visible={sheet === 'neighborhood'}
        title="Neighborhood"
        options={NEIGHBORHOODS.map((n) => ({ value: n, label: n }))}
        selected={draft.neighborhood ? [draft.neighborhood] : []}
        onSelect={([neighborhood]) => update({ neighborhood: neighborhood ?? '' })}
        onClose={() => setSheet(null)}
      />
      <OptionSheet
        visible={sheet === 'open'}
        title="Start Time"
        options={TIME_OPTIONS}
        selected={draft.openTime ? [draft.openTime] : []}
        onSelect={([openTime]) => update({ openTime: openTime ?? '' })}
        onClose={() => setSheet(null)}
      />
      <OptionSheet
        visible={sheet === 'close'}
        title="Close Time"
        options={TIME_OPTIONS}
        selected={draft.closeTime ? [draft.closeTime] : []}
        onSelect={([closeTime]) => update({ closeTime: closeTime ?? '' })}
        onClose={() => setSheet(null)}
      />
    </Screen>
  );
}

function UploadBox({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.upload}>
      <Icon name="image-plus" size={24} color={colors.gold} />
      <Text style={styles.uploadText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  spotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  spotPlace: { fontFamily: fonts.semibold, fontSize: 15, color: colors.ivory },
  spotWhen: { fontFamily: fonts.body, fontSize: 13, color: colors.textMuted },
  preview: { gap: spacing.sm, marginTop: spacing.sm },
  storyRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  avatarBadge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  topTitle: {
    flex: 1,
    textAlign: 'center',
    fontFamily: fonts.semibold,
    fontSize: 12,
    color: colors.text,
  },
  content: { padding: spacing.lg, paddingTop: spacing.sm, gap: spacing.md, paddingBottom: spacing.xl },
  hint: { fontSize: 14, marginTop: -spacing.sm },
  footer: { paddingHorizontal: spacing.lg, paddingBottom: spacing.md, paddingTop: spacing.sm },
  logoWrap: { alignSelf: 'flex-start' },
  logo: { width: 110, height: 110, borderRadius: radius.lg, borderWidth: 1.5, borderColor: colors.gold },
  editBadge: {
    position: 'absolute',
    top: -12,
    right: -12,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  upload: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.border,
    borderRadius: radius.md,
    minHeight: 56,
  },
  uploadText: { fontFamily: fonts.semibold, fontSize: 16, color: colors.gold },
  covers: { flexDirection: 'row', gap: spacing.lg, paddingTop: spacing.sm },
  cover: { width: 88, height: 88, borderRadius: radius.sm },
  remove: {
    position: 'absolute',
    top: -12,
    right: -12,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.text,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pair: { flexDirection: 'row', gap: spacing.md },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  days: { flexDirection: 'row' },
  dayColumn: { flex: 1, gap: spacing.md },
  day: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 36 },
  dayText: { fontFamily: fonts.body, fontSize: 18, color: colors.text },
  error: { fontFamily: fonts.body, color: colors.danger, fontSize: 13 },
});
