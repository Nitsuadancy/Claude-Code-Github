import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';

import { colors, fonts, spacing } from '@/theme';

import { BackButton, Screen } from './ui';

/** Back button + title bar, scrolling body and a pinned footer (usually a GoldButton). */
export function FormScreen({
  title,
  children,
  footer,
  onBack,
}: {
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  onBack?: () => void;
}) {
  return (
    <Screen>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.topBar}>
          <BackButton onPress={onBack ?? (() => router.back())} />
          <Text style={styles.title} accessibilityRole="header">
            {title}
          </Text>
        </View>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {children}
        </ScrollView>
        {footer ? <View style={styles.footer}>{footer}</View> : null}
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  title: { fontFamily: fonts.button, fontSize: 20, color: colors.text, flexShrink: 1 },
  content: { padding: spacing.lg, paddingTop: spacing.sm, gap: spacing.md, paddingBottom: spacing.xl },
  footer: { paddingHorizontal: spacing.lg, paddingBottom: spacing.md, paddingTop: spacing.sm },
});
