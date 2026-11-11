import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { isComingSoon, isOpenState, stateName } from '@/data/regions';
import * as haptics from '@/lib/haptics';
import { shareCookInvite } from '@/lib/share';
import { colors, fonts, radius, spacing } from '@/theme';

import { EmptyArtwork } from './empty-state';
import { Icon } from './icon';
import { GoldButton } from './ui';

/**
 * Home for someone with no kitchens in reach yet. Manna grows cook by cook,
 * so it asks them to join the list for their ZIP and to invite a home cook
 * they'd buy from. The list tells the team where to recruit next.
 */
export function NoKitchensNearby({
  area,
  zip,
  state,
  joined,
  onJoin,
  onSeeOrlando,
}: {
  /** "Austin" */
  area: string;
  zip?: string;
  /** Two-letter state code, when known. */
  state?: string;
  joined: boolean;
  onJoin: () => void;
  onSeeOrlando: () => void;
}) {
  const open = isOpenState(state);
  const soon = isComingSoon(state);
  return (
    <View style={styles.wrap}>
      <EmptyArtwork art="oven" size={112} />
      <Text style={styles.title}>No kitchens near {area} yet</Text>
      <Text style={styles.body}>
        Manna is growing one home cook at a time.{' '}
        {open
          ? `Cooks in ${stateName(state)} can open a kitchen today, so the first ones near you could be days away.`
          : soon
            ? `Manna is opening in ${stateName(state)} soon, and cooks there can already set up their kitchens.`
            : `We’re getting ready for ${state ? stateName(state) : 'your state'}, where home-food rules are a little different.`}
      </Text>

      {joined ? (
        <View style={styles.joined}>
          <Icon name="check-circle" size={20} color={colors.success} />
          <Text style={styles.joinedText}>
            You’re on the list{zip ? ` for ${zip}` : ''}. We’ll tell you when kitchens open near you.
          </Text>
        </View>
      ) : (
        <GoldButton
          title="Tell me when kitchens open here"
          icon="bell-outline"
          onPress={() => {
            haptics.success();
            onJoin();
          }}
        />
      )}

      <Pressable
        accessibilityRole="button"
        onPress={() => void shareCookInvite(area)}
        style={({ pressed }) => [styles.invite, pressed && { opacity: 0.85 }]}>
        <View style={styles.inviteIcon}>
          <Icon name="chef-hat" size={20} color={colors.bg} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={styles.inviteTitle}>Know a great home cook?</Text>
          <Text style={styles.inviteBody}>
            The baker whose banana bread you’d pay for, the friend with the famous tamales. Invite them to open a free
            kitchen.
          </Text>
        </View>
        <Icon name="export-variant" size={18} color={colors.textMuted} />
      </Pressable>

      <View style={styles.links}>
        <Pressable accessibilityRole="button" onPress={() => router.push('/location')} hitSlop={8}>
          <Text style={styles.link}>Change your area</Text>
        </Pressable>
        <Text style={styles.dot}>·</Text>
        <Pressable accessibilityRole="button" onPress={onSeeOrlando} hitSlop={8}>
          <Text style={styles.link}>See Manna in Orlando</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    gap: spacing.md,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
  },
  title: {
    fontFamily: fonts.display,
    fontSize: 26,
    lineHeight: 30,
    color: colors.ivory,
    textAlign: 'center',
  },
  body: {
    fontFamily: fonts.body,
    fontSize: 15,
    lineHeight: 22,
    color: colors.textMuted,
    textAlign: 'center',
  },
  joined: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    alignSelf: 'stretch',
  },
  joinedText: {
    flex: 1,
    fontFamily: fonts.medium,
    fontSize: 14,
    lineHeight: 20,
    color: colors.ivory,
  },
  invite: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    alignSelf: 'stretch',
  },
  inviteIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inviteTitle: {
    fontFamily: fonts.semibold,
    fontSize: 16,
    color: colors.ivory,
  },
  inviteBody: {
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 19,
    color: colors.textMuted,
  },
  links: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  link: { fontFamily: fonts.semibold, fontSize: 14, color: colors.gold },
  dot: { color: colors.textFaint },
});
