import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

import { notify } from './alert';

/** Longest side of an uploaded photo. Sharp on any phone, and a few hundred KB as JPEG. */
export const MAX_PHOTO_SIDE = 1600;
const JPEG_QUALITY = 0.82;

/**
 * The size to shrink a photo to so its longest side is at most `max`, or
 * null when it's already small enough. Only one side is given; the other
 * follows the photo's proportions.
 */
export function fitWithin(
  width: number | undefined,
  height: number | undefined,
  max = MAX_PHOTO_SIDE,
): { width: number } | { height: number } | null {
  if (!width || !height || Math.max(width, height) <= max) return null;
  return width >= height ? { width: max } : { height: max };
}

/**
 * Shrinks and re-encodes a picked photo as JPEG, so full-size iPhone photos
 * (often 3–6 MB, sometimes HEIC) upload quickly. Falls back to the original.
 */
async function prepare(asset: ImagePicker.ImagePickerAsset): Promise<string> {
  try {
    const context = ImageManipulator.manipulate(asset.uri);
    const size = fitWithin(asset.width, asset.height);
    if (size) context.resize(size);
    const image = await context.renderAsync();
    const saved = await image.saveAsync({ compress: JPEG_QUALITY, format: SaveFormat.JPEG });
    return saved.uri;
  } catch {
    return asset.uri;
  }
}

/** Lets the user choose photos from their library. Any size is accepted; large photos are resized. */
export async function pickImages(limit: number): Promise<string[]> {
  if (limit <= 0) return [];
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    notify('Photos access needed', 'Allow photo access in Settings to upload pictures.');
    return [];
  }
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsMultipleSelection: limit > 1,
    selectionLimit: limit,
    allowsEditing: limit === 1,
    aspect: limit === 1 ? [1, 1] : undefined,
    quality: 1,
  });
  if (result.canceled) return [];
  return Promise.all(result.assets.slice(0, limit).map(prepare));
}
