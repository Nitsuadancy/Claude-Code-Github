import type { ImageSource } from 'expo-image';

import { DEMO_PHOTOS } from '@/data/demo-photos';

/**
 * Image source for a photo reference. Chefs' uploads are file or web URIs;
 * demo kitchens use "demo:<name>" references to photos bundled with the app.
 */
export function photoSource(uri: string): ImageSource | number {
  if (uri.startsWith('demo:')) {
    const asset = DEMO_PHOTOS[uri.slice(5)];
    if (asset !== undefined) return asset;
  }
  return { uri };
}
