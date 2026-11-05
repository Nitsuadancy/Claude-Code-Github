import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, fonts, spacing } from '@/theme';

import { Eyebrow } from './ui';

const RAYS = require('@/assets/images/rays.png');

/**
 * The "order placed" moment: the logo's gold rays burst open around a check
 * mark, then the overlay fades to reveal live tracking. Tap to skip.
 */
export function OrderCelebration({
  chefName,
  onDone,
}: {
  chefName: string;
  onDone: () => void;
}) {
  const [progress] = useState(() => new Animated.Value(0));
  const [spin] = useState(() => new Animated.Value(0));
  const [fade] = useState(() => new Animated.Value(1));

  useEffect(() => {
    const burst = Animated.timing(progress, {
      toValue: 1,
      duration: 900,
      easing: Easing.out(Easing.back(1.4)),
      useNativeDriver: true,
    });
    const rotate = Animated.loop(
      Animated.timing(spin, { toValue: 1, duration: 24000, easing: Easing.linear, useNativeDriver: true }),
    );
    rotate.start();
    burst.start();
    const timer = setTimeout(() => {
      Animated.timing(fade, { toValue: 0, duration: 450, useNativeDriver: true }).start(() => onDone());
    }, 2400);
    return () => {
      clearTimeout(timer);
      rotate.stop();
    };
  }, [progress, spin, fade, onDone]);

  const raysScale = progress.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] });
  const checkScale = progress.interpolate({ inputRange: [0, 0.6, 1], outputRange: [0, 1.15, 1] });
  const textOpacity = progress.interpolate({ inputRange: [0, 0.6, 1], outputRange: [0, 0, 1] });
  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.overlay, { opacity: fade }]}>
      <Pressable style={styles.center} onPress={onDone} accessibilityLabel="Continue to order tracking">
        <View style={styles.stage}>
          <Animated.Image
            source={RAYS}
            style={[styles.rays, { opacity: progress, transform: [{ scale: raysScale }, { rotate }] }]}
          />
          <Animated.View style={[styles.check, { transform: [{ scale: checkScale }] }]}>
            <MaterialCommunityIcons name="check" size={44} color={colors.onGold} />
          </Animated.View>
        </View>
        <Animated.View style={{ opacity: textOpacity, alignItems: 'center', gap: spacing.sm }}>
          <Eyebrow>Order placed</Eyebrow>
          <Text style={styles.title} accessibilityRole="header">
            {chefName} has your order
          </Text>
          <Text style={styles.sub}>We’ll keep you posted every step of the way.</Text>
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: { backgroundColor: colors.black, zIndex: 10 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, gap: spacing.xl },
  stage: { width: 300, height: 300, alignItems: 'center', justifyContent: 'center' },
  rays: { position: 'absolute', width: 300, height: 300 },
  check: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontFamily: fonts.display, fontSize: 30, color: colors.ivory, textAlign: 'center' },
  sub: { fontFamily: fonts.body, fontSize: 15, color: colors.textMuted, textAlign: 'center' },
});
