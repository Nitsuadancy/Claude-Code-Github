import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import * as haptics from '@/lib/haptics';
import { REVIEW_TAGS, relativeDay, STAR_LABELS } from '@/lib/reviews';
import { colors, fonts, radius, spacing } from '@/theme';
import type { Restaurant, Review } from '@/types';

import { Chip, Eyebrow, GoldButton, Heading, TextField } from './ui';
import { Icon } from './icon';

export function Stars({ value, size = 14 }: { value: number; size?: number }) {
  return (
    <View style={styles.stars} accessibilityLabel={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Icon
          key={i}
          name={value >= i ? 'star' : value >= i - 0.5 ? 'star-half-full' : 'star-outline'}
          size={size}
          color={colors.gold}
        />
      ))}
    </View>
  );
}

/** Big rating number with stars and count, for the top of the reviews section. */
export function RatingSummary({ restaurant }: { restaurant: Restaurant }) {
  if (restaurant.ratingCount === 0) return null;
  return (
    <View style={styles.summary}>
      <Text style={styles.big}>{restaurant.rating.toFixed(1)}</Text>
      <View style={{ gap: 4 }}>
        <Stars value={restaurant.rating} size={16} />
        <Text style={styles.count}>
          {restaurant.ratingCount} {restaurant.ratingCount === 1 ? 'rating' : 'ratings'}
        </Text>
      </View>
    </View>
  );
}

export function ReviewCard({ review, now }: { review: Review; now: Date }) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Stars value={review.stars} />
        <Text style={styles.when}>{relativeDay(review.createdAt, now)}</Text>
      </View>
      {review.text ? <Text style={styles.text}>“{review.text}”</Text> : null}
      {review.tags.length ? (
        <View style={styles.tags}>
          {review.tags.map((t) => (
            <Text key={t} style={styles.tag}>
              {t}
            </Text>
          ))}
        </View>
      ) : null}
      <Text style={styles.author}>— {review.customerName}</Text>
    </View>
  );
}

/** Bottom sheet for rating a picked-up order: stars, quick compliments, a note. */
export function RateOrderSheet({
  visible,
  restaurantName,
  chefName,
  onSubmit,
  onClose,
}: {
  visible: boolean;
  restaurantName: string;
  chefName: string;
  onSubmit: (stars: number, tags: string[], text: string) => void;
  onClose: () => void;
}) {
  const [stars, setStars] = useState(0);
  const [tags, setTags] = useState<string[]>([]);
  const [text, setText] = useState('');

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close" />
      <SafeAreaView edges={['bottom']} style={styles.sheet}>
        <ScrollView contentContainerStyle={{ gap: spacing.md }} keyboardShouldPersistTaps="handled">
          <View style={styles.handle} />
          <Eyebrow>{restaurantName}</Eyebrow>
          <Heading size={26}>How was your meal?</Heading>
          <Text style={styles.sub}>Your review helps {chefName} and your neighbors.</Text>

          <View style={styles.pickRow} accessibilityRole="adjustable" accessibilityLabel={`Rating: ${stars} of 5`}>
            {[1, 2, 3, 4, 5].map((i) => (
              <Pressable
                key={i}
                accessibilityRole="button"
                accessibilityLabel={`${i} star${i > 1 ? 's' : ''}`}
                hitSlop={4}
                onPress={() => {
                  haptics.tap();
                  setStars(i);
                }}>
                <Icon
                  name={stars >= i ? 'star' : 'star-outline'}
                  size={42}
                  color={stars >= i ? colors.gold : colors.borderStrong}
                />
              </Pressable>
            ))}
          </View>
          <Text style={styles.starLabel}>{STAR_LABELS[stars] || 'Tap to rate'}</Text>

          {stars >= 3 ? (
            <View style={styles.tagPick}>
              {REVIEW_TAGS.map((t) => (
                <Chip
                  key={t}
                  label={t}
                  selected={tags.includes(t)}
                  onPress={() => setTags((list) => (list.includes(t) ? list.filter((x) => x !== t) : [...list, t]))}
                />
              ))}
            </View>
          ) : null}

          <TextField
            placeholder={stars && stars < 3 ? 'What could have been better?' : 'Tell others what you loved (optional)'}
            multiline
            maxLength={500}
            value={text}
            onChangeText={setText}
            accessibilityLabel="Your review"
          />
          <GoldButton
            title="Post review"
            disabled={stars === 0}
            onPress={() => {
              haptics.success();
              onSubmit(stars, stars >= 3 ? tags : [], text);
            }}
          />
          <Text style={styles.privacy}>Shown with your first name and last initial.</Text>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  stars: { flexDirection: 'row', gap: 1 },
  summary: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  big: { fontFamily: fonts.display, fontSize: 51, color: colors.ivory, lineHeight: 60 },
  count: { fontFamily: fonts.medium, fontSize: 12, color: colors.textMuted },
  card: {
    width: 280,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  when: { fontFamily: fonts.body, fontSize: 11, color: colors.textFaint },
  text: { fontFamily: fonts.displayItalic, fontSize: 17, lineHeight: 25, color: colors.text },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tag: {
    fontFamily: fonts.medium,
    fontSize: 11,
    color: colors.gold,
    borderWidth: 1,
    borderColor: colors.hairline,
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 3,
    overflow: 'hidden',
  },
  author: { fontFamily: fonts.medium, fontSize: 12, color: colors.textMuted },
  backdrop: { flex: 1, backgroundColor: colors.overlay },
  sheet: {
    maxHeight: '90%',
    backgroundColor: colors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: colors.hairline,
    padding: spacing.lg,
    paddingTop: spacing.sm,
  },
  handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: colors.borderStrong },
  sub: { fontFamily: fonts.body, fontSize: 14, color: colors.textMuted, marginTop: -spacing.sm },
  pickRow: { flexDirection: 'row', justifyContent: 'center', gap: spacing.sm, marginTop: spacing.sm },
  starLabel: { fontFamily: fonts.displayItalic, fontSize: 20, color: colors.gold, textAlign: 'center' },
  tagPick: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, justifyContent: 'center' },
  privacy: { fontFamily: fonts.body, fontSize: 11, color: colors.textFaint, textAlign: 'center' },
});
