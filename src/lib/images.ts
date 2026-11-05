import * as ImagePicker from 'expo-image-picker';
import { notify } from './alert';

export const MAX_IMAGE_BYTES = 2 * 1024 * 1024;

/**
 * Lets the user choose photos from their library. Returns local URIs, skipping
 * any file over 2 MB (the limit shown on the upload screens).
 */
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
    quality: 0.8,
  });
  if (result.canceled) return [];
  const accepted = result.assets.filter((a) => !a.fileSize || a.fileSize <= MAX_IMAGE_BYTES);
  if (accepted.length < result.assets.length) {
    notify('Some photos were skipped', 'Each picture must be 2 MB or smaller.');
  }
  return accepted.slice(0, limit).map((a) => a.uri);
}
