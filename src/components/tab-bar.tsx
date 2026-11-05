import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, fonts, radius, spacing } from '@/theme';

import type { IconName } from './ui';

const TAB_META: Record<string, { label: string; icon: IconName; activeIcon: IconName }> = {
  index: { label: 'Discover', icon: 'compass-outline', activeIcon: 'compass' },
  orders: { label: 'Orders', icon: 'receipt-text-outline', activeIcon: 'receipt-text' },
  cart: { label: 'Cart', icon: 'shopping-outline', activeIcon: 'shopping' },
  profile: { label: 'Profile', icon: 'account-outline', activeIcon: 'account' },
};

/** Height the floating bar occupies, so screens can pad their scroll content. */
export const TAB_BAR_SPACE = 110;

/** Floating dark-glass tab bar with a fine gold outline. */
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
      style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
      <View style={styles.bar}>
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
              <View>
                <MaterialCommunityIcons
                  name={focused ? meta.activeIcon : meta.icon}
                  size={24}
                  color={focused ? colors.gold : colors.textMuted}
                />
                {badge > 0 ? (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{badge > 9 ? '9+' : badge}</Text>
                  </View>
                ) : null}
              </View>
              <Text style={[styles.label, { color: focused ? colors.ivory : colors.textMuted }]}>
                {meta.label}
              </Text>
              <View style={[styles.indicator, focused && { backgroundColor: colors.gold }]} />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: spacing.md },
  bar: {
    flexDirection: 'row',
    overflow: 'hidden',
    backgroundColor: Platform.OS === 'ios' ? 'rgba(20,18,14,0.72)' : 'rgba(20,18,14,0.97)',
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.hairline,
    paddingTop: 10,
    paddingBottom: 6,
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },
  item: { flex: 1, alignItems: 'center', gap: 3, minHeight: 50, justifyContent: 'center' },
  label: { fontFamily: fonts.medium, fontSize: 11, letterSpacing: 0.4 },
  indicator: { width: 4, height: 4, borderRadius: 2, marginTop: 2, backgroundColor: 'transparent' },
  badge: {
    position: 'absolute',
    top: -4,
    right: -10,
    minWidth: 17,
    height: 17,
    borderRadius: 9,
    paddingHorizontal: 4,
    backgroundColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { color: colors.onGold, fontSize: 10, fontFamily: fonts.semibold },
});
