import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/icon';
import { FadeIn } from '@/components/motion';
import { BackButton, Body, GoldButton, GoldRule, Heading, Screen, TextField } from '@/components/ui';
import { LAUNCH_CITY } from '@/data/neighborhoods';
import * as haptics from '@/lib/haptics';
import { isValidContact, newId } from '@/lib/validation';
import { useFieldErrors } from '@/lib/use-field-errors';
import { useStore } from '@/state/store';
import { colors, fonts, spacing } from '@/theme';

const PROMISES = [
  'Sell farm-direct to neighbors and to Manna’s home cooks',
  'Weekly payouts straight to your bank',
  'Set your own quantities, prices and pickup spots',
];

/**
 * Manna Mart isn't open yet. Farmers and artisans join a waitlist so the team
 * can line up growers before home cooks start buying ingredients in the app.
 */
export default function GrowWaitlist() {
  const { state, dispatch } = useStore();
  const [businessName, setBusinessName] = useState('');
  const [offering, setOffering] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [contact, setContact] = useState('');
  const { errors, setErrors, clear } = useFieldErrors<'businessName' | 'offering' | 'contact'>();
  const joined = state.growerApplication;

  const submit = () => {
    const next: Partial<Record<'businessName' | 'offering' | 'contact', string>> = {};
    if (!businessName.trim()) next.businessName = 'Add your farm or business name.';
    if (!offering.trim()) next.offering = 'Tell us what you grow or make.';
    if (!isValidContact(contact)) next.contact = 'Enter a mobile number or email.';
    setErrors(next);
    if (Object.keys(next).length) return;
    haptics.success();
    // Kept on the device until the backend is connected; see grower_waitlist in Supabase.
    dispatch({
      type: 'joinGrowerWaitlist',
      application: {
        id: newId('grower'),
        businessName: businessName.trim(),
        offering: offering.trim().slice(0, 280),
        neighborhood: neighborhood.trim(),
        contact: contact.trim(),
        createdAt: new Date().toISOString(),
      },
    });
  };

  if (joined) {
    return (
      <Screen style={styles.thanks}>
        <FadeIn style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md }}>
          <View style={styles.seal}>
            <Icon name="wheat" size={30} color={colors.gold} />
          </View>
          <Heading size={30} style={{ textAlign: 'center' }}>
            You’re on the list
          </Heading>
          <Body muted style={{ textAlign: 'center' }}>
            Thank you, {joined.businessName}. We’ll reach out at {joined.contact} before Manna Mart opens in{' '}
            {LAUNCH_CITY}.
          </Body>
        </FadeIn>
        <View style={{ alignSelf: 'stretch', gap: spacing.sm }}>
          <GoldButton title="Explore Manna as a Foodie" onPress={() => router.replace('/choose-role')} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <BackButton onPress={() => router.back()} />
          <View style={{ gap: spacing.sm }}>
            <Heading>Manna Mart{'\n'}is coming</Heading>
            <Body muted>
              Farmers and artisans will sell straight to neighbors and to the home cooks who need their eggs,
              honey, fruit and flour. Join the waitlist to be one of the first growers.
            </Body>
          </View>

          <View style={{ gap: spacing.sm }}>
            {PROMISES.map((p) => (
              <View key={p} style={styles.promise}>
                <Icon name="check" size={16} color={colors.gold} />
                <Text style={styles.promiseText}>{p}</Text>
              </View>
            ))}
          </View>
          <GoldRule />

          <View style={{ gap: spacing.lg }}>
            <TextField
              label="Farm or business name"
              placeholder="Lake Ivanhoe Honey"
              icon="storefront-outline"
              value={businessName}
              onChangeText={(t) => {
                setBusinessName(t);
                clear('businessName');
              }}
              error={errors.businessName}
            />
            <TextField
              label="What you grow or make"
              placeholder="Raw wildflower honey, beeswax candles, seasonal citrus…"
              multiline
              maxLength={280}
              value={offering}
              onChangeText={(t) => {
                setOffering(t);
                clear('offering');
              }}
              error={errors.offering}
            />
            <TextField
              label="Neighborhood or town (optional)"
              placeholder="Apopka, Winter Garden, College Park…"
              icon="map-marker-outline"
              value={neighborhood}
              onChangeText={setNeighborhood}
            />
            <TextField
              label="Mobile number or email"
              placeholder="So we can reach you"
              icon="email-outline"
              autoCapitalize="none"
              keyboardType="email-address"
              value={contact}
              onChangeText={(t) => {
                setContact(t);
                clear('contact');
              }}
              error={errors.contact}
            />
          </View>
        </ScrollView>
        <View style={styles.footer}>
          <GoldButton title="Join the waitlist" chevron onPress={submit} />
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.xl },
  promise: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
  promiseText: { flex: 1, fontFamily: fonts.medium, fontSize: 14, lineHeight: 20, color: colors.text },
  footer: { paddingHorizontal: spacing.lg, paddingBottom: spacing.md, paddingTop: spacing.sm },
  thanks: { padding: spacing.lg, justifyContent: 'space-between', paddingVertical: spacing.xxl },
  seal: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 1,
    borderColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.goldTint,
  },
});
