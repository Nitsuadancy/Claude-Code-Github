import { router } from 'expo-router';
import { useRef, useState } from 'react';
import {
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Pressable,
  ScrollView,
  type ScrollViewInstance,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import { Body, GoldButton, Screen, Watermark } from '@/components/ui';
import { useStore } from '@/state/store';
import { colors, fonts, spacing } from '@/theme';

const SLIDES = [
  {
    key: 'foodie',
    title: 'For the Foodie',
    icon: 'silverware-variant' as const,
    body: [
      'Browse our virtual restaurants from an array of community-based chefs; as you enter into a world of culinary masterpieces, satisfying your deepest cravings.',
    ],
  },
  {
    key: 'chef',
    title: 'For the Culinary Entrepreneur',
    icon: 'chef-hat' as const,
    body: [
      'Do you have star quality and culinary expertise? Manna gives you the tools to create your own virtual restaurant and share your signature cuisines with your community. No physical location? No problem.',
      'We believe in you to bring your dream restaurant to life, right here with Manna.',
    ],
  },
];

export default function Welcome() {
  const { width } = useWindowDimensions();
  const { dispatch } = useStore();
  const [page, setPage] = useState(0);
  const scroller = useRef<ScrollViewInstance>(null);
  const isLast = page === SLIDES.length - 1;

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    setPage(Math.round(e.nativeEvent.contentOffset.x / width));
  };

  const next = () => {
    if (!isLast) {
      scroller.current?.scrollTo({ x: width * (page + 1), animated: true });
      return;
    }
    dispatch({ type: 'completeWelcome' });
    router.replace('/choose-role');
  };

  return (
    <Screen tone="dark">
      <ScrollView
        ref={scroller}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScroll}
        onScroll={onScroll}
        scrollEventThrottle={64}>
        {SLIDES.map((slide) => (
          <View key={slide.key} style={[styles.slide, { width }]}>
            <Watermark icon={slide.icon} tone="dark" size={Math.min(width * 0.85, 380)} />
            <Text style={styles.title}>{slide.title}</Text>
            {slide.body.map((p) => (
              <Body key={p} tone="dark" style={styles.body}>
                {p}
              </Body>
            ))}
          </View>
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.dots}>
          {SLIDES.map((s, i) => (
            <View key={s.key} style={[styles.dot, i === page && styles.dotActive]} />
          ))}
        </View>
        {isLast ? (
          <GoldButton title="Choose your Experience" tone="dark" fullWidth={false} onPress={next} />
        ) : (
          <Pressable accessibilityRole="button" onPress={next} style={styles.swipe}>
            <Body tone="dark" style={styles.swipeText}>
              Swipe to Continue
            </Body>
          </Pressable>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  slide: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  title: {
    fontFamily: fonts.heading,
    color: colors.gold,
    fontSize: 34,
    letterSpacing: 3,
    textAlign: 'center',
    marginBottom: spacing.md,
    textShadowColor: colors.goldGlow,
    textShadowRadius: 18,
  },
  body: { fontSize: 18, lineHeight: 25, textAlign: 'center', marginBottom: spacing.md },
  footer: { paddingHorizontal: spacing.lg, paddingBottom: spacing.lg, gap: spacing.lg, minHeight: 120, justifyContent: 'flex-end' },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: spacing.sm },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.borderDark },
  dotActive: { width: 28, backgroundColor: colors.gold },
  swipe: { alignSelf: 'center', paddingVertical: spacing.md, minHeight: 56, justifyContent: 'center' },
  swipeText: { fontSize: 18 },
});
