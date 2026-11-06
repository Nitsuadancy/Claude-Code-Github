import { Alert, Platform } from 'react-native';

/**
 * Messages and confirmations. Phones use the system alert. In a browser,
 * where React Native's Alert does nothing and the browser's own dialogs look
 * out of place (and are blocked in embedded previews), a Manna-styled dialog
 * is shown by <DialogHost /> instead.
 */
export interface DialogRequest {
  title: string;
  message: string;
  confirmText: string;
  /** Present for a confirmation; absent for a plain message. */
  cancelText?: string;
  onConfirm?: () => void;
}

type Listener = (request: DialogRequest) => void;
let listener: Listener | null = null;

/** Called by DialogHost so web dialogs have somewhere to appear. */
export function setDialogListener(next: Listener | null): void {
  listener = next;
}

function showOnWeb(request: DialogRequest): boolean {
  if (Platform.OS !== 'web' || !listener) return false;
  listener(request);
  return true;
}

export function notify(title: string, message: string): void {
  if (showOnWeb({ title, message, confirmText: 'OK' })) return;
  Alert.alert(title, message);
}

export function confirmAction(
  title: string,
  message: string,
  confirmText: string,
  onConfirm: () => void,
  cancelText = 'Cancel',
): void {
  if (showOnWeb({ title, message, confirmText, cancelText, onConfirm })) return;
  Alert.alert(title, message, [
    { text: cancelText, style: 'cancel' },
    { text: confirmText, style: 'destructive', onPress: onConfirm },
  ]);
}
