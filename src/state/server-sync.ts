/**
 * Keeps the app and the server in step when the backend is on.
 *
 * - pull(): loads what this person can see (profile, their kitchen, nearby
 *   kitchens, orders, chat, saved kitchens, alerts and custom requests) and
 *   hands it to the reducer in one `syncFromServer`.
 * - makeServerDispatch(): wraps the store's dispatch. Every change still
 *   updates the screen at once; changes other people need to see are also
 *   sent to the server, and a fresh pull follows so the app shows the
 *   server's truth (its prices, ids and checks).
 *
 * Without the backend none of this runs and the app keeps everything on the phone.
 */
import type { Dispatch } from 'react';

import { notify } from '@/lib/alert';
import { userPlace } from '@/lib/location';
import { cardPaymentsOn } from '@/lib/payments';
import { registerForPush, unregisterPush } from '@/lib/push';
import { photoUrl, type supabase as SupabaseInstance } from '@/lib/supabase';
import * as api from '@/lib/remote/api';
import { signPrivatePaths, supabaseUploader } from '@/lib/remote/uploads';
import type { Order } from '@/types';

import type { Action, AppState } from './reducer';

type Db = NonNullable<typeof SupabaseInstance>;

/** Order photos live in a private bucket; swap their paths for short-lived links. */
async function withSignedPhotos(db: Db, orders: Order[]): Promise<Order[]> {
  const cache = new Map<string, string>();
  const paths = orders.flatMap((o) => [o.pickupPhotoUri ?? '', ...(o.updates ?? []).map((u) => u.photoUri ?? '')]);
  await signPrivatePaths(db, 'order-photos', paths, cache);
  const sign = (p?: string) => (p ? (cache.get(p) ?? p) : p);
  return orders.map((o) => ({
    ...o,
    ...(o.pickupPhotoUri ? { pickupPhotoUri: sign(o.pickupPhotoUri) } : {}),
    ...(o.updates ? { updates: o.updates.map((u) => ({ ...u, ...(u.photoUri ? { photoUri: sign(u.photoUri) } : {}) })) } : {}),
  }));
}

export type PullScope = 'everything' | 'activity';

/** Loads from the server. "activity" is the quick refresh after a change or a live update. */
export async function pull(db: Db, getState: () => AppState, dispatch: Dispatch<Action>, scope: PullScope): Promise<void> {
  const userId = await api.currentUserId(db);
  if (!userId) return;
  const orders = await withSignedPhotos(db, await api.loadOrders(db));
  const [messages, alerts, customRequests] = await Promise.all([
    api.loadMessages(db, orders),
    api.loadAlerts(db),
    api.loadCustomRequests(db),
  ]);
  if (scope === 'activity') {
    dispatch({ type: 'syncFromServer', snapshot: { orders, messages, alerts, customRequests } });
    return;
  }
  const [profile, myKitchen, favoriteRestaurantIds] = await Promise.all([
    api.loadProfile(db, userId),
    api.loadMyKitchen(db, userId, photoUrl),
    api.loadFavorites(db, userId),
  ]);
  const state = getState();
  // A role picked on this phone before signing in is saved to the profile once.
  if (profile && !profile.role && state.pendingRole) await api.saveProfile(db, userId, { role: state.pendingRole });
  const here = userPlace(profile ?? state.user);
  const near = await api.loadKitchensNear(db, here.lat, here.lng, photoUrl);
  const known = new Set([...near.map((k) => k.id), ...(myKitchen ? [myKitchen.id] : [])]);
  const elsewhere = [...new Set([...favoriteRestaurantIds, ...orders.map((o) => o.restaurantId)])].filter((id) => !known.has(id));
  const farther = await api.loadKitchens(db, elsewhere, photoUrl);
  dispatch({
    type: 'syncFromServer',
    snapshot: {
      ...(profile ? { profile } : {}),
      myKitchen,
      serverKitchens: [...near, ...farther],
      orders,
      messages,
      favoriteRestaurantIds,
      alerts,
      customRequests,
    },
  });
}

/** Changes the server decides on its own terms; on this phone they wait for its answer. */
const SERVER_ONLY = new Set<Action['type']>(['publishRestaurant', 'startPro', 'cancelPro', 'resumePro']);

/**
 * Sends one change to the server. Returns what to refresh afterwards, or null
 * when the change only matters on this phone (search history, coach marks…).
 */
async function send(db: Db, action: Action, before: AppState, dispatch: Dispatch<Action>): Promise<PullScope | null> {
  const userId = before.user?.id ?? '';
  const upload = supabaseUploader(db);
  const myKitchen = before.restaurants.find((r) => r.ownerId === userId);
  switch (action.type) {
    case 'updateProfile':
      await api.saveProfile(db, userId, action.changes);
      return null;
    case 'saveRestaurant':
      await api.saveMyKitchen(db, userId, action.restaurant, upload);
      return null;
    case 'publishRestaurant': {
      if (!myKitchen) return null;
      await api.saveMyKitchen(db, userId, myKitchen, upload);
      await api.submitForReview(db, myKitchen.id);
      dispatch({ type: 'saveRestaurant', restaurant: { ...myKitchen, underReview: true } });
      notify('Sent for review', 'Our team checks your documents, usually within a day. We’ll let you know when your kitchen is live.');
      return 'everything';
    }
    case 'setAcceptingOrders':
      await api.setAcceptingOrders(db, action.restaurantId, action.accepting);
      return null;
    case 'setOrderStatus':
      await api.setOrderStatus(db, action.orderId, action.status);
      // A declined order's card payment goes back in full.
      if (action.status === 'declined' && cardPaymentsOn) await api.refundOrder(db, action.orderId);
      return 'activity';
    case 'cancelOrder':
      await api.cancelOrder(db, action.orderId);
      if (cardPaymentsOn) await api.refundOrder(db, action.orderId);
      return 'activity';
    case 'markArrived':
      await api.markArrived(db, action.orderId);
      return 'activity';
    case 'postOrderUpdate':
      await api.postOrderUpdate(db, action.orderId, action.update.text, action.update.photoUri, upload);
      return 'activity';
    case 'reportOrderIssue':
      await api.reportOrderIssue(db, action.orderId, action.kind, action.note);
      return 'activity';
    case 'sendMessage':
      await api.sendMessage(db, action.orderId, action.text);
      return 'activity';
    case 'markChatRead':
      await api.markChatRead(db, action.orderId, action.at ?? new Date().toISOString());
      return null;
    case 'reportMessage':
      await api.reportMessage(db, action.messageId);
      return null;
    case 'blockUser':
      await api.blockUser(db, action.blockedId);
      return 'activity';
    case 'unblockUser':
      await api.unblockUser(db, action.blockerId, action.blockedId);
      return 'activity';
    case 'toggleFavorite':
      await api.setFavorite(db, userId, action.restaurantId, !before.favoriteRestaurantIds.includes(action.restaurantId));
      return null;
    case 'addReview':
      await api.addReview(db, action.review.orderId, action.review.stars, action.review.tags, action.review.text);
      return null;
    case 'reportReview':
      await api.reportReview(db, action.reviewId);
      return null;
    case 'sendAlert':
      await api.sendAlert(db, action.alert.restaurantId, action.alert.text);
      return 'activity';
    case 'saveDrop':
      await api.saveDrop(db, action.restaurantId, action.drop);
      return null;
    case 'closeDrop': {
      const drop = myKitchen?.drops?.find((d) => d.id === action.dropId);
      if (drop && drop.closesAt > action.at) await api.saveDrop(db, action.restaurantId, { ...drop, closesAt: action.at });
      return null;
    }
    case 'deleteDrop':
      await api.deleteDrop(db, action.dropId);
      return null;
    case 'saveDiscountCode':
      await api.saveDiscountCode(db, action.restaurantId, action.code);
      return null;
    case 'removeDiscountCode': {
      const code = myKitchen?.discountCodes?.find((c) => c.id === action.codeId);
      if (code) await api.saveDiscountCode(db, action.restaurantId, { ...code, paused: true });
      return null;
    }
    case 'requestCustom':
      await api.requestCustomOrder(db, action.request);
      // So they hear when the kitchen sends a price.
      void registerForPush(db, { ask: true });
      return 'activity';
    case 'quoteCustom':
      await api.quoteCustomOrder(db, action.requestId, action.quote);
      return 'activity';
    case 'declineCustom':
      await api.declineCustomOrder(db, action.requestId, action.note);
      return 'activity';
    case 'withdrawCustom':
      await api.withdrawCustomOrder(db, action.requestId);
      return 'activity';
    case 'joinAreaWaitlist':
      await api.joinAreaWaitlist(db, action.zip);
      return null;
    case 'signOut':
      await unregisterPush(db);
      await api.signOut(db);
      return null;
    case 'deleteAccount':
      await unregisterPush(db);
      await api.deleteAccount(db);
      return null;
    default:
      // Orders and accepted quotes go through the screens (they need the server's new id);
      // everything else only matters on this phone.
      return null;
  }
}

/**
 * The store's dispatch with the server in the loop. Changes show at once;
 * if the server refuses one, the person sees why and the app reloads the
 * server's version.
 */
export function makeServerDispatch(db: Db, local: Dispatch<Action>, getState: () => AppState): Dispatch<Action> {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let pending: PullScope | null = null;
  const refresh = (scope: PullScope) => {
    pending = pending === 'everything' || scope === 'everything' ? 'everything' : 'activity';
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      const scopeNow = pending ?? 'activity';
      pending = null;
      timer = null;
      pull(db, getState, local, scopeNow).catch(() => undefined);
    }, 600);
  };
  return (action) => {
    const before = getState();
    if (!SERVER_ONLY.has(action.type)) local(action);
    send(db, action, before, local)
      .then((scope) => {
        if (scope) refresh(scope);
      })
      .catch((error: unknown) => {
        notify('That didn’t go through', error instanceof Error ? error.message : 'Check your connection and try again.');
        refresh('everything');
      });
  };
}
