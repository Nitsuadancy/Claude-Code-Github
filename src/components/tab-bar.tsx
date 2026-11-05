import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, fonts, goldGlow, radius, spacing } from '@/theme';

import type { IconName } from './ui';

const TAB_META: Record<string, { label: string; icon: IconName }> = {
  index: { label: 'Delivery', icon: 'moped' },
  orders: { label: 'Orders', icon: 'receipt-text-outline' },
  cart: { label: 'Cart', icon: 'cart-outline' },
  profile: { label: 'Profile', icon: 'account-outline' },
};

/** Height the floating bar occupies, so screens can pad their scroll content. */
export const TAB_BAR_SPACE = 110;

/** Floating pill tab bar with a gold outline, as in the Foodie home mockup. */
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
                  name={meta.icon}
                  size={26}
                  color={focused ? colors.gold : colors.border}
                />
                {badge > 0 ? (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{badge > 9 ? '9+' : badge}</Text>
                  </View>
                ) : null}
              </View>
              <Text style={[styles.label, { color: focused ? colors.text : colors.border }]}>
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
  wrap: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: spacing.md },
  bar: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.gold,
    paddingVertical: 10,
    ...goldGlow,
    shadowOpacity: 0.25,
  },
  item: { flex: 1, alignItems: 'center', gap: 2, minHeight: 48, justifyContent: 'center' },
  label: { fontFamily: fonts.body, fontSize: 14 },
  badge: {
    position: 'absolute',
    top: -4,
    right: -10,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { color: colors.white, fontSize: 11, fontFamily: fonts.bodySemi },
});
