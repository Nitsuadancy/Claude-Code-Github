import * as WebBrowser from 'expo-web-browser';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/icon';
import { notify } from '@/lib/alert';
import { cardPaymentsOn } from '@/lib/payments';
import { loadPayoutsReady, payoutsLink } from '@/lib/remote/api';
import { supabase } from '@/lib/supabase';
import { colors, fonts, radius, spacing } from '@/theme';

/**
 * Where a cook connects their bank account. Stripe handles the setup (bank,
 * identity, tax details) on its own pages; until it's done, customers can't
 * order from the kitchen. Shown only when card payments are switched on.
 */
export function PayoutsCard({ userId }: { userId: string }) {
  const [ready, setReady] = useState<boolean | null>(null);
  const [opening, setOpening] = useState(false);

  // Leave the card as it was if the check fails; the next visit checks again.
  const check = () => (supabase ? loadPayoutsReady(supabase, userId).then(setReady, () => undefined) : Promise.resolve());

  useEffect(() => {
    if (!supabase || !cardPaymentsOn) return;
    loadPayoutsReady(supabase, userId).then(setReady, () => undefined);
  }, [userId]);

  if (!cardPaymentsOn || !supabase || ready === null) return null;
  const db = supabase;

  const open = async () => {
    setOpening(true);
    try {
      const { url } = await payoutsLink(db);
      await WebBrowser.openBrowserAsync(url);
      await check();
    } catch (e) {
      notify('Couldn’t open Stripe', e instanceof Error ? e.message : 'Check your connection and try again.');
    } finally {
      setOpening(false);
    }
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={ready ? 'Payouts. Open your Stripe dashboard' : 'Set up payouts so customers can order'}
      onPress={() => void open()}
      disabled={opening}
      style={({ pressed }) => [styles.card, !ready && styles.needed, pressed && { opacity: 0.8 }]}>
      <View style={[styles.icon, ready && { backgroundColor: colors.surfaceRaised }]}>
        <Icon name="currency-usd" size={20} color={ready ? colors.gold : colors.bg} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={styles.title}>{ready ? 'Payouts' : 'Set up payouts'}</Text>
        <Text style={styles.body}>
          {ready
            ? 'Paid out to your bank by Stripe. See payouts and tax forms.'
            : 'Add your bank with Stripe so customers can order. It takes about 5 minutes.'}
        </Text>
      </View>
      {opening ? <ActivityIndicator color={colors.gold} /> : <Icon name="chevron-right" size={20} color={colors.textMuted} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  needed: { borderWidth: 1, borderColor: colors.gold },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontFamily: fonts.semibold, fontSize: 16, color: colors.ivory },
  body: { fontFamily: fonts.body, fontSize: 13, lineHeight: 18, color: colors.textMuted },
});
