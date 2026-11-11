import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { FormScreen } from '@/components/form-screen';
import { Icon, type IconName } from '@/components/icon';
import { Body, GoldButton } from '@/components/ui';
import { hasPro } from '@/lib/pro';
import { useMyRestaurant } from '@/state/store';
import { colors, fonts, spacing } from '@/theme';
import type { Restaurant } from '@/types';

/** The signed-in cook's kitchen, if it's on Pro right now. */
export function useProKitchen(): { restaurant: Restaurant | undefined; pro: boolean } {
  const restaurant = useMyRestaurant();
  return { restaurant, pro: hasPro(restaurant, new Date()) };
}

/**
 * Shown instead of a Pro tool to cooks without Pro: what the tool does and a
 * way to start Pro. Anything they set up earlier stays saved.
 */
export function ProLocked({ title, icon, pitch }: { title: string; icon: IconName; pitch: string }) {
  return (
    <FormScreen title={title} footer={<GoldButton title="See Manna Pro" chevron onPress={() => router.push('/chef/pro')} />}>
      <View style={styles.locked}>
        <View style={styles.icon}>
          <Icon name={icon} size={26} color={colors.gold} />
        </View>
        <Text style={styles.lockedTitle}>{title} is part of Manna Pro</Text>
        <Body muted style={{ textAlign: 'center' }}>
          {pitch}
        </Body>
      </View>
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  locked: { alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xl },
  icon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.goldTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockedTitle: { fontFamily: fonts.display, fontSize: 24, color: colors.ivory, textAlign: 'center' },
});
