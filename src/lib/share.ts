import { Share } from 'react-native';

import type { Restaurant } from '@/types';

import { notify } from './alert';
import * as haptics from './haptics';
import { kitchenShareMessage } from './menu';

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
