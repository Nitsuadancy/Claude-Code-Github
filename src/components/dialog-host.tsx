import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { type DialogRequest, setDialogListener } from '@/lib/alert';
import { colors, fonts, radius, spacing } from '@/theme';

import { GoldButton } from './ui';

/** Shows notify() and confirmAction() dialogs in the browser, in Manna's style. */
export function DialogHost() {
  const [request, setRequest] = useState<DialogRequest | null>(null);

  useEffect(() => {
    setDialogListener(setRequest);
    return () => setDialogListener(null);
  }, []);

  const close = () => setRequest(null);
  const confirm = () => {
    const action = request?.onConfirm;
    close();
    action?.();
  };

  return (
    <Modal visible={!!request} transparent animationType="fade" onRequestClose={close}>
      <Pressable accessibilityLabel="Close" style={styles.scrim} onPress={close}>
        {request ? (
          <Pressable accessibilityRole="alert" style={styles.card} onPress={() => {}}>
            <Text style={styles.title}>{request.title}</Text>
            <Text style={styles.message}>{request.message}</Text>
            <View style={styles.actions}>
              {request.cancelText ? (
                <GoldButton title={request.cancelText} variant="outline" onPress={close} style={{ flex: 1 }} />
              ) : null}
              <GoldButton title={request.confirmText} onPress={confirm} style={{ flex: 1 }} />
            </View>
          </Pressable>
        ) : null}
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    backgroundColor: colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.hairline,
    backgroundColor: colors.surfaceRaised,
  },
  title: { fontFamily: fonts.display, fontSize: 26, lineHeight: 30, color: colors.ivory },
  message: { fontFamily: fonts.body, fontSize: 14, lineHeight: 21, color: colors.textMuted },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
});
