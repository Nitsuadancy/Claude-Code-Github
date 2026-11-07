import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { canSendHelp, type HelpTopic, HELP_NOTE_MAX } from '@/lib/order-extras';
import { isBackendConfigured } from '@/lib/supabase';
import type { OrderIssueKind } from '@/types';
import { colors, fonts, spacing } from '@/theme';

import { CheckDisc, Ring } from './glyphs';
import { Body, GoldButton, Heading, TextField } from './ui';

/**
 * "Need help with this order?": pick what went wrong, add a few words, and
 * it goes to Manna's support team (not the cook), who reply within a day.
 */
export function OrderHelpSheet({
  visible,
  topics,
  onClose,
  onSend,
}: {
  visible: boolean;
  topics: HelpTopic[];
  onClose: () => void;
  onSend: (kind: OrderIssueKind, note: string) => void;
}) {
  const [kind, setKind] = useState<OrderIssueKind | null>(null);
  const [note, setNote] = useState('');
  const ready = canSendHelp(kind, note);
  const { height } = useWindowDimensions();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close" />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <SafeAreaView edges={['bottom']} style={[styles.sheet, { maxHeight: height * 0.9 }]}>
          <View style={styles.handle} />
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: spacing.md }}>
            <View style={{ gap: spacing.xs }}>
              <Heading size={22}>Need help with this order?</Heading>
              <Body muted style={{ fontSize: 14 }}>
                This goes to Manna’s support team, not the kitchen. We reply within 24 hours.
              </Body>
            </View>
            <View accessibilityRole="radiogroup">
              {topics.map((t, i) => {
                const on = kind === t.kind;
                return (
                  <Pressable
                    key={t.kind}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: on }}
                    onPress={() => setKind(t.kind)}
                    style={({ pressed }) => [
                      styles.option,
                      i > 0 && styles.divider,
                      pressed && { backgroundColor: colors.goldTint },
                    ]}>
                    <Text style={[styles.optionText, on && { color: colors.ivory }]}>{t.label}</Text>
                    {on ? (
                      <CheckDisc size={22} color={colors.gold} markColor={colors.bg} />
                    ) : (
                      <Ring size={22} color={colors.borderStrong} />
                    )}
                  </Pressable>
                );
              })}
            </View>
            <TextField
              placeholder={kind === 'other' ? 'Tell us what happened' : 'Anything else we should know? (optional)'}
              value={note}
              onChangeText={setNote}
              multiline
              maxLength={HELP_NOTE_MAX}
              accessibilityLabel="Details"
            />
            <GoldButton
              title="Send to Manna"
              disabled={!ready}
              onPress={() => {
                if (!kind) return;
                onSend(kind, note);
                setKind(null);
                setNote('');
              }}
            />
            {!isBackendConfigured ? (
              <Text style={styles.demo}>
                Demo: your message is saved on this phone until Manna’s support inbox is connected.
              </Text>
            ) : null}
          </ScrollView>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: colors.overlay },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: colors.hairline,
    padding: spacing.lg,
    paddingTop: spacing.sm,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.borderStrong,
    marginBottom: spacing.md,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingVertical: 15,
    paddingHorizontal: spacing.xs,
  },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  optionText: { flex: 1, fontFamily: fonts.body, fontSize: 16, color: colors.text },
  demo: { fontFamily: fonts.body, fontSize: 12, lineHeight: 17, color: colors.textFaint, textAlign: 'center' },
});
