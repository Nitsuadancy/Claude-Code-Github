import { useState } from 'react';

import { blankRestaurant } from '@/lib/setup';
import { newId } from '@/lib/validation';
import type { Restaurant } from '@/types';

import { useMyRestaurant, useStore } from './store';

/**
 * A local, editable copy of the chef's restaurant (or a blank one).
 * Call `save()` to write it to the store.
 */
export function useRestaurantDraft() {
  const { state, dispatch } = useStore();
  const existing = useMyRestaurant();
  const [draft, setDraft] = useState<Restaurant>(
    () => existing ?? blankRestaurant(state.user!, newId('rest')),
  );
  const update = (changes: Partial<Restaurant>) => setDraft((d) => ({ ...d, ...changes }));
  const save = (changes: Partial<Restaurant> = {}) => {
    const next = { ...draft, ...changes, chefName: state.user?.name || draft.chefName };
    setDraft(next);
    dispatch({ type: 'saveRestaurant', restaurant: next });
    return next;
  };
  return { draft, update, save };
}
