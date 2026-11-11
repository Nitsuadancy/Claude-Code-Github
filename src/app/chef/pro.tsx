import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { FoundingMark } from '@/components/chef';
import { Icon } from '@/components/icon';
import { BackButton, Body, Eyebrow, GoldButton, Heading, Screen } from '@/components/ui';
import { FREE_FEATURES, PRO_FEATURES } from '@/data/pro';
import { confirmAction, notify } from '@/lib/alert';
import * as haptics from '@/lib/haptics';
import {
  foundingProUntil,
  PRO_PRICE_LABEL,
  PRO_YEARLY_SAVINGS_DOLLARS,
  proStatus,
  proStatusLine,
} from '@/lib/pro';
import { cardPaymentsOn } from '@/lib/payments';
import { proBillingLink } from '@/lib/remote/api';
import { supabase } from '@/lib/supabase';
import { useMyRestaurant, useServerRefresh, useStore } from '@/state/store';
import { colors, fonts, radius, spacing } from '@/theme';
import type { ProPlan } from '@/types';

const day = (d: Date) => d.toLocaleDateString(undefined, { month: 'long', day: 'numeric' });

/**
 * Manna Pro for cooks: what it adds, the two plans, and starting or
 * canceling. Until card payments are switched on, starting Pro turns it on
 * without a charge. Once they are, Pro is paid through Stripe on the web
 * (checkout to start, Stripe's billing page to change or cancel), and Stripe
 * tells the server, which turns Pro on or off.
 */
export default function MannaPro() {
  const { dispatch } = useStore();
  const refreshFromServer = useServerRefresh();
  const [opening, setOpening] = useState(false);
  const restaurant = useMyRestaurant();
  const [plan, setPlan] = useState<ProPlan>('yearly');
  const [now] = useState(() => new Date());
  if (!restaurant) return null;

  const status = proStatus(restaurant, now);
  const sub = restaurant.pro;
  const subscribed = !!sub && !sub.canceledAt;
  const foundingUntil = foundingProUntil(restaurant);
  const inFoundingMonths = !!foundingUntil && now < foundingUntil;

  /** Billing on: Stripe's checkout (to start) or billing page (to change, cancel or keep Pro). */
  const openBilling = async () => {
    if (!supabase) return;
    setOpening(true);
    try {
      await WebBrowser.openBrowserAsync(await proBillingLink(supabase, plan));
      await refreshFromServer();
    } catch (e) {
      notify('Couldn’t open billing', e instanceof Error ? e.message : 'Check your connection and try again.');
    } finally {
      setOpening(false);
    }
  };

  const start = () => {
    if (cardPaymentsOn) return void openBilling();
    haptics.success();
    dispatch({ type: 'startPro', restaurantId: restaurant.id, plan, at: new Date().toISOString() });
  };
  const resume = () =>
    cardPaymentsOn ? void openBilling() : dispatch({ type: 'resumePro', restaurantId: restaurant.id });
  const cancel = () =>
    cardPaymentsOn
      ? void openBilling()
      : confirmAction(
      'Cancel Manna Pro?',
      status.until
        ? `Pro stays on until ${day(status.until)}, and you won’t be charged again. Your drops, codes and requests stay saved.`
        : 'You won’t be charged again.',
      'Cancel Pro',
      () => dispatch({ type: 'cancelPro', restaurantId: restaurant.id, at: new Date().toISOString() }),
      'Keep Pro',
    );

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <BackButton />

        <View style={{ gap: spacing.sm }}>
          <Eyebrow>Manna Pro</Eyebrow>
          <Heading size={32}>Sell more, with less work</Heading>
          <Body muted>
            Tools that bring in more orders and bigger ones. Your storefront, orders and payouts come with every kitchen,
            with or without Pro.
          </Body>
        </View>

        {status.active ? (
          <View style={styles.status}>
            {status.source === 'founding' ? <FoundingMark size={14} /> : null}
            <Text style={styles.statusTitle}>You’re on Pro</Text>
            <Text style={styles.statusBody}>{proStatusLine(restaurant, now)}</Text>
            {status.ending && sub ? (
              <GoldButton
                title="Keep Pro"
                variant="outline"
                loading={opening}
                onPress={resume}
                style={{ marginTop: spacing.sm }}
              />
            ) : null}
          </View>
        ) : sub?.canceledAt ? (
          <View style={styles.status}>
            <Text style={styles.statusTitle}>Your Pro plan ended</Text>
            <Text style={styles.statusBody}>Start it again any time. Everything you set up is still saved.</Text>
          </View>
        ) : null}

        <View style={styles.card}>
          <Text style={styles.cardTitle}>{status.active ? 'Your Pro tools' : 'What Pro adds'}</Text>
          {PRO_FEATURES.map((f, i) => {
            const open = status.active && f.route;
            return (
              <Pressable
                key={f.key}
                disabled={!open}
                accessibilityRole={open ? 'button' : undefined}
                onPress={() => (f.route ? router.push(f.route) : undefined)}
                style={({ pressed }) => [styles.feature, i > 0 && styles.rule, pressed && { opacity: 0.7 }]}>
                <View style={styles.featureIcon}>
                  <Icon name={f.icon} size={18} color={colors.gold} />
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={styles.featureTitle}>{f.title}</Text>
                  <Text style={styles.featureBody}>{f.body}</Text>
                </View>
                {open ? <Icon name="chevron-right" size={18} color={colors.textMuted} /> : null}
                {status.active && f.key === 'featured' ? <Text style={styles.onTag}>On</Text> : null}
              </Pressable>
            );
          })}
        </View>

        {subscribed ? null : (
          <View style={{ gap: spacing.md }}>
            <Text style={styles.cardTitle}>
              {inFoundingMonths && foundingUntil ? `Keep Pro after ${day(foundingUntil)}` : 'Choose your plan'}
            </Text>
            {inFoundingMonths && foundingUntil ? (
              <Body muted style={{ fontSize: 14 }}>
                Pro is free for your first 3 months as a founding kitchen. Choose a plan now and nothing is charged before{' '}
                {day(foundingUntil)}.
              </Body>
            ) : null}
            <View style={styles.plans}>
              <PlanOption
                selected={plan === 'monthly'}
                onPress={() => setPlan('monthly')}
                title="Monthly"
                price="$19.99"
                per="a month"
              />
              <PlanOption
                selected={plan === 'yearly'}
                onPress={() => setPlan('yearly')}
                title="Yearly"
                price="$199"
                per="a year"
                tag={`Save $${PRO_YEARLY_SAVINGS_DOLLARS}`}
              />
            </View>
            <GoldButton
              title={inFoundingMonths ? `Keep Pro · ${PRO_PRICE_LABEL[plan]}` : `Start Pro · ${PRO_PRICE_LABEL[plan]}`}
              loading={opening}
              onPress={start}
            />
            <Body muted style={styles.note}>
              {cardPaymentsOn
                ? 'You’ll finish on Stripe’s secure checkout. Cancel any time: Pro stays on until the end of the period you paid for.'
                : 'Billing isn’t connected yet, so this turns Pro on without a charge. Cancel any time: Pro stays on until the end of the period you paid for.'}
            </Body>
          </View>
        )}

        <View style={{ gap: spacing.sm }}>
          <Text style={styles.cardTitle}>Every kitchen gets</Text>
          {FREE_FEATURES.map((line) => (
            <View key={line} style={styles.freeRow}>
              <Icon name="check" size={16} color={colors.success} />
              <Text style={styles.freeText}>{line}</Text>
            </View>
          ))}
        </View>

        {subscribed ? (
          <GoldButton title={cardPaymentsOn ? 'Manage or cancel Pro' : 'Cancel Pro'} variant="ghost" onPress={cancel} />
        ) : null}
      </ScrollView>
    </Screen>
  );
}

function PlanOption({
  selected,
  onPress,
  title,
  price,
  per,
  tag,
}: {
  selected: boolean;
  onPress: () => void;
  title: string;
  price: string;
  per: string;
  tag?: string;
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={`${title}, ${price} ${per}${tag ? `, ${tag}` : ''}`}
      onPress={onPress}
      style={[styles.plan, selected && styles.planOn]}>
      <View style={styles.planHead}>
        <Text style={[styles.planTitle, selected && { color: colors.gold }]}>{title}</Text>
        {tag ? <Text style={styles.planTag}>{tag}</Text> : null}
      </View>
      <Text style={styles.planPrice}>{price}</Text>
      <Text style={styles.planPer}>{per}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.lg },
  status: {
    borderWidth: 1.5,
    borderColor: colors.gold,
    backgroundColor: colors.goldTint,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: 4,
  },
  statusTitle: { fontFamily: fonts.semibold, fontSize: 18, color: colors.ivory },
  statusBody: { fontFamily: fonts.body, fontSize: 14, lineHeight: 20, color: colors.text },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, gap: spacing.sm },
  cardTitle: { fontFamily: fonts.semibold, fontSize: 17, color: colors.ivory },
  feature: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm + 2 },
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
  onTag: { fontFamily: fonts.semibold, fontSize: 12, color: colors.success },
  plans: { flexDirection: 'row', gap: spacing.sm },
  plan: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: 2,
  },
  planOn: { borderColor: colors.gold, borderWidth: 1.5, backgroundColor: colors.goldTint },
  planHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.xs },
  planTitle: { fontFamily: fonts.semibold, fontSize: 14, color: colors.ivory },
  planTag: { fontFamily: fonts.semibold, fontSize: 11, color: colors.success },
  planPrice: { fontFamily: fonts.display, fontSize: 28, color: colors.ivory, marginTop: spacing.xs },
  planPer: { fontFamily: fonts.body, fontSize: 13, color: colors.textMuted },
  freeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  freeText: { flex: 1, fontFamily: fonts.body, fontSize: 14, color: colors.text },
  note: { fontSize: 12, textAlign: 'center' },
});
