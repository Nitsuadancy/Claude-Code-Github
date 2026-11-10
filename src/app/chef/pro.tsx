import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { FoundingMark } from '@/components/chef';
import { Icon } from '@/components/icon';
import { BackButton, Body, Eyebrow, GoldButton, Heading, Screen } from '@/components/ui';
import { FREE_FEATURES, hasFoundingProOffer, PRO_FEATURES } from '@/data/pro';
import * as haptics from '@/lib/haptics';
import { PRO_PRICE_CENTS } from '@/lib/pricing';
import { useMyRestaurant, useStore } from '@/state/store';
import { colors, fonts, radius, spacing } from '@/theme';

/**
 * Manna Pro for cooks. Billing isn't connected yet, so this shows the plan
 * and lets a cook ask to hear when it opens. It never takes payment.
 */
export default function MannaPro() {
  const { state, dispatch } = useStore();
  const restaurant = useMyRestaurant();
  const founding = hasFoundingProOffer(restaurant);
  const onList = !!state.proInterestAt;

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <BackButton />

        <View style={{ gap: spacing.sm }}>
          <Eyebrow>Manna Pro · coming soon</Eyebrow>
          <Heading size={32}>Sell more, with less work</Heading>
          <Body muted>
            Your storefront, orders and payouts come with every kitchen. Pro is an optional plan with tools for
            busy kitchens, for ${PRO_PRICE_CENTS / 100} a month once it opens.
          </Body>
        </View>

        {founding ? (
          <View style={styles.founding}>
            <FoundingMark size={14} />
            <Text style={styles.foundingTitle}>Pro is free for your first year</Text>
            <Text style={styles.foundingBody}>
              A thank-you for being one of the first kitchens on Manna. It turns on automatically when Pro opens.
            </Text>
          </View>
        ) : null}

        <View style={styles.card}>
          <Text style={styles.cardTitle}>What Pro adds</Text>
          {PRO_FEATURES.map((f, i) => (
            <View key={f.title} style={[styles.feature, i > 0 && styles.rule]}>
              <View style={styles.featureIcon}>
                <Icon name={f.icon} size={18} color={colors.gold} />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={styles.featureTitle}>{f.title}</Text>
                <Text style={styles.featureBody}>{f.body}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={{ gap: spacing.sm }}>
          <Text style={styles.cardTitle}>Always free</Text>
          {FREE_FEATURES.map((line) => (
            <View key={line} style={styles.freeRow}>
              <Icon name="check" size={16} color={colors.success} />
              <Text style={styles.freeText}>{line}</Text>
            </View>
          ))}
        </View>

        {onList ? (
          <View style={styles.onList}>
            <Icon name="check-circle" size={20} color={colors.success} />
            <Text style={styles.onListText}>
              You’re on the list. We’ll tell you when Pro opens{founding ? ', and your free year starts then' : ''}.
            </Text>
          </View>
        ) : (
          <GoldButton
            title="Notify me when Pro opens"
            icon="bell-outline"
            onPress={() => {
              haptics.success();
              dispatch({ type: 'joinProWaitlist', at: new Date().toISOString() });
            }}
          />
        )}
        <Body muted style={styles.note}>
          Pricing is announced before Pro opens. Nothing is charged until you choose to start it.
        </Body>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.lg },
  founding: {
    borderWidth: 1.5,
    borderColor: colors.gold,
    backgroundColor: colors.goldTint,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: 4,
  },
  foundingTitle: { fontFamily: fonts.semibold, fontSize: 18, color: colors.ivory },
  foundingBody: { fontFamily: fonts.body, fontSize: 14, lineHeight: 20, color: colors.text },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, gap: spacing.sm },
  cardTitle: { fontFamily: fonts.semibold, fontSize: 17, color: colors.ivory },
  feature: { flexDirection: 'row', gap: spacing.md, paddingVertical: spacing.sm + 2 },
  rule: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  featureIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.goldTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureTitle: { fontFamily: fonts.semibold, fontSize: 15, color: colors.ivory },
  featureBody: { fontFamily: fonts.body, fontSize: 13, lineHeight: 19, color: colors.textMuted },
  freeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  freeText: { fontFamily: fonts.body, fontSize: 14, color: colors.text },
  onList: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  onListText: { flex: 1, fontFamily: fonts.medium, fontSize: 14, lineHeight: 20, color: colors.ivory },
  note: { fontSize: 12, textAlign: 'center' },
});
