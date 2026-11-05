import { type ReactNode, useState } from 'react';
import {
  Animated,
  Platform,
  Pressable,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Reanimated, { FadeInDown } from 'react-native-reanimated';

/** Native driver isn't available on web; fall back to JS animation there. */
export const NATIVE_DRIVER = Platform.OS !== 'web';

/**
 * A Pressable that sinks slightly while pressed, so cards feel physical.
 * Use it for tappable cards and tiles (buttons have their own feedback).
 */
export function PressableScale({
  children,
  style,
  scaleTo = 0.97,
  ...props
}: Omit<PressableProps, 'style' | 'children'> & {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  scaleTo?: number;
}) {
  const [scale] = useState(() => new Animated.Value(1));
  const to = (value: number) =>
    Animated.spring(scale, {
      toValue: value,
      useNativeDriver: NATIVE_DRIVER,
      speed: 40,
      bounciness: value === 1 ? 6 : 0,
    }).start();

  return (
    <Pressable
      {...props}
      onPressIn={(e) => {
        to(scaleTo);
        props.onPressIn?.(e);
      }}
      onPressOut={(e) => {
        to(1);
        props.onPressOut?.(e);
      }}>
      <Animated.View style={[style, { transform: [{ scale }] }]}>{children}</Animated.View>
    </Pressable>
  );
}

/**
 * Fades content up into place when it first appears. Pass `index` to
 * stagger items in a list. Respects the system "reduce motion" setting.
 */
export function FadeIn({
  children,
  index = 0,
  delay = 0,
  style,
}: {
  children: ReactNode;
  index?: number;
  delay?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const stagger = Math.min(index, 8) * 70;
  return (
    <Reanimated.View entering={FadeInDown.duration(520).delay(delay + stagger)} style={style}>
      {children}
    </Reanimated.View>
  );
}
