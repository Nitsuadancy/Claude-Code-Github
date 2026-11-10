import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { UPDATE_DAYS, UPDATE_MAX, visibleUpdate } from '@/lib/kitchen-style';
import { relativeDay } from '@/lib/reviews';
import { colors, fonts, radius, spacing } from '@/theme';
import type { KitchenUpdate } from '@/types';

import { Icon } from './icon';
import { Photo } from './photo';
import { UpdateComposer } from './update-composer';

/**
 * The cook's pinned update on their dashboard: post a short note to the top
 * of their menu ("Pumpkin bread is back"), or take it down. Notes expire
 * after a week so a kitchen never shows stale news.
 */
export function PinnedUpdate({
  update,
  accent,
  onPost,
  onRemove,
}: {
  update: KitchenUpdate | undefined;
  accent: string;
  onPost: (update: { text: string; photoUri?: string }) => void;
  onRemove: () => void;
}) {
  const now = new Date();
  const live = visibleUpdate(update, now);
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <View style={styles.card}>
        <UpdateComposer
          label="Pinned update"
          placeholder="Pumpkin bread is back this week."
          hint={`Shows at the top of your menu for ${UPDATE_DAYS} days. A photo of today’s bake makes it stand out.`}
          maxLength={UPDATE_MAX}
          initialText={live?.text}
          initialPhotoUri={live?.photoUri}
          onPost={(next) => {
            onPost(next);
            setEditing(false);
          }}
          onCancel={() => setEditing(false)}
        />
      </View>
    );
  }

  if (live) {
    return (
      <View style={[styles.card, styles.live, { borderLeftColor: accent }]}>
        <View style={styles.header}>
          <Text style={[styles.label, { color: accent }]}>Pinned · {relativeDay(live.postedAt, now)}</Text>
          <View style={styles.links}>
            <Pressable accessibilityRole="button" hitSlop={8} onPress={() => setEditing(true)}>
              <Text style={styles.link}>Edit</Text>
            </Pressable>
            <Pressable accessibilityRole="button" hitSlop={8} onPress={onRemove}>
              <Text style={styles.link}>Remove</Text>
            </Pressable>
          </View>
        </View>
        {live.photoUri ? <Photo uri={live.photoUri} size="card" style={styles.photo} /> : null}
        {live.text ? <Text style={styles.text}>{live.text}</Text> : null}
      </View>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Post an update to the top of your menu"
      onPress={() => {
        setEditing(true);
      }}
      style={({ pressed }) => [styles.card, styles.empty, pressed && { opacity: 0.8 }]}>
      <Icon name="pin-outline" size={20} color={accent} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={styles.title}>Post an update</Text>
        <Text style={styles.hint}>A new bake, a sell-out, a holiday order deadline.</Text>
      </View>
      <Icon name="chevron-right" size={18} color={colors.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, gap: spacing.sm },
  live: { borderLeftWidth: 3 },
  photo: { width: '100%', aspectRatio: 4 / 3, borderRadius: radius.md },
  empty: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label: { fontFamily: fonts.semibold, fontSize: 12 },
  links: { flexDirection: 'row', gap: spacing.md },
  link: { fontFamily: fonts.semibold, fontSize: 13, color: colors.textMuted },
  text: { fontFamily: fonts.medium, fontSize: 15, lineHeight: 21, color: colors.ivory },
  title: { fontFamily: fonts.semibold, fontSize: 15, color: colors.ivory },
  hint: { fontFamily: fonts.body, fontSize: 13, lineHeight: 18, color: colors.textMuted },
  actions: { flexDirection: 'row', gap: spacing.sm },
});
