import * as Sharing from 'expo-sharing';
import { type ComponentRef, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { captureRef } from 'react-native-view-shot';

import { StoryCard } from '@/components/story-card';
import { BackButton, Body, GoldButton, Heading, Screen } from '@/components/ui';
import { notify } from '@/lib/alert';
import * as haptics from '@/lib/haptics';
import { kitchenShareMessage } from '@/lib/menu';
import { shareKitchen } from '@/lib/share';
import { useMyRestaurant } from '@/state/store';
import { colors, fonts, spacing } from '@/theme';

const TIPS = [
  'Post it to your Story and add a link sticker with your kitchen link.',
  'Pin it as a Story highlight called “Order”.',
  'Print the QR code for your market table or front door.',
];

/** Turns a chef's kitchen into a ready-to-post Instagram Story, so their followers order on Manna. */
export default function ShareKitchen() {
  const restaurant = useMyRestaurant();
  const { width } = useWindowDimensions();
  const card = useRef<ComponentRef<typeof View>>(null);
  const [busy, setBusy] = useState(false);
  if (!restaurant) return null;

  const { url } = kitchenShareMessage(restaurant.name, restaurant.chefName, restaurant.id);
  const cardWidth = Math.min(width - spacing.lg * 2 - 40, 300);

  const shareImage = async () => {
    setBusy(true);
    try {
      // view-shot's types predate React Native's new element type.
      const uri = await captureRef(card as Parameters<typeof captureRef>[0], { format: 'png', quality: 1, width: 1080, height: 1920 });
      if (!(await Sharing.isAvailableAsync())) throw new Error('Sharing unavailable');
      haptics.success();
      await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: `${restaurant.name} on Manna`, UTI: 'public.png' });
    } catch {
      notify('Open Manna on your phone', 'Saving the Story image works in the Manna app on your phone. You can still share your link.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <BackButton />
        <View style={{ gap: spacing.sm }}>
          <Heading size={30}>Bring your followers</Heading>
          <Body muted>
            Your Instagram audience is your first customer base. Share this Story and they can order from you on Manna,
            paid upfront, with a pickup time, and no DMs.
          </Body>
        </View>

        <View style={styles.preview}>
          <StoryCard ref={card} restaurant={restaurant} url={url} width={cardWidth} />
        </View>

        <View style={{ gap: spacing.sm }}>
          <GoldButton title="Share Story image" icon="export-variant" loading={busy} onPress={shareImage} />
          <GoldButton title="Share my kitchen link" variant="outline" onPress={() => shareKitchen(restaurant)} />
        </View>

        <View style={styles.tips}>
          <Text style={styles.tipsTitle}>Make it work harder</Text>
          {TIPS.map((t, i) => (
            <View key={t} style={styles.tip}>
              <Text style={styles.tipNo}>{i + 1}</Text>
              <Text style={styles.tipText}>{t}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.xl, paddingBottom: spacing.xxl },
  preview: { alignItems: 'center' },
  tips: { gap: spacing.md },
  tipsTitle: { fontFamily: fonts.semibold, fontSize: 17, color: colors.ivory },
  tip: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  tipNo: { fontFamily: fonts.semibold, fontSize: 14, color: colors.gold, width: 16 },
  tipText: { flex: 1, fontFamily: fonts.body, fontSize: 14, lineHeight: 20, color: colors.text },
});
