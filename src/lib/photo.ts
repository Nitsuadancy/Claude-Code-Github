import type { ImageSource } from 'expo-image';

import { DEMO_PHOTOS, type PhotoSize } from '@/data/demo-photos';

export type { PhotoSize };

/**
 * Image source for a photo reference. Chefs' uploads are file or web URIs;
 * demo kitchens use "demo:<name>" references to photos bundled with the app,
 * in the size that fits where the photo is shown.
 */
export function photoSource(uri: string, size: PhotoSize = 'full'): ImageSource | number {
  if (uri.startsWith('demo:')) {
    const asset = DEMO_PHOTOS[uri.slice(5)];
    if (asset !== undefined) return asset[size];
  }
  return { uri };
}
