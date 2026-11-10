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

import { BakeDaysEditor } from '@/components/bake-days-editor';
import { ChefAvatar } from '@/components/chef';
import { IntroVideo } from '@/components/intro-video';
import { OptionSheet } from '@/components/option-sheet';
import { Photo } from '@/components/photo';
import { RestaurantCard } from '@/components/restaurant-card';
import { TwoStepHeader } from '@/components/two-step-header';
import {
  BackButton,
  Body,
  Eyebrow,
  FieldLabel,
  GoldButton,
  PickerField,
  Screen,
  SectionTitle,
  TextField,
  TextLink,
  Toggle,
} from '@/components/ui';
import { DEFAULT_ACCENT, KITCHEN_ACCENTS } from '@/data/accents';
import { CATEGORIES, CUISINES } from '@/data/categories';
import { DEFAULT_STATE, isOpenState, neighborhoodsFor, STATE_RULES, stateName, US_STATES } from '@/data/regions';
import { capitalize, formatTime, hoursOn, TIME_SLOTS, WEEKDAYS } from '@/lib/hours';
import { INTRO_VIDEO_SECONDS, pickImages, pickIntroVideo } from '@/lib/images';
import { photoSource } from '@/lib/photo';
import { cleanInstagram, TAGLINE_MAX } from '@/lib/kitchen-style';
import { digitsOnly, isValidZip } from '@/lib/validation';
import { useFieldErrors } from '@/lib/use-field-errors';
import { useRestaurantDraft } from '@/state/use-restaurant-draft';
import { colors, fonts, radius, spacing } from '@/theme';
import type { CategoryId, Restaurant, Weekday } from '@/types';
import { Icon } from '@/components/icon';

type Sheet = 'cuisine' | 'specialties' | 'open' | 'close' | 'prep' | null | 'neighborhood' | 'state';

const PREP_OPTIONS = [15, 20, 25, 30, 40, 45, 60, 75, 90].map((m) => ({
  value: String(m),
  label: `About ${m} minutes`,
}));

const BIO_MAX = 280;
const OPEN_STATE_NAMES = Object.keys(STATE_RULES).map(stateName).join(', ');
type ErrorKey = 'name' | 'instagram' | 'cuisine' | 'neighborhood' | 'address' | 'city' | 'areaCode' | 'days' | 'hours';
type Errors = Partial<Record<ErrorKey, string>>;

/** Which error message each kitchen field can clear when it's edited. */
const ERROR_FOR_FIELD: Partial<Record<keyof Restaurant, ErrorKey>> = {
  name: 'name',
  instagram: 'instagram',
  cuisine: 'cuisine',
  neighborhood: 'neighborhood',
  state: 'neighborhood',
  address: 'address',
  city: 'city',
  areaCode: 'areaCode',
  workingDays: 'days',
  bakeDays: 'days',
  orderMode: 'days',
  openTime: 'hours',
  closeTime: 'hours',
  dayHours: 'hours',
};

const TIME_OPTIONS = TIME_SLOTS.map((t) => ({ value: t, label: formatTime(t) }));

export default function RestaurantInformation() {
  const { draft, update: updateDraft, save } = useRestaurantDraft();
  const [step, setStep] = useState<1 | 2>(1);
  const [sheet, setSheet] = useState<Sheet>(null);
  // Which day's opening or closing time is being picked, for days with their own hours.
  const [dayPick, setDayPick] = useState<{ day: Weekday; which: 'open' | 'close' } | null>(null);
  const [splitHours, setSplitHours] = useState(() => Object.keys(draft.dayHours ?? {}).length > 0);
  const { errors, setErrors, clear } = useFieldErrors<ErrorKey>();
  // Editing a field hides its error straight away, instead of waiting for the next tap on Next.
  const update = (changes: Partial<Restaurant>) => {
    updateDraft(changes);
    const fixed = (Object.keys(changes) as (keyof Restaurant)[]).flatMap((k) => ERROR_FOR_FIELD[k] ?? []);
    if (fixed.length) clear(...fixed);
  };
  const [spotPlace, setSpotPlace] = useState('');
  const [spotWhen, setSpotWhen] = useState('');
  const scroller = useRef<ScrollViewInstance>(null);

  const next = () => {
    if (step === 1) {
      const e: Errors = {};
      if (!draft.name.trim()) e.name = 'Give your kitchen a name.';
      if (!draft.cuisine) e.cuisine = 'Choose a cuisine.';
      const instagram = cleanInstagram(draft.instagram ?? '');
      if (draft.instagram && !instagram) e.instagram = 'Use just your username, like @susiessweets.';
      setErrors(e);
      if (Object.keys(e).length) return;
      save({ name: draft.name.trim(), tagline: (draft.tagline ?? '').trim(), instagram });
      setStep(2);
      scroller.current?.scrollTo({ y: 0, animated: false });
      return;
    }
    const e: Errors = {};
    // Cooks in states Manna hasn't opened yet can still save; they open their kitchen once it launches there.
    if (stateOpen && !draft.neighborhood) e.neighborhood = 'Choose your neighborhood.';
    if (!draft.address.trim()) e.address = 'Enter the pickup address.';
    if (!draft.city.trim()) e.city = 'Enter a city.';
    if (!isValidZip(draft.areaCode)) e.areaCode = 'Enter a 5-digit ZIP code.';
    if (bakeDayMode) {
      if (!(draft.bakeDays ?? []).length) e.days = 'Pick a day and pickup times below, then tap “Add bake day”.';
    } else {
      if (draft.workingDays.length === 0) e.days = 'Pick at least one day.';
      if (!draft.openTime || !draft.closeTime) e.hours = 'Set your opening and closing times.';
      else if (draft.openTime === draft.closeTime) e.hours = 'Opening and closing times can’t match.';
      else if (splitHours && draft.workingDays.some((d) => !hoursOn(draft, d))) {
        e.hours = 'Each day needs an opening and a closing time that differ.';
      }
    }
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
  const bakeDayMode = draft.orderMode === 'bake-days';
  const kitchenState = draft.state ?? DEFAULT_STATE;
  const stateOpen = isOpenState(kitchenState);

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
                  <Image source={photoSource(draft.logoUri, 'thumb')} style={styles.logo} contentFit="cover" />
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
                    <Photo uri={uri} size="thumb" style={styles.cover} />
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
              {draft.introVideoUri ? (
                <View>
                  <IntroVideo uri={draft.introVideoUri} chefName={draft.chefName || 'you'} style={styles.introPreview} />
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Remove video"
                    style={[styles.remove, { top: spacing.sm, right: spacing.sm }]}
                    onPress={() => update({ introVideoUri: undefined })}>
                    <Icon name="close" size={18} color={colors.text} />
                  </Pressable>
                </View>
              ) : (
                <UploadBox
                  label={`Add a ${INTRO_VIDEO_SECONDS}-second hello (optional)`}
                  onPress={async () => {
                    const uri = await pickIntroVideo();
                    if (uri) update({ introVideoUri: uri });
                  }}
                />
              )}
              <Body muted style={{ fontSize: 13, marginTop: -spacing.sm }}>
                Say hi and show your kitchen. It plays quietly on your page until someone taps for sound.
              </Body>
              <PickerField
                label="Typical prep time"
                placeholder="How long does an order take?"
                value={`About ${draft.prepMinutes} minutes`}
                onPress={() => setSheet('prep')}
              />

              <SectionTitle>Make it yours</SectionTitle>
              <Body muted style={styles.hint}>
                Your page keeps Manna’s layout, so customers always know where everything is. These are yours.
              </Body>
              <TextField
                label={`Tagline (${(draft.tagline ?? '').length}/${TAGLINE_MAX})`}
                placeholder="Small-batch sourdough, baked Saturdays"
                maxLength={TAGLINE_MAX}
                value={draft.tagline ?? ''}
                onChangeText={(tagline) => update({ tagline })}
              />
              <View style={{ gap: spacing.sm }}>
                <FieldLabel>Accent color</FieldLabel>
                <View style={styles.swatches} accessibilityRole="radiogroup">
                  {KITCHEN_ACCENTS.map((a) => {
                    const on = (draft.accent ?? DEFAULT_ACCENT) === a.id;
                    return (
                      <Pressable
                        key={a.id}
                        accessibilityRole="radio"
                        accessibilityLabel={a.label}
                        accessibilityState={{ checked: on }}
                        onPress={() => update({ accent: a.id })}
                        style={[styles.swatch, on && { borderColor: a.color }]}>
                        <View style={[styles.swatchFill, { backgroundColor: a.color }]}>
                          {on ? <Icon name="check" size={16} color={colors.bg} /> : null}
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
                <Body muted style={{ fontSize: 13 }}>
                  {KITCHEN_ACCENTS.find((a) => a.id === (draft.accent ?? DEFAULT_ACCENT))?.label}. Used on your
                  kitchen page and your Instagram Story card.
                </Body>
              </View>
              <TextField
                label="Instagram (optional)"
                placeholder="@yourkitchen"
                icon="instagram"
                autoCapitalize="none"
                autoCorrect={false}
                value={draft.instagram ? `@${draft.instagram}` : ''}
                onChangeText={(text) => update({ instagram: text.replace(/^@/, '').replace(/\s/g, '').toLowerCase() })}
                error={errors.instagram}
              />
            </>
          ) : (
            <>
              <SectionTitle style={{ marginTop: spacing.sm }}>Where and when you cook</SectionTitle>
              <PickerField
                label="State"
                placeholder="Choose your state"
                value={stateName(kitchenState)}
                onPress={() => setSheet('state')}
              />
              {stateOpen ? null : (
                <Body muted style={{ fontSize: 13, marginTop: -spacing.sm }}>
                  Manna isn’t open in {stateName(kitchenState)} yet; it’s in {OPEN_STATE_NAMES} for now. Save your
                  kitchen, and you can open it as soon as Manna launches in {stateName(kitchenState)}.
                </Body>
              )}
              <PickerField
                label="Neighborhood"
                placeholder={stateOpen ? 'Choose your neighborhood' : 'Not open in your state yet'}
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
              <TextField
                label="Pickup instructions (optional)"
                placeholder="Cooler on the porch, ring once."
                icon="home-heart"
                maxLength={140}
                value={draft.pickupInstructions ?? ''}
                onChangeText={(pickupInstructions) => update({ pickupInstructions })}
              />
              {draft.pickupPhotoUri ? (
                <View>
                  <Photo uri={draft.pickupPhotoUri} size="card" style={styles.pickupPhoto} />
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Remove pickup spot photo"
                    style={[styles.remove, { top: spacing.sm, right: spacing.sm }]}
                    onPress={() => update({ pickupPhotoUri: undefined })}>
                    <Icon name="close" size={18} color={colors.text} />
                  </Pressable>
                </View>
              ) : (
                <UploadBox
                  label="Add a photo of your pickup spot"
                  onPress={async () => {
                    const [uri] = await pickImages(1, [4, 3]);
                    if (uri) update({ pickupPhotoUri: uri });
                  }}
                />
              )}
              <Body muted style={{ fontSize: 13, marginTop: -spacing.sm }}>
                Your door, gate or cooler, so customers know they’re in the right place. Shared with the address once
                you accept an order.
              </Body>

              <SectionTitle>How you take orders</SectionTitle>
              <View style={{ gap: spacing.sm }}>
                {(
                  [
                    ['bake-days', 'Bake days', 'Recommended. Customers order ahead, you bake in one batch, and they pick up in a window.'],
                    ['hours', 'Set hours', 'Customers order while you’re open and pick up when it’s ready.'],
                  ] as const
                ).map(([mode, title, body]) => {
                  const on = (draft.orderMode ?? 'hours') === mode;
                  return (
                    <Pressable
                      key={mode}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: on }}
                      onPress={() => update({ orderMode: mode })}
                      style={[styles.mode, on && styles.modeOn]}>
                      <Icon
                        name={on ? 'check-circle' : 'checkbox-blank-circle-outline'}
                        size={22}
                        color={on ? colors.gold : colors.border}
                      />
                      <View style={{ flex: 1, gap: 2 }}>
                        <Text style={styles.modeTitle}>{title}</Text>
                        <Text style={styles.modeBody}>{body}</Text>
                      </View>
                    </Pressable>
                  );
                })}
              </View>

              {bakeDayMode ? (
                <>
                  <SectionTitle>Your bake days</SectionTitle>
                  <BakeDaysEditor
                    value={draft.bakeDays ?? []}
                    onChange={(bakeDays) => update({ bakeDays })}
                    error={errors.days}
                  />
                </>
              ) : (
                <>
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

                  <SectionTitle>{splitHours ? 'Usual hours' : 'Hours'}</SectionTitle>
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
                  <Body muted style={styles.hint}>
                    Closing after midnight? Pick an earlier close time, like 6:00 PM to 2:00 AM.
                  </Body>

                  <View style={styles.splitRow}>
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text style={styles.splitTitle}>Different hours on some days</Text>
                      <Text style={styles.splitBody}>For example, shorter Saturdays or a late Friday.</Text>
                    </View>
                    <Toggle
                      accessibilityLabel="Different hours on some days"
                      value={splitHours}
                      onValueChange={(on) => {
                        setSplitHours(on);
                        if (!on) update({ dayHours: {} });
                      }}
                    />
                  </View>
                  {splitHours
                    ? WEEKDAYS.filter((d) => draft.workingDays.includes(d)).map((day) => {
                        const own = draft.dayHours?.[day];
                        const h = own ?? { open: draft.openTime, close: draft.closeTime };
                        return (
                          <View key={day} style={styles.dayHoursRow}>
                            <Text style={styles.dayHoursName}>{capitalize(day).slice(0, 3)}</Text>
                            <Pressable
                              accessibilityRole="button"
                              accessibilityLabel={`${capitalize(day)} opens ${h.open ? formatTime(h.open) : 'not set'}`}
                              onPress={() => setDayPick({ day, which: 'open' })}
                              style={[styles.dayHoursTime, own && styles.dayHoursOwn]}>
                              <Text style={styles.dayHoursText}>{h.open ? formatTime(h.open) : 'Opens'}</Text>
                            </Pressable>
                            <Text style={styles.dayHoursDash}>to</Text>
                            <Pressable
                              accessibilityRole="button"
                              accessibilityLabel={`${capitalize(day)} closes ${h.close ? formatTime(h.close) : 'not set'}`}
                              onPress={() => setDayPick({ day, which: 'close' })}
                              style={[styles.dayHoursTime, own && styles.dayHoursOwn]}>
                              <Text style={styles.dayHoursText}>{h.close ? formatTime(h.close) : 'Closes'}</Text>
                            </Pressable>
                          </View>
                        );
                      })
                    : null}
                  {errors.hours ? <Text style={styles.error}>{errors.hours}</Text> : null}
                </>
              )}

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
        options={neighborhoodsFor(kitchenState).map((n) => ({ value: n, label: n }))}
        selected={draft.neighborhood ? [draft.neighborhood] : []}
        onSelect={([neighborhood]) => update({ neighborhood: neighborhood ?? '' })}
        onClose={() => setSheet(null)}
      />
      <OptionSheet
        visible={sheet === 'state'}
        title="State"
        options={[...US_STATES.filter((st) => isOpenState(st.code)), ...US_STATES.filter((st) => !isOpenState(st.code))].map(
          (st) => ({ value: st.code, label: isOpenState(st.code) ? st.name : `${st.name} · coming soon` }),
        )}
        selected={[kitchenState]}
        onSelect={([code]) => {
          if (!code) return;
          // A neighborhood belongs to one state's markets; clear it when the state changes.
          update({ state: code, neighborhood: neighborhoodsFor(code).includes(draft.neighborhood) ? draft.neighborhood : '' });
        }}
        onClose={() => setSheet(null)}
      />
      <OptionSheet
        visible={dayPick !== null}
        title={dayPick ? `${capitalize(dayPick.day)} ${dayPick.which === 'open' ? 'opens' : 'closes'}` : ''}
        options={TIME_OPTIONS}
        selected={(() => {
          if (!dayPick) return [];
          const h = draft.dayHours?.[dayPick.day] ?? { open: draft.openTime, close: draft.closeTime };
          const t = dayPick.which === 'open' ? h.open : h.close;
          return t ? [t] : [];
        })()}
        onSelect={([t]) => {
          if (!dayPick || !t) return;
          const current = draft.dayHours?.[dayPick.day] ?? { open: draft.openTime, close: draft.closeTime };
          const next = dayPick.which === 'open' ? { ...current, open: t } : { ...current, close: t };
          const same = next.open === draft.openTime && next.close === draft.closeTime;
          const dayHours = { ...(draft.dayHours ?? {}) };
          // A day back on the usual hours needs no entry of its own.
          if (same) delete dayHours[dayPick.day];
          else dayHours[dayPick.day] = next;
          update({ dayHours });
        }}
        onClose={() => setDayPick(null)}
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
  splitRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.sm },
  splitTitle: { fontFamily: fonts.semibold, fontSize: 15, color: colors.ivory },
  splitBody: { fontFamily: fonts.body, fontSize: 13, color: colors.textMuted },
  dayHoursRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  dayHoursName: { width: 44, fontFamily: fonts.semibold, fontSize: 15, color: colors.ivory },
  dayHoursTime: {
    flex: 1,
    minHeight: 46,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayHoursOwn: { borderColor: colors.gold },
  dayHoursText: { fontFamily: fonts.medium, fontSize: 15, color: colors.text },
  dayHoursDash: { fontFamily: fonts.body, fontSize: 13, color: colors.textMuted },
  swatches: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm + 2 },
  swatch: { padding: 3, borderRadius: 24, borderWidth: 2, borderColor: 'transparent' },
  swatchFill: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
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
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  topTitle: {
    flex: 1,
    textAlign: 'center',
    fontFamily: fonts.semibold,
    fontSize: 16,
    letterSpacing: -0.2,
    color: colors.ivory,
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
  pickupPhoto: { width: '100%', aspectRatio: 4 / 3, borderRadius: radius.md },
  introPreview: { width: '62%', aspectRatio: 4 / 5 },
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
  mode: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  modeOn: { borderColor: colors.gold, backgroundColor: colors.surface },
  modeTitle: { fontFamily: fonts.semibold, fontSize: 16, color: colors.ivory },
  modeBody: { fontFamily: fonts.body, fontSize: 13, lineHeight: 19, color: colors.textMuted },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  days: { flexDirection: 'row' },
  dayColumn: { flex: 1, gap: spacing.md },
  day: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 36 },
  dayText: { fontFamily: fonts.body, fontSize: 18, color: colors.text },
  error: { fontFamily: fonts.body, color: colors.danger, fontSize: 13 },
});
