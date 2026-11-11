/**
 * Push notifications on iPhone and Android, through Expo's push service.
 *
 * - registerForPush(): asks permission (only when `ask` is set and the person
 *   hasn't answered before), gets this phone's Expo push token and saves it
 *   with register_push_token. Called quietly after sign-in, and with `ask`
 *   after a customer's first order and when a cook opens their dashboard.
 * - The server's notify function sends the notifications (supabase/functions/notify).
 * - usePushNavigation(): a tap opens the screen in the notification's `url`.
 *
 * expo-notifications loads only when the backend is on, so the demo still runs in Expo Go.
 */
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { router, type Href } from 'expo-router';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import type * as NotificationsSdk from 'expo-notifications';

import { registerPushToken, unregisterPushToken, type Db } from '@/lib/remote/api';
import { isBackendConfigured } from '@/lib/supabase';
import { colors } from '@/theme';

const projectId: string | undefined =
  (Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)?.eas?.projectId ??
  Constants.easConfig?.projectId;

/** Push needs the backend, a real phone build and an EAS project. */
const pushOn = isBackendConfigured && !!projectId && Constants.executionEnvironment !== ExecutionEnvironment.StoreClient;

let sdk: typeof NotificationsSdk | null = null;
function notifications(): typeof NotificationsSdk {
  if (!sdk) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    sdk = require('expo-notifications') as typeof NotificationsSdk;
    // Show notifications while the app is open, too.
    sdk.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
  }
  return sdk;
}

let savedToken: string | null = null;

export async function registerForPush(db: Db, { ask }: { ask: boolean }): Promise<void> {
  if (!pushOn || (Platform.OS !== 'ios' && Platform.OS !== 'android')) return;
  const n = notifications();
  try {
    if (Platform.OS === 'android') {
      await n.setNotificationChannelAsync('orders', {
        name: 'Orders and messages',
        importance: n.AndroidImportance.HIGH,
        lightColor: colors.gold,
      });
    }
    let { granted, canAskAgain } = await n.getPermissionsAsync();
    if (!granted && ask && canAskAgain) ({ granted } = await n.requestPermissionsAsync());
    if (!granted) return;
    const { data: token } = await n.getExpoPushTokenAsync({ projectId });
    if (token === savedToken) return;
    await registerPushToken(db, token, Platform.OS);
    savedToken = token;
  } catch {
    // Notifications are a nice-to-have; the app works the same without them.
  }
}

export async function unregisterPush(db: Db): Promise<void> {
  if (!savedToken) return;
  const token = savedToken;
  savedToken = null;
  await unregisterPushToken(db, token).catch(() => undefined);
}

function open(response: NotificationsSdk.NotificationResponse | null) {
  const url = response?.notification.request.content.data?.url;
  if (typeof url === 'string' && url.startsWith('/')) router.push(url as Href);
}

export function usePushNavigation(): void {
  useEffect(() => {
    if (!pushOn) return;
    const n = notifications();
    // A tap that opened the app from closed, then taps while it's running.
    open(n.getLastNotificationResponse());
    const sub = n.addNotificationResponseReceivedListener(open);
    return () => sub.remove();
  }, []);
}
