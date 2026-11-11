import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { FormScreen } from '@/components/form-screen';
import { RestaurantCard } from '@/components/restaurant-card';
import { Body, GoldButton, SectionTitle, TextLink } from '@/components/ui';
import { isComingSoon, isOpenState, stateName } from '@/data/regions';
import { resetTo } from '@/lib/navigation';
import { LAW_ATTESTATION } from '@/lib/kitchen-kind';
import { KITCHEN_FEE_TERMS } from '@/lib/pricing';
import { completedSteps, isReadyToOpen, SETUP_STEPS } from '@/lib/setup';
import { useMyRestaurant, useStore } from '@/state/store';
import { colors, fonts, spacing } from '@/theme';
import { Icon } from '@/components/icon';

/** What opening costs, said before the cook opens (the terms promise this). */
const OPENING_TERMS = `Free to open. Manna keeps ${KITCHEN_FEE_TERMS}, and tips are always yours.`;

const STEPS_TO_CHECK = SETUP_STEPS.filter((s) => s.key !== 'preview');
const STEP_ROUTE = {
  information: '/chef/setup/information',
  documents: '/chef/setup/documents',
  menu: '/chef/setup/menu',
  preview: '/chef/setup/preview',
} as const;

export default function Preview() {
  const { dispatch } = useStore();
  const restaurant = useMyRestaurant();
  const done = completedSteps(restaurant);
  const ready = isReadyToOpen(restaurant);

  if (!restaurant) {
    return (
      <FormScreen title="Preview">
        <Body>Start with your kitchen details first.</Body>
      </FormScreen>
    );
  }

  // What still stands between this cook and opening, in plain words.
  const unfinished = STEPS_TO_CHECK.filter((s) => !done[s.key]).map((s) => s.title);
  const remaining = unfinished.length
    ? `Finish ${unfinished.join(' and ')} to open your kitchen.`
    : 'Tick the box about food laws to open your kitchen.';

  const publish = () => {
    dispatch({ type: 'publishRestaurant', restaurantId: restaurant.id });
    resetTo('/chef/dashboard');
  };

  return (
    <FormScreen
      title="Preview"
      footer={
        restaurant.status === 'live' ? (
          <GoldButton title="Go to dashboard" chevron onPress={() => resetTo('/chef/dashboard')} />
        ) : (
          <View style={{ gap: spacing.sm }}>
            {restaurant.underReview ? (
              <Text style={styles.remaining}>
                Sent to the Manna team. We check your documents, usually within a day, and your kitchen opens once
                they’re approved.
              </Text>
            ) : null}
            {ready ? null : <Text style={styles.remaining}>{remaining}</Text>}
            <Text style={styles.remaining}>{OPENING_TERMS}</Text>
            <GoldButton
              title={restaurant.underReview ? 'Waiting for review' : 'Open my kitchen'}
              chevron={!restaurant.underReview}
              disabled={!!restaurant.underReview || !ready}
              onPress={publish}
            />
          </View>
        )
      }>
      <SectionTitle style={{ marginTop: 0 }}>How customers will see you</SectionTitle>
      <RestaurantCard
        restaurant={{ ...restaurant, status: 'live' }}
        favorite={false}
        now={new Date()}
        onToggleFavorite={() => {}}
        onPress={() =>
          router.push({ pathname: '/restaurant/[id]', params: { id: restaurant.id, preview: '1' } })
        }
      />
      <TextLink
        title="Open my full kitchen page"
        onPress={() =>
          router.push({ pathname: '/restaurant/[id]', params: { id: restaurant.id, preview: '1' } })
        }
      />

      <SectionTitle>Checklist</SectionTitle>
      {STEPS_TO_CHECK.map((s) => (
        <Pressable
          key={s.key}
          accessibilityRole="button"
          accessibilityLabel={done[s.key] ? `${s.title}, done` : `${s.title}, not finished. Tap to finish`}
          disabled={done[s.key]}
          onPress={() => router.push(STEP_ROUTE[s.key])}
          style={({ pressed }) => [styles.check, pressed && { opacity: 0.7 }]}>
          <Icon
            name={done[s.key] ? 'check-circle' : 'alert-circle-outline'}
            size={24}
            color={done[s.key] ? colors.gold : colors.danger}
          />
          <Text style={[styles.checkText, { flex: 1 }]}>{s.title}</Text>
          {done[s.key] ? null : (
            <>
              <Text style={styles.finish}>Finish</Text>
              <Icon name="chevron-right" size={18} color={colors.gold} />
            </>
          )}
        </Pressable>
      ))}
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: !!restaurant.lawAttestedAt }}
        onPress={() =>
          dispatch({
            type: 'saveRestaurant',
            restaurant: { ...restaurant, lawAttestedAt: restaurant.lawAttestedAt ? undefined : new Date().toISOString() },
          })
        }
        style={styles.attest}>
        <Icon
          name={restaurant.lawAttestedAt ? 'check-circle' : 'checkbox-blank-circle-outline'}
          size={24}
          color={restaurant.lawAttestedAt ? colors.gold : colors.textMuted}
        />
        <Text style={[styles.checkText, { flex: 1, fontSize: 15, lineHeight: 21 }]}>{LAW_ATTESTATION}</Text>
      </Pressable>

      <SectionTitle>Make it shine</SectionTitle>
      {[
        { done: restaurant.chefBio.trim().length > 0, label: 'Share your story', route: '/chef/setup/information' as const },
        { done: !!restaurant.chefPhotoUri, label: 'Add a photo of yourself', route: '/chef/setup/information' as const },
        { done: restaurant.coverUris.length > 0, label: 'Add cover photos', route: '/chef/setup/information' as const },
        { done: restaurant.menu.some((m) => m.photoUri), label: 'Add dish photos', route: '/chef/setup/menu' as const },
        {
          done: restaurant.documents.some((d) => d.kind === 'home-kitchen-permit'),
          label: 'Add a food permit or license',
          route: '/chef/setup/documents' as const,
        },
      ].map((tip) => (
        <Pressable
          key={tip.label}
          accessibilityRole="button"
          disabled={tip.done}
          onPress={() => router.push(tip.route)}
          style={styles.check}>
          <Icon
            name={tip.done ? 'check-circle' : 'star-four-points-outline'}
            size={22}
            color={tip.done ? colors.gold : colors.textMuted}
          />
          <Text style={[styles.checkText, { flex: 1 }]}>{tip.label}</Text>
          {!tip.done ? <Text style={styles.optional}>Recommended</Text> : null}
        </Pressable>
      ))}

      {isOpenState(restaurant.state) ? null : (
        <Body style={{ fontSize: 14 }}>
          {isComingSoon(restaurant.state)
            ? `Manna is opening in ${stateName(restaurant.state)} soon. Your kitchen is saved, and you can open it the day ${stateName(restaurant.state)} launches. Use the time to add photos and share your page.`
            : `Manna isn’t open in ${stateName(restaurant.state)} yet. Your kitchen is saved, and you can open it as soon as Manna launches there.`}
        </Body>
      )}
      <Body muted style={{ fontSize: 14 }}>
        Opening your kitchen lists it on Manna. Our team checks your documents, usually within a
        day, and then adds the Verified badge. With an approved permit or license, your kitchen also
        shows as Licensed and ranks higher.
      </Body>
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  attest: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, paddingVertical: spacing.sm },
  check: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: 36 },
  checkText: { fontFamily: fonts.body, fontSize: 16, color: colors.text },
  finish: { fontFamily: fonts.semibold, fontSize: 14, color: colors.gold },
  remaining: { fontFamily: fonts.body, fontSize: 13, lineHeight: 18, color: colors.textMuted, textAlign: 'center' },
  optional: { fontFamily: fonts.semibold, fontSize: 13, color: colors.textMuted },
});
