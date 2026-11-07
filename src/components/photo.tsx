import { Image, type ImageContentFit } from 'expo-image';
import type { StyleProp, ImageStyle } from 'react-native';

import { DEMO_PHOTO_BLURHASH } from '@/data/demo-photo-blurhash';
import { photoSource } from '@/lib/photo';
import { colors } from '@/theme';

/**
 * A food photo that loads gracefully: a soft blurred preview of the photo
 * (or a quiet surface color for uploads) fades into the sharp image.
 */
export function Photo({
  uri,
  style,
  contentFit = 'cover',
  transition = 260,
}: {
  uri: string;
  style?: StyleProp<ImageStyle>;
  contentFit?: ImageContentFit;
  transition?: number;
}) {
  const hash = uri.startsWith('demo:') ? DEMO_PHOTO_BLURHASH[uri.slice(5)] : undefined;
  return (
    <Image
      source={photoSource(uri)}
      style={[{ backgroundColor: colors.surfaceRaised }, style]}
      contentFit={contentFit}
      placeholder={hash ? { blurhash: hash } : undefined}
      placeholderContentFit="cover"
      transition={transition}
      recyclingKey={uri}
    />
  );
}
