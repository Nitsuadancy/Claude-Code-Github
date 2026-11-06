import * as DocumentPicker from 'expo-document-picker';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { FormScreen } from '@/components/form-screen';
import { Body, GoldButton, SectionTitle } from '@/components/ui';
import { notify } from '@/lib/alert';
import { DOCUMENT_TYPES, isDocumentsComplete } from '@/lib/setup';
import { useRestaurantDraft } from '@/state/use-restaurant-draft';
import { colors, fonts, radius, spacing } from '@/theme';
import type { DocumentKind } from '@/types';
import { Icon } from '@/components/icon';

/** PDFs and phone photos of certificates both fit comfortably. */
const MAX_DOC_BYTES = 10 * 1024 * 1024;

export default function RestaurantDocuments() {
  const { draft, update, save } = useRestaurantDraft();
  const [error, setError] = useState<string | null>(null);

  const upload = async (kind: DocumentKind) => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/pdf', 'image/*'],
      copyToCacheDirectory: true,
    });
    if (result.canceled) return;
    const file = result.assets[0];
    if (!file) return;
    if (file.size && file.size > MAX_DOC_BYTES) {
      notify('File too large', 'Documents must be 10 MB or smaller.');
      return;
    }
    update({
      documents: [
        ...draft.documents.filter((d) => d.kind !== kind),
        { kind, fileName: file.name, uri: file.uri },
      ],
    });
  };

  const next = () => {
    if (!isDocumentsComplete(draft)) {
      setError('Upload the required documents to continue.');
      return;
    }
    save();
    router.back();
  };

  return (
    <FormScreen title="Documents" footer={<GoldButton title="Save" chevron onPress={next} />}>
      <SectionTitle style={{ marginTop: 0 }}>Keep it legit</SectionTitle>
      <Body muted>
        Home kitchens must follow local food laws. We review these before your restaurant goes live
        so customers can order with confidence. Rules differ by state and county, so check with
        your local health department if you aren’t sure what applies to you.
      </Body>

      {DOCUMENT_TYPES.map((t) => {
        const doc = draft.documents.find((d) => d.kind === t.kind);
        return (
          <View key={t.kind} style={[styles.card, doc && { borderColor: colors.gold }]}>
            <View style={styles.cardHeader}>
              <Icon
                name={doc ? 'check-circle' : 'file-document-outline'}
                size={26}
                color={doc ? colors.gold : colors.textMuted}
              />
              <Text style={styles.cardTitle}>
                {t.title}
                {t.required ? '' : ' (optional)'}
              </Text>
            </View>
            <Body muted style={{ fontSize: 14 }}>
              {t.description}
            </Body>
            {doc ? (
              <View style={styles.fileRow}>
                <Text style={styles.fileName} numberOfLines={1}>
                  {doc.fileName}
                </Text>
                <Pressable
                  accessibilityLabel={`Remove ${t.title}`}
                  hitSlop={8}
                  onPress={() => update({ documents: draft.documents.filter((d) => d.kind !== t.kind) })}>
                  <Icon name="close-circle-outline" size={22} color={colors.textMuted} />
                </Pressable>
              </View>
            ) : (
              <Pressable accessibilityRole="button" onPress={() => upload(t.kind)} style={styles.upload}>
                <Icon name="upload" size={22} color={colors.gold} />
                <Text style={styles.uploadText}>Upload PDF or photo</Text>
              </Pressable>
            )}
          </View>
        );
      })}
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  cardTitle: { fontFamily: fonts.display, fontSize: 17, color: colors.text, flexShrink: 1 },
  fileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.goldTint,
    borderRadius: radius.sm,
    padding: spacing.sm,
  },
  fileName: { flex: 1, fontFamily: fonts.body, fontSize: 15, color: colors.text },
  upload: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.border,
    borderRadius: radius.md,
    minHeight: 48,
  },
  uploadText: { fontFamily: fonts.semibold, fontSize: 15, color: colors.gold },
  error: { fontFamily: fonts.body, color: colors.danger, fontSize: 14 },
});
