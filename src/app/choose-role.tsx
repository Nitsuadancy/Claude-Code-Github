import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Body, GoldButton, type IconName, Screen } from '@/components/ui';
import { resetTo } from '@/lib/navigation';
import { useStore } from '@/state/store';
import { colors, fonts, goldGlow, radius, spacing } from '@/theme';
import type { Role } from '@/types';

const OPTIONS: { role: Role; title: string; body: string; icon: IconName }[] = [
  {
    role: 'foodie',
    title: 'FOODIE',
    body: 'Discover and enjoy meals crafted with care.',
    icon: 'silverware-variant',
  },
  {
    role: 'chef',
    title: 'CULINARY ENTREPRENEUR',
    body: 'Bring your dream restaurant to life.',
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
    <Screen tone="dark" style={styles.screen}>
      <View accessibilityRole="radiogroup" style={styles.options}>
        {OPTIONS.map((o) => {
          const selected = role === o.role;
          return (
            <Pressable
              key={o.role}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
              accessibilityLabel={`${o.title}. ${o.body}`}
              onPress={() => setRole(o.role)}
              style={[styles.card, selected && styles.cardSelected]}>
              <View style={styles.cardIcon} pointerEvents="none">
                <MaterialCommunityIcons name={o.icon} size={96} color="rgba(227,174,10,0.18)" />
              </View>
              <Text style={styles.cardTitle}>{o.title}</Text>
              <Body tone="dark" style={styles.cardBody}>
                {o.body}
              </Body>
            </Pressable>
          );
        })}
      </View>
      <GoldButton
        title="Continue"
        tone="dark"
        fullWidth={false}
        disabled={!role}
        onPress={onContinue}
        style={{ marginBottom: spacing.lg, minWidth: 260 }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { paddingHorizontal: spacing.lg, justifyContent: 'space-between' },
  options: { flex: 1, justifyContent: 'center', gap: spacing.xl },
  card: {
    borderWidth: 1.5,
    borderColor: colors.borderDark,
    borderRadius: radius.md,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    backgroundColor: colors.black,
  },
  cardSelected: { borderColor: colors.gold, backgroundColor: colors.cardDark, ...goldGlow },
  cardIcon: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', paddingTop: spacing.sm },
  cardTitle: {
    fontFamily: fonts.headingSemi,
    color: colors.gold,
    fontSize: 24,
    letterSpacing: 1,
    textAlign: 'center',
  },
  cardBody: { fontSize: 18, textAlign: 'center', marginTop: spacing.lg },
});
