import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  type Dispatch,
  type ReactNode,
  useContext,
  useEffect,
  useMemo,
  useReducer,
} from 'react';

import { sampleAlerts } from '@/data/sample-alerts';
import { SAMPLE_RESTAURANTS } from '@/data/sample-restaurants';
import { followedAlerts } from '@/lib/alerts';
import { SAMPLE_REVIEWS } from '@/data/sample-reviews';
import type { DietProfile } from '@/lib/diet';
import { readKey, unreadCount } from '@/lib/order-chat';
import { withReviews } from '@/lib/reviews';
import type { KitchenAlert, OrderMessage, Restaurant, Review } from '@/types';

import {
  type Action,
  type AppState,
  INITIAL_STATE,
  type PersistedState,
  reducer,
  toPersisted,
} from './reducer';

/**
 * Local, on-device store. Everything lives in AsyncStorage for now so the app
 * runs end to end without a server; see docs/ARCHITECTURE.md for the plan to
 * move restaurants, orders and accounts to the backend.
 */
const STORAGE_KEY = 'manna/state/v1';

const StoreContext = createContext<{ state: AppState; dispatch: Dispatch<Action> } | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE);

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (cancelled) return;
        let saved: Partial<PersistedState> | null = null;
        try {
          saved = raw ? (JSON.parse(raw) as Partial<PersistedState>) : null;
        } catch {
          saved = null;
        }
        dispatch({ type: 'hydrate', state: saved });
      })
      .catch(() => {
        if (!cancelled) dispatch({ type: 'hydrate', state: null });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!state.hydrated) return;
    const timer = setTimeout(() => {
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(toPersisted(state))).catch(() => {
        // Storage can be unavailable (private browsing on web); the app still works in memory.
      });
    }, 250);
    return () => clearTimeout(timer);
  }, [state]);

  const value = useMemo(() => ({ state, dispatch }), [state]);
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used inside <StoreProvider>');
  return ctx;
}

/** Sample kitchens plus any created on this device. */
export function useAllRestaurants(): Restaurant[] {
  const { state } = useStore();
  return useMemo(
    () => [...state.restaurants, ...SAMPLE_RESTAURANTS].map((r) => withReviews(r, state.reviews)),
    [state.restaurants, state.reviews],
  );
}

export function useRestaurant(id: string | undefined): Restaurant | undefined {
  const all = useAllRestaurants();
  return all.find((r) => r.id === id);
}

/** The signed-in chef's own restaurant, if they have started one. */
export function useMyRestaurant(): Restaurant | undefined {
  const { state } = useStore();
  const userId = state.user?.id;
  const mine = state.restaurants.find((r) => r.ownerId === userId);
  return useMemo(() => (mine ? withReviews(mine, state.reviews) : undefined), [mine, state.reviews]);
}

/** Reviews for one kitchen (sample + written on this device), newest first. */
export function useReviews(restaurantId: string | undefined): Review[] {
  const { state } = useStore();
  return useMemo(
    () =>
      [...state.reviews, ...SAMPLE_REVIEWS]
        .filter((r) => r.restaurantId === restaurantId && !state.reportedReviewIds.includes(r.id))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [state.reviews, state.reportedReviewIds, restaurantId],
  );
}

/** The signed-in customer's diets and allergens to avoid. */
export function useDietProfile(): DietProfile {
  const { state } = useStore();
  const dietary = state.user?.dietary;
  const avoid = state.user?.avoidAllergens;
  return useMemo(() => ({ dietary: dietary ?? [], avoid: avoid ?? [] }), [dietary, avoid]);
}

/** Every chat message the signed-in person should see: none they reported, none from people they blocked. */
export function useVisibleMessages(): OrderMessage[] {
  const { state } = useStore();
  const me = state.user?.id;
  return useMemo(
    () =>
      state.messages.filter(
        (m) =>
          !state.reportedMessageIds.includes(m.id) &&
          !state.blocks.some((b) => b.blockerId === me && b.blockedId === m.senderId),
      ),
    [state.messages, state.reportedMessageIds, state.blocks, me],
  );
}

/** How many messages from the other side of this order this person hasn't seen yet. */
export function useUnreadMessages(orderId: string): number {
  const { state } = useStore();
  const visible = useVisibleMessages();
  const me = state.user?.id ?? '';
  return unreadCount(visible, orderId, me, state.chatReadAt[readKey(orderId, me)]);
}

/** Alerts from kitchens the signed-in person saved, from the last two weeks, newest first. */
export function useFollowedAlerts(): KitchenAlert[] {
  const { state } = useStore();
  return useMemo(() => {
    const now = new Date();
    return followedAlerts([...state.alerts, ...sampleAlerts(now)], state.favoriteRestaurantIds, now);
  }, [state.alerts, state.favoriteRestaurantIds]);
}
