import type { AppState } from '@/state/reducer';
import type { Restaurant } from '@/types';

export type HomeRoute =
  | '/welcome'
  | '/choose-role'
  | '/login'
  | '/about-you'
  | '/foodie'
  | '/chef/setup'
  | '/chef/dashboard';

/** Where someone should land when they open the app. */
export function homeRouteFor(
  state: Pick<AppState, 'hasSeenWelcome' | 'pendingRole' | 'user'>,
  myRestaurant: Restaurant | undefined,
): HomeRoute {
  const { user } = state;
  if (!user) {
    if (!state.hasSeenWelcome) return '/welcome';
    return state.pendingRole ? '/login' : '/choose-role';
  }
  if (!user.name.trim() || !user.email.trim()) return '/about-you';
  if (!user.role) return '/choose-role';
  if (user.role === 'foodie') return '/foodie';
  return myRestaurant?.status === 'live' ? '/chef/dashboard' : '/chef/setup';
}
