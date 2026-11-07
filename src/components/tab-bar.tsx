import { BlurView } from 'expo-blur';
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, fonts, radius, spacing } from '@/theme';

import type { IconName } from './ui';
import { Icon } from './icon';
import { Pop } from './motion';

const TAB_META: Record<string, { label: string; icon: IconName; activeIcon: IconName }> = {
  index: { label: 'Discover', icon: 'compass-outline', activeIcon: 'compass' },
  orders: { label: 'Orders', icon: 'receipt-text-outline', activeIcon: 'receipt-text' },
  cart: { label: 'Cart', icon: 'shopping-outline', activeIcon: 'shopping' },
  profile: { label: 'Profile', icon: 'account-outline', activeIcon: 'account' },
};

/** Height the bar occupies, so screens can pad their scroll content. */
export const TAB_BAR_SPACE = 96;

/** Edge-to-edge bar under a hairline (frosted on iOS, solid elsewhere so text never shows through); the current tab is bright, the rest recede. */
export function MannaTabBar({
  state,
  emitter,
  navigateToTab,
  badges = {},
}: BottomTabBarProps & { badges?: Record<string, number> }) {
  const insets = useSafeAreaInsets();
  return (
    <View
      pointerEvents="box-none"
      style={styles.wrap}>
      <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, spacing.sm) }]}>
        {Platform.OS === 'ios' ? (
          <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
        ) : null}
        {state.routes.map((route, index) => {
          const meta = TAB_META[route.name];
          if (!meta) return null;
          const focused = state.index === index;
          const badge = badges[route.name] ?? 0;
          const onPress = () => {
            const event = emitter.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!focused && !event.defaultPrevented) navigateToTab(route.key);
          };
          return (
            <Pressable
              key={route.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={badge ? `${meta.label}, ${badge} items` : meta.label}
              onPress={onPress}
              style={styles.item}>
              <Pop trigger={badge} to={1.2}>
                <Icon
                  name={focused ? meta.activeIcon : meta.icon}
                  size={22}
                  color={focused ? colors.ivory : colors.textFaint}
                />
                {badge > 0 ? (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{badge > 9 ? '9+' : badge}</Text>
                  </View>
                ) : null}
              </Pop>
              <Text
                maxFontSizeMultiplier={1.2}
                style={[styles.label, { color: focused ? colors.ivory : colors.textFaint }]}>
                {meta.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  bar: {
    flexDirection: 'row',
    overflow: 'hidden',
    backgroundColor: Platform.OS === 'ios' ? 'rgba(11,11,11,0.72)' : colors.bg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.hairline,
  },
  item: { flex: 1, alignItems: 'center', gap: 4, minHeight: 56, paddingTop: 10 },
  label: { fontFamily: fonts.medium, fontSize: 11 },
  badge: {
    position: 'absolute',
    top: -4,
    right: -10,
    minWidth: 17,
    height: 17,
    borderRadius: radius.pill,
    paddingHorizontal: 4,
    backgroundColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { color: colors.onGold, fontSize: 10, fontFamily: fonts.semibold },
});
