import { useEffect, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, StyleSheet, View } from 'react-native';

import { NATIVE_DRIVER } from './motion';

const RAYS = require('@/assets/images/rays.png');
const WORDMARK = require('@/assets/images/wordmark.png');

/**
 * The Manna logo, alive: the wordmark fades in while the gold rays bloom
 * outward and then turn very slowly. Holds still when "reduce motion" is on.
 */
export function AnimatedLogo({ size }: { size: number }) {
  const [bloom] = useState(() => new Animated.Value(0));
  const [spin] = useState(() => new Animated.Value(0));

  useEffect(() => {
    let loop: Animated.CompositeAnimation | null = null;
    let cancelled = false;
    AccessibilityInfo.isReduceMotionEnabled()
      .catch(() => false)
      .then((reduce) => {
        if (cancelled) return;
        if (reduce) {
          bloom.setValue(1);
          return;
        }
        Animated.timing(bloom, {
          toValue: 1,
          duration: 1400,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: NATIVE_DRIVER,
        }).start();
        loop = Animated.loop(
          Animated.timing(spin, { toValue: 1, duration: 90_000, easing: Easing.linear, useNativeDriver: NATIVE_DRIVER }),
        );
        loop.start();
      });
    return () => {
      cancelled = true;
      loop?.stop();
    };
  }, [bloom, spin]);

  // The wordmark sits a touch above the rays' center in the original artwork.
  const wordWidth = size * (859 / 1024);
  const wordHeight = wordWidth * (156 / 859);
  const wordTop = size * (419 / 1024);

  return (
    <View style={{ width: size, height: size }} accessible accessibilityRole="image" accessibilityLabel="Manna">
      <Animated.Image
        source={RAYS}
        style={[
          StyleSheet.absoluteFill,
          {
            width: size,
            height: size,
            opacity: bloom,
            transform: [
              { scale: bloom.interpolate({ inputRange: [0, 1], outputRange: [0.75, 1] }) },
              { rotate: spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) },
            ],
          },
        ]}
      />
      <Animated.Image
        source={WORDMARK}
        style={{
          position: 'absolute',
          left: (size - wordWidth) / 2,
          top: wordTop,
          width: wordWidth,
          height: wordHeight,
          opacity: bloom.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0, 0.6, 1] }),
        }}
      />
    </View>
  );
}
