import { Image, type ImageContentFit } from 'expo-image';
import type { StyleProp, ImageStyle } from 'react-native';

import { photoSource, type PhotoSize } from '@/lib/photo';
import { colors } from '@/theme';

/**
 * A food or kitchen photo. It appears in one go as soon as it's ready, with
 * no blur or fade, over the surface color. Pick the smallest `size` that's
 * still sharp where it's shown: `thumb` for thumbnails and avatars, `card`
 * for cards and sheets, `full` for full-screen heroes.
 */
export function Photo({
  uri,
  size,
  style,
  contentFit = 'cover',
  priority,
}: {
  uri: string;
  size: PhotoSize;
  style?: StyleProp<ImageStyle>;
  contentFit?: ImageContentFit;
  priority?: 'low' | 'normal' | 'high';
}) {
  return (
    <Image
      source={photoSource(uri, size)}
      style={[{ backgroundColor: colors.surfaceRaised }, style]}
      contentFit={contentFit}
      transition={0}
      priority={priority}
      recyclingKey={uri}
    />
  );
}
