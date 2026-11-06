import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, spacing } from '@/theme';

import { GoldButton, Rays } from './ui';

/**
 * Full-screen message for dead ends and crashes. Uses system fonts on
 * purpose, so it renders even if custom fonts failed to load.
 */
export function FallbackScreen({
  eyebrow,
  title,
  body,
  action,
}: {
  eyebrow: string;
  title: string;
  body: string;
  action: { title: string; onPress: () => void };
  children?: ReactNode;
}) {
  return (
    <SafeAreaView style={styles.screen}>
      <Rays size={520} opacity={0.22} style={{ top: -300 }} />
      <View style={styles.center}>
        <Text style={styles.eyebrow}>{eyebrow}</Text>
        <Text style={styles.title} accessibilityRole="header">
          {title}
        </Text>
        <Text style={styles.body}>{body}</Text>
      </View>
      <View style={{ padding: spacing.lg }}>
        <GoldButton title={action.title} chevron onPress={action.onPress} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xl, gap: spacing.md },
  eyebrow: { fontSize: 13, color: colors.textMuted, fontWeight: '600' },
  title: { fontSize: 30, color: colors.ivory, textAlign: 'center', fontWeight: '600', fontFamily: 'serif' },
  body: { fontSize: 15, lineHeight: 22, color: colors.textMuted, textAlign: 'center' },
});
