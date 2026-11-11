/**
 * Push notifications (new orders, "ready for pickup", messages, prices for
 * custom orders, alerts from saved kitchens). They work on the phone apps once
 * the backend is on and the app has an EAS project id (docs/GO_LIVE.md); see
 * push.native.ts. This web build is the demo, so here they do nothing.
 */
import type { Db } from '@/lib/remote/api';

/** Saves this phone for the signed-in person. With ask, shows the permission prompt if it hasn't been answered. */
export async function registerForPush(_db: Db, _opts: { ask: boolean }): Promise<void> {}

/** Stops this phone's notifications (on sign-out). */
export async function unregisterPush(_db: Db): Promise<void> {}

/** Opens the screen a tapped notification points to. */
export function usePushNavigation(): void {}
