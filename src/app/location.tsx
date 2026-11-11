import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { FormScreen } from '@/components/form-screen';
import { Icon } from '@/components/icon';
import { Body, Chip, FieldLabel, GoldButton, TextField } from '@/components/ui';
import { ALL_NEIGHBORHOODS } from '@/data/regions';
import { centerOf } from '@/lib/geo';
import * as haptics from '@/lib/haptics';
import { distanceMiles } from '@/lib/location';
import { digitsOnly } from '@/lib/validation';
import { lookupZip, placeLabel } from '@/lib/zips';
import { useStore } from '@/state/store';
import { colors, fonts, spacing } from '@/theme';

/** Neighborhoods Manna has mapped within this many miles of a ZIP are offered as a finer choice. */
const NEIGHBORHOOD_MILES = 12;

/** Where the customer picks up: a ZIP anywhere in the US, and a neighborhood in cities Manna has mapped. */
export default function Location() {
  const { state, dispatch } = useStore();
  const [zip, setZip] = useState(state.user?.zip ?? '');
  const [hood, setHood] = useState(state.user?.zip ? state.user.neighborhood : '');
  const place = lookupZip(zip);
  const nearby = place
    ? ALL_NEIGHBORHOODS.filter((n) => {
        const c = centerOf(n);
        return c && distanceMiles(c, place) <= NEIGHBORHOOD_MILES;
      })
    : [];

  const save = () => {
    if (!place) return;
    haptics.success();
    dispatch({
      type: 'updateProfile',
      changes: {
        zip: place.zip,
        neighborhood: nearby.includes(hood) ? hood : '',
      },
    });
    router.back();
  };

  return (
    <FormScreen
      title="Your area"
      footer={<GoldButton title="Show kitchens near me" disabled={!place} onPress={save} />}>
      <Body muted>
        Enter your ZIP code to see home kitchens near you. Pickup is local, so we show kitchens within about 25 miles.
      </Body>
      <TextField
        label="ZIP code"
        value={zip}
        onChangeText={(t) => {
          setZip(digitsOnly(t).slice(0, 5));
          setHood('');
        }}
        keyboardType="number-pad"
        placeholder="32804"
        icon="map-marker-outline"
        autoFocus
        error={zip.length === 5 && !place ? 'We couldn’t find that ZIP code.' : null}
      />
      {place ? (
        <View style={styles.found}>
          <Icon name="check-circle" size={18} color={colors.success} />
          <Text style={styles.foundText}>{placeLabel(place)}</Text>
        </View>
      ) : null}
      {nearby.length ? (
        <>
          <FieldLabel>Your neighborhood (optional)</FieldLabel>
          <View style={styles.chips}>
            {nearby.map((n) => (
              <Chip key={n} label={n} selected={hood === n} onPress={() => setHood(hood === n ? '' : n)} />
            ))}
          </View>
        </>
      ) : null}
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  found: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: -spacing.xs,
  },
  foundText: { fontFamily: fonts.semibold, fontSize: 15, color: colors.ivory },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
