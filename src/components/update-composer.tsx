import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { pickImages } from '@/lib/images';
import { colors, fonts, radius, spacing } from '@/theme';

import { Icon } from './icon';
import { Photo } from './photo';
import { GoldButton, TextField } from './ui';

/**
 * Write a short update and, optionally, add a photo straight from the
 * kitchen. Used for the pinned update on a kitchen page and for oven updates
 * on an order. Posting needs words or a photo.
 */
export function UpdateComposer({
  label,
  placeholder,
  hint,
  maxLength,
  initialText = '',
  initialPhotoUri,
  postTitle = 'Post',
  onPost,
  onCancel,
}: {
  label: string;
  placeholder: string;
  hint?: string;
  maxLength: number;
  initialText?: string;
  initialPhotoUri?: string;
  postTitle?: string;
  onPost: (update: { text: string; photoUri?: string }) => void;
  onCancel: () => void;
}) {
  const [text, setText] = useState(initialText);
  const [photoUri, setPhotoUri] = useState(initialPhotoUri);
  const ready = text.trim().length > 0 || !!photoUri;

  return (
    <View style={styles.wrap}>
      <TextField
        label={`${label} (${text.length}/${maxLength})`}
        placeholder={placeholder}
        multiline
        maxLength={maxLength}
        value={text}
        onChangeText={setText}
        autoFocus
      />
      {photoUri ? (
        <View>
          <Photo uri={photoUri} size="card" style={styles.photo} />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Remove photo"
            hitSlop={8}
            onPress={() => setPhotoUri(undefined)}
            style={styles.remove}>
            <Icon name="close" size={16} color={colors.ivory} />
          </Pressable>
        </View>
      ) : (
        <Pressable
          accessibilityRole="button"
          onPress={async () => {
            const [uri] = await pickImages(1, [4, 3]);
            if (uri) setPhotoUri(uri);
          }}
          style={({ pressed }) => [styles.addPhoto, pressed && { opacity: 0.7 }]}>
          <Icon name="camera-plus-outline" size={18} color={colors.gold} />
          <Text style={styles.addPhotoText}>Add a photo</Text>
        </Pressable>
      )}
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      <View style={styles.actions}>
        <GoldButton title="Cancel" variant="ghost" fullWidth={false} onPress={onCancel} style={styles.action} />
        <GoldButton
          title={postTitle}
          fullWidth={false}
          disabled={!ready}
          onPress={() => onPost({ text: text.trim(), photoUri })}
          style={styles.action}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  photo: { width: '100%', aspectRatio: 4 / 3, borderRadius: radius.md },
  remove: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(10,9,7,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addPhoto: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: 14,
    borderRadius: radius.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.borderStrong,
  },
  addPhotoText: { fontFamily: fonts.semibold, fontSize: 14, color: colors.gold },
  hint: { fontFamily: fonts.body, fontSize: 13, lineHeight: 18, color: colors.textMuted },
  actions: { flexDirection: 'row', gap: spacing.sm },
  action: { minWidth: 0, flex: 1 },
});
