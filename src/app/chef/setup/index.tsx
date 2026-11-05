import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Fragment } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { BackButton, GoldButton, Heading, Screen, Watermark } from '@/components/ui';
import { completedSteps, currentStep, SETUP_STEPS, type SetupStep } from '@/lib/setup';
import { useMyRestaurant } from '@/state/store';
import { colors, fonts, spacing } from '@/theme';

const ROUTES: Record<SetupStep, '/chef/setup/information' | '/chef/setup/documents' | '/chef/setup/menu' | '/chef/setup/preview'> = {
  information: '/chef/setup/information',
  documents: '/chef/setup/documents',
  menu: '/chef/setup/menu',
  preview: '/chef/setup/preview',
};

/** "Lets Setup your Restaurant" — the four-step checklist for new chefs. */
export default function SetupOverview() {
  const restaurant = useMyRestaurant();
  const done = completedSteps(restaurant);
  const current = currentStep(restaurant);

  return (
    <Screen>
      <Watermark corner size={320} />
      <ScrollView contentContainerStyle={styles.content}>
        <BackButton
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/choose-role'))}
        />
        <Heading style={styles.title}>Lets Setup{'\n'}your Restaurant</Heading>

        {SETUP_STEPS.map((step, i) => {
          const isCurrent = step.key === current;
          const isDone = done[step.key];
          const reachable = isDone || isCurrent;
          const last = i === SETUP_STEPS.length - 1;
          return (
            <Fragment key={step.key}>
              <View style={styles.stepRow}>
                <View style={styles.rail}>
                  <View
                    style={[
                      styles.circle,
                      (isCurrent || isDone) && { borderColor: colors.gold },
                      isDone && { backgroundColor: colors.gold },
                    ]}>
                    {isDone ? (
                      <MaterialCommunityIcons name="check" size={22} color={colors.white} />
                    ) : (
                      <Text style={styles.circleText}>{i + 1}</Text>
                    )}
                  </View>
                  {!last ? <View style={styles.dash} /> : null}
                </View>
                <View style={styles.stepBody}>
                  <View style={styles.stepHeader}>
                    <Text style={[styles.stepTitle, !reachable && { color: colors.textMuted }]}>
                      {step.title}
                    </Text>
                    {isDone && !isCurrent ? (
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`Edit ${step.title}`}
                        hitSlop={8}
                        onPress={() => router.push(ROUTES[step.key])}>
                        <Text style={styles.edit}>Edit</Text>
                      </Pressable>
                    ) : null}
                  </View>
                  {isCurrent ? (
                    <GoldButton
                      title={step.key === 'preview' ? 'Review & Publish' : 'Start'}
                      onPress={() => router.push(ROUTES[step.key])}
                      style={{ marginTop: spacing.md }}
                    />
                  ) : null}
                </View>
              </View>
            </Fragment>
          );
        })}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  title: { marginTop: spacing.xxl, marginBottom: spacing.xl },
  stepRow: { flexDirection: 'row', gap: spacing.md, minHeight: 120 },
  rail: { alignItems: 'center', width: 40 },
  circle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
  },
  circleText: { fontFamily: fonts.body, fontSize: 20, color: colors.text },
  dash: {
    flex: 1,
    width: 0,
    borderLeftWidth: 2,
    borderColor: colors.gold,
    borderStyle: 'dashed',
    marginVertical: 4,
  },
  stepBody: { flex: 1, paddingTop: 6, paddingBottom: spacing.lg },
  stepHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  stepTitle: { fontFamily: fonts.headingSemi, fontSize: 20, color: colors.text, flexShrink: 1 },
  edit: { fontFamily: fonts.bodySemi, fontSize: 16, color: colors.gold },
});
