import { Redirect } from 'expo-router';

import { homeRouteFor } from '@/lib/routing';
import { useMyRestaurant, useStore } from '@/state/store';

/** Sends people to the right place based on how far through sign-up they are. */
export default function Index() {
  const { state } = useStore();
  const myRestaurant = useMyRestaurant();
  return <Redirect href={homeRouteFor(state, myRestaurant)} />;
}
