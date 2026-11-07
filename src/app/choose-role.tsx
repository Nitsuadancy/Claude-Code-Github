import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';

import { Eyebrow, GoldButton, Heading, type IconName, Rays, Screen } from '@/components/ui';
import { photoSource } from '@/lib/photo';
import { resetTo } from '@/lib/navigation';
import { useStore } from '@/state/store';
import { colors, fonts, radius, spacing } from '@/theme';
import type { Role } from '@/types';
import { Icon } from '@/components/icon';

type Choice = Role | 'grower';

const OPTIONS: { role: Choice; title: string; tagline: string; body: string; icon: IconName; photo: string }[] = [
  {
    role: 'foodie',
    title: 'Foodie',
    tagline: 'Homemade, from the kitchen next door.',
    body: 'Order from home cooks in your neighborhood and pick up nearby.',
    icon: 'silverware-variant',
    photo: 'demo:cinnamon-rolls',
  },
  {
    role: 'chef',
    title: 'Culinary Entrepreneur',
    tagline: 'Turn your kitchen into a storefront.',
    body: 'Set your menu, your hours and your daily limits. Free to join.',
    icon: 'chef-hat',
    photo: 'demo:country-loaf',
  },
  {
    role: 'grower',
    title: 'Farmer or Artisan',
    tagline: 'Money stays in your zip code.',
    body: 'Sell farm-direct to neighbors and home cooks. Manna Mart opens soon: join the waitlist.',
    icon: 'wheat',
    photo: 'demo:apricot-jam',
  },
];

export default function ChooseRole() {
  const { state, dispatch } = useStore();
  const [role, setRole] = useState<Choice | null>(state.user?.role ?? state.pendingRole);

  const onContinue = () => {
    if (!role) return;
    if (role === 'grower') {
      router.push('/grow');
      return;
    }
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
                <Image source={photoSource(o.photo)} style={StyleSheet.absoluteFill} contentFit="cover" />
                <LinearGradient
                  colors={['rgba(11,11,11,0.15)', 'rgba(11,11,11,0.88)']}
                  locations={[0, 0.85]}
                  style={StyleSheet.absoluteFill}
                />
                <View style={styles.radio}>
                  <Icon
                    name={selected ? 'check-circle' : 'checkbox-blank-circle-outline'}
                    size={26}
                    color={selected ? colors.ivory : 'rgba(247,244,238,0.75)'}
                  />
                </View>
                <View style={styles.cardText}>
                  <Text style={styles.cardTitle}>{o.title}</Text>
                  <Text style={styles.tagline}>{o.tagline}</Text>
                  <Text style={styles.cardBody}>{o.body}</Text>
                </View>
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
    height: 172,
    borderRadius: radius.lg,
    overflow: 'hidden',
    justifyContent: 'flex-end',
    borderWidth: 2,
    borderColor: 'transparent',
    backgroundColor: colors.surface,
  },
  cardSelected: { borderColor: colors.ivory },
  cardText: { padding: spacing.md + 2, gap: 3 },
  cardTitle: { fontFamily: fonts.display, fontSize: 24, letterSpacing: -0.6, color: colors.ivory },
  tagline: { fontFamily: fonts.medium, fontSize: 14, color: colors.gold },
  cardBody: { fontFamily: fonts.body, fontSize: 13, lineHeight: 18, color: 'rgba(247,244,238,0.75)' },
  radio: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
  },
  footer: { paddingHorizontal: spacing.lg, paddingBottom: spacing.md, paddingTop: spacing.sm },
});
