import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  ScrollView,
  type ScrollViewInstance,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';

import { Body, Eyebrow, GoldButton, GoldRule, Heading, Logo, Screen } from '@/components/ui';
import { useStore } from '@/state/store';
import { colors, spacing } from '@/theme';

const SLIDES = [
  {
    key: 'foodie',
    eyebrow: 'For the Foodie',
    title: 'A world of home-cooked masterpieces',
    body: 'Browse virtual restaurants from community chefs near you, and satisfy your deepest cravings with food made with real care.',
  },
  {
    key: 'chef',
    eyebrow: 'For the Culinary Entrepreneur',
    title: 'Your restaurant.\nNo storefront required.',
    body: 'Have star quality and culinary expertise? Manna gives you the tools to open your own virtual restaurant and share your signature dishes with your community.',
  },
];

export default function Welcome() {
  const { width, height } = useWindowDimensions();
  const { dispatch } = useStore();
  const [page, setPage] = useState(0);
  const scroller = useRef<ScrollViewInstance>(null);
  const [fade] = useState(() => new Animated.Value(0));
  const isLast = page === SLIDES.length - 1;
  const logoSize = Math.min(width * 0.72, height * 0.36, 320);

  useEffect(() => {
    Animated.timing(fade, { toValue: 1, duration: 900, useNativeDriver: true }).start();
  }, [fade]);

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
    <Screen style={{ backgroundColor: colors.black }}>
      <Animated.View style={[styles.logo, { opacity: fade }]}>
        <Logo size={logoSize} />
      </Animated.View>

      <ScrollView
        ref={scroller}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScroll}
        onScroll={onScroll}
        scrollEventThrottle={64}
        style={{ flexGrow: 0 }}>
        {SLIDES.map((slide) => (
          <View key={slide.key} style={[styles.slide, { width }]}>
            <Eyebrow style={styles.center}>{slide.eyebrow}</Eyebrow>
            <Heading size={30} style={styles.center}>
              {slide.title}
            </Heading>
            <GoldRule style={{ alignSelf: 'center' }} />
            <Body muted style={styles.center}>
              {slide.body}
            </Body>
          </View>
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.dots}>
          {SLIDES.map((s, i) => (
            <View key={s.key} style={[styles.dot, i === page && styles.dotActive]} />
          ))}
        </View>
        <GoldButton
          title={isLast ? 'Choose your experience' : 'Continue'}
          variant={isLast ? 'primary' : 'outline'}
          chevron
          onPress={next}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  logo: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 180 },
  slide: { paddingHorizontal: spacing.xl, gap: spacing.md, justifyContent: 'center' },
  center: { textAlign: 'center' },
  footer: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.lg, gap: spacing.lg },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: spacing.sm },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.borderStrong },
  dotActive: { width: 28, backgroundColor: colors.gold },
});
