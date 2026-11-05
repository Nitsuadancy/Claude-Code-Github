import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Body, Eyebrow, GoldButton, Heading, type IconName, Rays, Screen } from '@/components/ui';
import { resetTo } from '@/lib/navigation';
import { useStore } from '@/state/store';
import { colors, fonts, radius, spacing } from '@/theme';
import type { Role } from '@/types';
import { Icon } from '@/components/icon';

const OPTIONS: { role: Role; title: string; tagline: string; body: string; icon: IconName }[] = [
  {
    role: 'foodie',
    title: 'Foodie',
    tagline: 'Discover meals crafted with care.',
    body: 'Order from talented home chefs in your neighborhood.',
    icon: 'silverware-variant',
  },
  {
    role: 'chef',
    title: 'Culinary Entrepreneur',
    tagline: 'Bring your dream restaurant to life.',
    body: 'Set your menu and your hours. No lease or storefront needed.',
    icon: 'chef-hat',
  },
];

export default function ChooseRole() {
  const { state, dispatch } = useStore();
  const [role, setRole] = useState<Role | null>(state.user?.role ?? state.pendingRole);

  const onContinue = () => {
    if (!role) return;
    dispatch({ type: 'chooseRole', role });
    resetTo(state.user ? '/' : '/login');
  };

  return (
    <Screen style={{ backgroundColor: colors.black }}>
      <Rays size={560} opacity={0.18} style={{ top: -280 }} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Eyebrow>Welcome to Manna</Eyebrow>
          <Heading size={32}>How will you{'\n'}join the table?</Heading>
        </View>

        <View accessibilityRole="radiogroup" style={{ gap: spacing.md }}>
          {OPTIONS.map((o) => {
            const selected = role === o.role;
            return (
              <Pressable
                key={o.role}
                accessibilityRole="radio"
                accessibilityState={{ checked: selected }}
                accessibilityLabel={`${o.title}. ${o.tagline}`}
                onPress={() => setRole(o.role)}
                style={[styles.card, selected && styles.cardSelected]}>
                <View style={styles.cardTop}>
                  <View style={[styles.iconRing, selected && { borderColor: colors.gold }]}>
                    <Icon name={o.icon} size={26} color={colors.gold} />
                  </View>
                  <View style={[styles.radio, selected && styles.radioOn]}>
                    {selected ? <View style={styles.radioDot} /> : null}
                  </View>
                </View>
                <Heading size={24}>{o.title}</Heading>
                <Text style={styles.tagline}>{o.tagline}</Text>
                <Body muted style={{ fontSize: 14 }}>
                  {o.body}
                </Body>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
      <View style={styles.footer}>
        <GoldButton title="Continue" chevron disabled={!role} onPress={onContinue} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.xl, paddingTop: spacing.xxl },
  header: { gap: spacing.sm },
  card: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.xs,
    backgroundColor: colors.surface,
  },
  cardSelected: { borderColor: colors.gold, backgroundColor: '#18140C' },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm },
  iconRing: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: colors.hairline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOn: { borderColor: colors.gold },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.gold },
  tagline: { fontFamily: fonts.displayItalic, fontSize: 18, color: colors.gold },
  footer: { paddingHorizontal: spacing.lg, paddingBottom: spacing.md, paddingTop: spacing.sm },
});
