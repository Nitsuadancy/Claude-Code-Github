import { type ReactNode, useEffect, useRef, useState } from 'react';
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
import Reanimated, {
  FadeInDown,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

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

/**
 * Gives its child a quick springy pop whenever `trigger` changes to a new
 * truthy value: the heart when you favorite, the cart icon when something
 * is added. A number that goes down (an item removed) doesn't pop.
 * Skipped when the system "reduce motion" setting is on.
 */
export function Pop({
  trigger,
  children,
  to = 1.25,
  style,
}: {
  trigger: unknown;
  children: ReactNode;
  to?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const reduce = useReducedMotion();
  const scale = useSharedValue(1);
  const previous = useRef(trigger);
  useEffect(() => {
    const before = previous.current;
    previous.current = trigger;
    if (before === trigger || !trigger || reduce) return;
    if (typeof trigger === 'number' && typeof before === 'number' && trigger < before) return;
    scale.set(withSequence(
      withTiming(to, { duration: 110 }),
      withSpring(1, { damping: 8, stiffness: 300 }),
    ));
  }, [trigger, reduce, scale, to]);
  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));
  return <Reanimated.View style={[style, animated]}>{children}</Reanimated.View>;
}

/**
 * Springs its content in from slightly smaller when it first appears, so a
 * control that replaces another (the "+" opening into a quantity stepper)
 * grows into place instead of snapping.
 */
export function SpringIn({
  children,
  style,
  from = 0.55,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  from?: number;
}) {
  const reduce = useReducedMotion();
  const progress = useSharedValue(reduce ? 1 : 0);
  useEffect(() => {
    progress.set(withSpring(1, { damping: 14, stiffness: 320 }));
  }, [progress]);
  const animated = useAnimatedStyle(() => ({
    opacity: Math.min(1, progress.get() * 1.8),
    transform: [{ scale: from + (1 - from) * progress.get() }],
  }));
  return <Reanimated.View style={[style, animated]}>{children}</Reanimated.View>;
}

/**
 * Press feedback for buttons: the button sinks a little while held and
 * springs back on release. Returns handlers for a Pressable and a style for
 * the Reanimated view that wraps the button's surface.
 */
export function usePressScale(to = 0.97) {
  const reduce = useReducedMotion();
  const scale = useSharedValue(1);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));
  return {
    style,
    onPressIn: () => {
      if (!reduce) scale.set(withTiming(to, { duration: 90 }));
    },
    onPressOut: () => {
      scale.set(withSpring(1, { damping: 12, stiffness: 400 }));
    },
  };
}
