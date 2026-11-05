import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { BackButton, Body, Eyebrow, GoldButton, Heading, Screen } from '@/components/ui';
import { completedSteps, currentStep, SETUP_STEPS, type SetupStep } from '@/lib/setup';
import { useMyRestaurant } from '@/state/store';
import { colors, fonts, radius, spacing } from '@/theme';
import { Icon } from '@/components/icon';

type SetupRoute =
  | '/chef/setup/information'
  | '/chef/setup/documents'
  | '/chef/setup/menu'
  | '/chef/setup/preview';

const STEP_INFO: Record<SetupStep, { route: SetupRoute; blurb: string }> = {
  information: { route: '/chef/setup/information', blurb: 'Name, cuisine, photos, location and hours.' },
  documents: { route: '/chef/setup/documents', blurb: 'Your permit and food handler certificate.' },
  menu: { route: '/chef/setup/menu', blurb: 'Your signature dishes and prices.' },
  preview: { route: '/chef/setup/preview', blurb: 'See your kitchen as foodies will, then publish.' },
};

/** "Let's set up your restaurant": the four-step checklist for new chefs. */
export default function SetupOverview() {
  const restaurant = useMyRestaurant();
  const done = completedSteps(restaurant);
  const current = currentStep(restaurant);
  const completed = SETUP_STEPS.filter((s) => done[s.key]).length;

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <BackButton
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/choose-role'))}
        />
        <View style={styles.header}>
          <Eyebrow>
            Your restaurant · {completed} of {SETUP_STEPS.length} complete
          </Eyebrow>
          <Heading size={34}>Let’s set up{'\n'}your restaurant</Heading>
          <Body muted>Four short steps and your kitchen is open for business.</Body>
        </View>

        <View>
          {SETUP_STEPS.map((step, i) => {
            const isCurrent = step.key === current;
            const isDone = done[step.key];
            const last = i === SETUP_STEPS.length - 1;
            return (
              <View key={step.key} style={styles.stepRow}>
                <View style={styles.rail}>
                  <View
                    style={[
                      styles.circle,
                      (isCurrent || isDone) && { borderColor: colors.gold },
                      isDone && { backgroundColor: colors.gold },
                    ]}>
                    {isDone ? (
                      <Icon name="check" size={18} color={colors.onGold} />
                    ) : (
                      <Text style={[styles.circleText, isCurrent && { color: colors.gold }]}>{i + 1}</Text>
                    )}
                  </View>
                  {!last ? <View style={[styles.line, isDone && { backgroundColor: colors.gold }]} /> : null}
                </View>

                <View style={[styles.stepBody, isCurrent && styles.stepBodyCurrent]}>
                  <View style={styles.stepHeader}>
                    <Text
                      style={[styles.stepTitle, !isCurrent && !isDone && { color: colors.textFaint }]}>
                      {step.title}
                    </Text>
                    {isDone && !isCurrent ? (
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`Edit ${step.title}`}
                        hitSlop={10}
                        onPress={() => router.push(STEP_INFO[step.key].route)}>
                        <Text style={styles.edit}>Edit</Text>
                      </Pressable>
                    ) : null}
                  </View>
                  {isCurrent ? (
                    <>
                      <Body muted style={{ fontSize: 14 }}>
                        {STEP_INFO[step.key].blurb}
                      </Body>
                      <GoldButton
                        title={step.key === 'preview' ? 'Review & publish' : completed ? 'Continue' : 'Start'}
                        chevron
                        onPress={() => router.push(STEP_INFO[step.key].route)}
                        style={{ marginTop: spacing.sm }}
                      />
                    </>
                  ) : null}
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.xl },
  header: { gap: spacing.sm, marginTop: spacing.md },
  stepRow: { flexDirection: 'row', gap: spacing.md },
  rail: { alignItems: 'center', width: 36 },
  circle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg,
  },
  circleText: { fontFamily: fonts.semibold, fontSize: 14, color: colors.textMuted },
  line: { flex: 1, width: 1, backgroundColor: colors.borderStrong, marginVertical: 4 },
  stepBody: { flex: 1, paddingTop: 7, paddingBottom: spacing.xl, gap: spacing.sm },
  stepBodyCurrent: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.hairline,
    borderRadius: radius.lg,
    padding: spacing.md,
    paddingTop: spacing.md,
    marginBottom: spacing.lg,
    marginTop: -spacing.sm,
  },
  stepHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  stepTitle: { fontFamily: fonts.display, fontSize: 23, color: colors.ivory, flexShrink: 1 },
  edit: { fontFamily: fonts.semibold, fontSize: 13, color: colors.gold, letterSpacing: 0.5 },
});
