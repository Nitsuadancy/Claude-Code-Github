import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

/**
 * Small vibrations for moments that should feel good: adding to the cart,
 * placing an order, a kitchen accepting it. Silently does nothing where
 * haptics aren't available (web, older devices).
 */
const enabled = Platform.OS === 'ios' || Platform.OS === 'android';

export function tap(): void {
  if (enabled) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}

export function success(): void {
  if (enabled) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
}

export function warning(): void {
  if (enabled) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
}
