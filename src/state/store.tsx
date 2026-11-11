import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  type Dispatch,
  type ReactNode,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from 'react';

import { sampleAlerts } from '@/data/sample-alerts';
import { SAMPLE_RESTAURANTS } from '@/data/sample-restaurants';
import { followedAlerts } from '@/lib/alerts';
import { isBackendConfigured, supabase } from '@/lib/supabase';
import { registerForPush } from '@/lib/push';
import { currentUserId } from '@/lib/remote/api';
import { makeServerDispatch, pull } from './server-sync';
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

/** Keeps the newest state where the server dispatch can read it. */
function remember(holder: { state: AppState }, state: AppState) {
  holder.state = state;
}

const StoreContext = createContext<{ state: AppState; dispatch: Dispatch<Action> } | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, localDispatch] = useReducer(reducer, INITIAL_STATE);
  // The latest state, for sending changes to the server after they happen.
  const [latest] = useState(() => ({ state: INITIAL_STATE }));
  useEffect(() => remember(latest, state), [latest, state]);
  // With the backend on, changes also go to the server (see server-sync.ts).
  const [dispatch] = useState<Dispatch<Action>>(() =>
    supabase ? makeServerDispatch(supabase, localDispatch, () => latest.state) : localDispatch,
  );

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
        localDispatch({ type: 'hydrate', state: saved });
      })
      .catch(() => {
        if (!cancelled) localDispatch({ type: 'hydrate', state: null });
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

  // Backend on: load from the server once signed in, then follow orders and chat live.
  const signedInId = state.user?.id;
  useEffect(() => {
    const db = supabase;
    if (!db || !state.hydrated || !signedInId) return;
    let alive = true;
    const getState = () => latest.state;
    const refresh = (scope: 'everything' | 'activity') => {
      if (alive) pull(db, getState, localDispatch, scope).catch(() => undefined);
    };
    void currentUserId(db).then((id) => {
      if (!alive) return;
      // Signed out on the server (expired or removed): sign out here too.
      if (!id) localDispatch({ type: 'signOut' });
      else {
        refresh('everything');
        // Keep this phone's notifications pointed at this person (no prompt here).
        void registerForPush(db, { ask: false });
      }
    });
    const channel = db
      .channel('manna-activity')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => refresh('activity'))
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'order_messages' }, () => refresh('activity'))
      .subscribe();
    const { data: auth } = db.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') localDispatch({ type: 'signOut' });
    });
    // Kitchens and menus change less often; refresh them every few minutes.
    const timer = setInterval(() => refresh('everything'), 5 * 60_000);
    return () => {
      alive = false;
      clearInterval(timer);
      auth.subscription.unsubscribe();
      void db.removeChannel(channel);
    };
  }, [state.hydrated, signedInId, latest]);

  const value = useMemo(() => ({ state, dispatch }), [state, dispatch]);
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

/** Reloads everything from the server now (pull to refresh). Does nothing without the backend. */
export function useServerRefresh(): () => Promise<void> {
  const { state } = useStore();
  const ref = useRef(state);
  useEffect(() => {
    ref.current = state;
  }, [state]);
  const { dispatch } = useStore();
  return async () => {
    if (!supabase) return;
    await pull(supabase, () => ref.current, dispatch, 'everything');
  };
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
    () => {
      // With the backend on, kitchens come from the server; without it, the demo kitchens.
      const others = isBackendConfigured ? state.serverKitchens : SAMPLE_RESTAURANTS;
      const mine = new Set(state.restaurants.map((r) => r.id));
      return [...state.restaurants, ...others.filter((r) => !mine.has(r.id))].map((r) => withReviews(r, state.reviews));
    },
    [state.restaurants, state.serverKitchens, state.reviews],
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
    return followedAlerts([...state.alerts, ...(isBackendConfigured ? [] : sampleAlerts(now))], state.favoriteRestaurantIds, now);
  }, [state.alerts, state.favoriteRestaurantIds]);
}
