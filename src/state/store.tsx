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

import { SAMPLE_RESTAURANTS } from '@/data/sample-restaurants';
import type { Restaurant } from '@/types';

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
  return useMemo(() => [...state.restaurants, ...SAMPLE_RESTAURANTS], [state.restaurants]);
}

export function useRestaurant(id: string | undefined): Restaurant | undefined {
  const all = useAllRestaurants();
  return all.find((r) => r.id === id);
}

/** The signed-in chef's own restaurant, if they have started one. */
export function useMyRestaurant(): Restaurant | undefined {
  const { state } = useStore();
  const userId = state.user?.id;
  return state.restaurants.find((r) => r.ownerId === userId);
}
