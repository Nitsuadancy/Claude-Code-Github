import { Share, StyleSheet, Text, View } from 'react-native';

import { FormScreen } from '@/components/form-screen';
import { Icon } from '@/components/icon';
import { Body, GoldButton, SectionTitle } from '@/components/ui';
import { notify } from '@/lib/alert';
import * as haptics from '@/lib/haptics';
import { feeFreeUntil } from '@/lib/pricing';
import { formatMonthDay } from '@/lib/orders';
import {
  cookReferralMessage,
  kitchensInvitedBy,
  MAX_CREDIT_MONTHS,
  referralCodeOf,
} from '@/lib/referrals';
import { useAllRestaurants, useMyRestaurant } from '@/state/store';
import { colors, fonts, radius, spacing } from '@/theme';

/** Invite other cooks: when a cook opens with your code, you both get a month with no Manna fee. */
export default function InviteCooks() {
  const restaurant = useMyRestaurant();
  const all = useAllRestaurants();
  if (!restaurant) {
    return (
      <FormScreen title="Invite a cook">
        <Body muted>Open your kitchen first.</Body>
      </FormScreen>
    );
  }
  const code = referralCodeOf(restaurant);
  const joined = kitchensInvitedBy(all, code);
  const now = new Date();
  const until = feeFreeUntil(restaurant);
  const live = restaurant.status === 'live';

  const share = async () => {
    const message = cookReferralMessage(restaurant.name, code);
    haptics.tap();
    try {
      await Share.share({ message, title: 'Open a kitchen on Manna' });
    } catch {
      notify('Your invite', message);
    }
  };

  return (
    <FormScreen title="Invite a cook" footer={<GoldButton title="Share your invite" icon="export-variant" onPress={share} />}>
      <View style={{ gap: spacing.sm }}>
        <Text style={styles.title}>Bring a cook, get a month free</Text>
        <Body muted>
          When a cook you invite opens their kitchen with your code, you both get a month with no Manna fee. Invite as
          many as you like: months stack, up to {MAX_CREDIT_MONTHS} ahead.
        </Body>
      </View>

      <View style={styles.codeCard} accessible accessibilityLabel={`Your invite code: ${code.split('').join(' ')}`}>
        <Text style={styles.codeLabel}>Your invite code</Text>
        <Text style={styles.code}>{code}</Text>
        {live ? null : <Text style={styles.codeNote}>It starts counting once your kitchen is open.</Text>}
      </View>

      <View style={styles.status}>
        <Icon name="ticket-percent" size={20} color={until && until > now ? colors.success : colors.textMuted} />
        <Text style={styles.statusText}>
          {until && until > now
            ? `No Manna fee until ${formatMonthDay(until.toISOString())}`
            : 'Your next invite earns a fee-free month.'}
        </Text>
      </View>

      <SectionTitle>Who to invite</SectionTitle>
      <View style={{ gap: spacing.sm }}>
        {[
          'The baker you buy from at the farmers market',
          'A friend whose cookies always disappear first',
          'Cooks in your Facebook groups and church kitchen',
          'Anyone selling food through Instagram DMs and Venmo',
        ].map((line) => (
          <View key={line} style={styles.idea}>
            <Icon name="chef-hat" size={16} color={colors.gold} />
            <Text style={styles.ideaText}>{line}</Text>
          </View>
        ))}
      </View>

      {joined.length ? (
        <>
          <SectionTitle>Opened with your code</SectionTitle>
          {joined.map((k) => (
            <View key={k.id} style={styles.idea}>
              <Icon name="check-circle" size={16} color={colors.success} />
              <Text style={styles.ideaText}>
                {k.name}
                {k.neighborhood ? ` · ${k.neighborhood}` : ''}
              </Text>
            </View>
          ))}
        </>
      ) : null}
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  title: { fontFamily: fonts.display, fontSize: 28, lineHeight: 32, color: colors.ivory },
  codeCard: {
    alignItems: 'center',
    gap: 6,
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.gold,
    backgroundColor: colors.goldTint,
  },
  codeLabel: { fontFamily: fonts.medium, fontSize: 13, color: colors.textMuted },
  code: { fontFamily: fonts.monoMedium, fontSize: 30, letterSpacing: 2, color: colors.ivory },
  codeNote: { fontFamily: fonts.body, fontSize: 12, color: colors.textMuted },
  status: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  statusText: { flex: 1, fontFamily: fonts.semibold, fontSize: 14, color: colors.ivory },
  idea: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  ideaText: { flex: 1, fontFamily: fonts.body, fontSize: 15, color: colors.text },
});
