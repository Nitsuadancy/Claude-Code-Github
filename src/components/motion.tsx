import { type ReactNode, useEffect, useState } from 'react';
import {
  Animated,
  Easing,
  Platform,
  Pressable,
  type PressableProps,
  type StyleProp,
  View,
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

/**
 * A soft gold ring that breathes outward behind its child, used to mark
 * "happening now" (the current step on the order timeline).
 */
export function Pulse({ children, size, color }: { children: ReactNode; size: number; color: string }) {
  const [t] = useState(() => new Animated.Value(0));
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(t, { toValue: 1, duration: 1800, easing: Easing.out(Easing.quad), useNativeDriver: NATIVE_DRIVER }),
    );
    loop.start();
    return () => loop.stop();
  }, [t]);
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View
        pointerEvents="none"
        style={{
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
          opacity: t.interpolate({ inputRange: [0, 1], outputRange: [0.45, 0] }),
          transform: [{ scale: t.interpolate({ inputRange: [0, 1], outputRange: [1, 2.2] }) }],
        }}
      />
      {children}
    </View>
  );
}
