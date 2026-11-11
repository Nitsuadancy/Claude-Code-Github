import { Share } from 'react-native';

import type { Restaurant } from '@/types';

import { notify } from './alert';
import * as haptics from './haptics';
import { kitchenShareMessage, SHARE_BASE_URL } from './menu';

/** Opens the system share sheet for a kitchen; shows the link if sharing isn't available. */
export async function shareKitchen(restaurant: Restaurant): Promise<void> {
  const { message, url } = kitchenShareMessage(restaurant.name, restaurant.chefName, restaurant.id);
  haptics.tap();
  try {
    await Share.share({ message, url, title: restaurant.name });
  } catch {
    notify('Share this kitchen', message);
  }
}

/**
 * Invite a home cook to open a kitchen. There's no web link until the domain
 * is set up, so the message says how to find the app; the manna:// link opens
 * it for people who already have it.
 */
export function cookInviteMessage(area: string): { message: string; url: string } {
  const url = `${SHARE_BASE_URL}choose-role`;
  return {
    url,
    message: `I’d order your cooking in a heartbeat. Manna is an app where home cooks in ${area} sell to neighbors and followers: a free storefront, orders paid upfront, pickup at your door. Download Manna and choose “I cook” to open your kitchen.`,
  };
}

export async function shareCookInvite(area: string): Promise<void> {
  const { message, url } = cookInviteMessage(area);
  haptics.tap();
  try {
    await Share.share({ message, url, title: 'Open a kitchen on Manna' });
  } catch {
    notify('Invite a cook', message);
  }
}
