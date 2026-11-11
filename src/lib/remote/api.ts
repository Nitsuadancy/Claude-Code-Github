/**
 * Every call the app makes to the backend (Supabase), in one place. Each
 * function takes the Supabase client, talks in the app's own models (through
 * src/lib/db/mappers.ts) and throws a RemoteError with a message people can
 * read: the database's own messages ("This kitchen is closed right now") are
 * written for them.
 *
 * Nothing here runs until the backend is switched on (see docs/GO_LIVE.md).
 */
import type { SupabaseClient } from '@supabase/supabase-js';

import {
  addressRow,
  alertFromRow,
  customRequestFromRow,
  discountCodeRow,
  dropRow,
  menuItemRow,
  messageFromRow,
  orderFromRow,
  type PhotoUrl,
  placeOrderArgs,
  profileFromRow,
  profileUpdate,
  restaurantFromRow,
  restaurantUpdate,
  reviewFromRow,
} from '@/lib/db/mappers';
import type {
  CustomRequestRow,
  DiscountCodeRow,
  DropRow,
  KitchenAlertRow,
  MenuItemRow,
  OrderMessageRow,
  OrderWithChildren,
  ProfileRow,
  RestaurantAddressRow,
  RestaurantDocumentRow,
  RestaurantRow,
  ReviewRow,
} from '@/lib/db/rows';
import type {
  CustomRequest,
  DiscountCode,
  Drop,
  KitchenAlert,
  Order,
  OrderIssueKind,
  OrderMessage,
  OrderStatus,
  Restaurant,
  Review,
  UserProfile,
} from '@/types';

import { ensureUploaded, type Uploader } from './uploads';

export type Db = SupabaseClient;

/** A backend call that didn't work, with a message fit to show. */
export class RemoteError extends Error {}

type Result<T> = { data: T | null; error: { message: string } | null };

function unwrap<T>({ data, error }: Result<T>, fallback = 'Something went wrong. Try again.'): T {
  if (error) throw new RemoteError(error.message || fallback);
  return data as T;
}

const RESTAURANT_SELECT =
  '*, menu_items(*), drops(*, drop_items(menu_item_id))';
const MY_RESTAURANT_SELECT =
  '*, menu_items(*), drops(*, drop_items(menu_item_id)), restaurant_addresses(*), restaurant_documents(*), discount_codes(*)';
const ORDER_SELECT = '*, order_lines(*), order_status_events(status, at), order_updates(*)';

type RestaurantWithChildren = RestaurantRow & {
  menu_items?: MenuItemRow[];
  drops?: DropRow[];
  restaurant_addresses?: RestaurantAddressRow | RestaurantAddressRow[] | null;
  restaurant_documents?: RestaurantDocumentRow[];
  discount_codes?: DiscountCodeRow[];
};

function kitchenFrom(row: RestaurantWithChildren, photoUrl: PhotoUrl, popular: ReadonlySet<string>, privateUrl?: (p: string) => string): Restaurant {
  const address = Array.isArray(row.restaurant_addresses) ? row.restaurant_addresses[0] : row.restaurant_addresses;
  return restaurantFromRow(row, photoUrl, {
    menu: row.menu_items ?? [],
    drops: row.drops ?? [],
    popularItemIds: popular,
    ...(address ? { address } : {}),
    ...(row.restaurant_documents ? { documents: row.restaurant_documents } : {}),
    ...(row.discount_codes ? { discountCodes: row.discount_codes } : {}),
    ...(privateUrl ? { privateUrl } : {}),
  });
}

/* ---------- Sign-in ---------- */

/** Texts a 6-digit code to a US number in E.164 form ("+14075550100"). */
export async function sendCode(db: Db, phone: string): Promise<void> {
  unwrap(await db.auth.signInWithOtp({ phone }), 'We couldn’t send a code to that number.');
}

/** Checks the code and returns the signed-in person's id. */
export async function verifyCode(db: Db, phone: string, token: string): Promise<string> {
  const data = unwrap(await db.auth.verifyOtp({ phone, token, type: 'sms' }), 'That code didn’t work.');
  const id = data?.user?.id;
  if (!id) throw new RemoteError('That code didn’t work. Try again or ask for a new one.');
  return id;
}

export async function signOut(db: Db): Promise<void> {
  await db.auth.signOut();
}

/** The signed-in person's id, or null. */
export async function currentUserId(db: Db): Promise<string | null> {
  const { data } = await db.auth.getSession();
  return data.session?.user.id ?? null;
}

/* ---------- Profile ---------- */

export async function loadProfile(db: Db, userId: string): Promise<UserProfile | null> {
  const row = unwrap(await db.from('profiles').select('*').eq('id', userId).maybeSingle<ProfileRow>());
  return row ? profileFromRow(row) : null;
}

export async function saveProfile(db: Db, userId: string, changes: Partial<Omit<UserProfile, 'id'>>): Promise<void> {
  const row = profileUpdate(changes);
  if (!Object.keys(row).length) return;
  unwrap(await db.from('profiles').update(row).eq('id', userId));
}

/** Removes the account's data (delete_my_account) and the sign-in (the delete-account function). */
export async function deleteAccount(db: Db): Promise<void> {
  unwrap(await db.rpc('delete_my_account'));
  // The sign-in itself needs the service key, so an Edge Function removes it.
  await db.functions.invoke('delete-account').catch(() => undefined);
  await db.auth.signOut();
}

/* ---------- Kitchens ---------- */

async function popularIds(db: Db): Promise<Set<string>> {
  const rows = unwrap(await db.rpc('popular_menu_items')) as { menu_item_id: string }[] | null;
  return new Set((rows ?? []).map((r) => r.menu_item_id));
}

/** Live kitchens within `miles` of a point, nearest first. */
export async function loadKitchensNear(db: Db, lat: number, lng: number, photoUrl: PhotoUrl, miles = 25): Promise<Restaurant[]> {
  const near = (unwrap(await db.rpc('nearby_kitchens', { p_lat: lat, p_lng: lng, p_miles: miles })) ?? []) as {
    restaurant_id: string;
  }[];
  if (!near.length) return [];
  const ids = near.map((n) => n.restaurant_id);
  const [rows, popular] = await Promise.all([
    db.from('restaurants').select(RESTAURANT_SELECT).in('id', ids),
    popularIds(db),
  ]);
  const byId = new Map((unwrap(rows) as RestaurantWithChildren[]).map((r) => [r.id, r]));
  // Keep the nearest-first order.
  return ids.flatMap((id) => (byId.has(id) ? [kitchenFrom(byId.get(id)!, photoUrl, popular)] : []));
}

/** Kitchens by id: favorites and kitchens from past orders that may be farther away. */
export async function loadKitchens(db: Db, ids: string[], photoUrl: PhotoUrl): Promise<Restaurant[]> {
  if (!ids.length) return [];
  const rows = unwrap(await db.from('restaurants').select(RESTAURANT_SELECT).in('id', ids)) as RestaurantWithChildren[];
  return rows.map((r) => kitchenFrom(r, photoUrl, new Set()));
}

/** The signed-in cook's kitchen with its private parts: address, documents and codes. */
export async function loadMyKitchen(
  db: Db,
  userId: string,
  photoUrl: PhotoUrl,
  privateUrl?: (p: string) => string,
): Promise<Restaurant | null> {
  const row = unwrap(
    await db.from('restaurants').select(MY_RESTAURANT_SELECT).eq('owner_id', userId).maybeSingle<RestaurantWithChildren>(),
  );
  return row ? kitchenFrom(row, photoUrl, new Set(), privateUrl) : null;
}

/**
 * Saves the cook's kitchen: uploads any new photos, then writes the kitchen,
 * its menu (removing dishes that were deleted), drops and private address.
 */
export async function saveMyKitchen(db: Db, userId: string, r: Restaurant, upload: Uploader): Promise<void> {
  const folder = `${userId}/kitchen`;
  const coverPaths = (await Promise.all(r.coverUris.map((u) => ensureUploaded(upload, u, 'public-photos', folder)))).filter(
    (p): p is string => !!p,
  );
  const [logoPath, chefPhotoPath, updatePhotoPath, introVideoPath, pickupPhotoPath] = await Promise.all([
    ensureUploaded(upload, r.logoUri, 'public-photos', folder),
    ensureUploaded(upload, r.chefPhotoUri, 'public-photos', folder),
    ensureUploaded(upload, r.update?.photoUri, 'public-photos', folder),
    ensureUploaded(upload, r.introVideoUri, 'public-photos', folder),
    ensureUploaded(upload, r.pickupPhotoUri, 'order-photos', `${userId}/pickup`),
  ]);
  unwrap(
    await db.from('restaurants').upsert({
      id: r.id,
      owner_id: userId,
      ...restaurantUpdate(r, { coverPaths, logoPath, chefPhotoPath, updatePhotoPath, introVideoPath }),
    }),
  );

  const menuRows = await Promise.all(
    r.menu.map(async (item, i) =>
      menuItemRow(item, r.id, i, await ensureUploaded(upload, item.photoUri, 'public-photos', `${userId}/menu`)),
    ),
  );
  if (menuRows.length) unwrap(await db.from('menu_items').upsert(menuRows));
  const keep = r.menu.map((m) => m.id);
  const removed = db.from('menu_items').delete().eq('restaurant_id', r.id);
  unwrap(await (keep.length ? removed.not('id', 'in', `(${keep.join(',')})`) : removed));

  unwrap(await db.from('restaurant_addresses').upsert(addressRow(r, pickupPhotoPath)));

  for (const d of r.drops ?? []) await saveDrop(db, r.id, d);
}

/** Sends a finished kitchen to the Manna team; it goes live once they approve it. */
export async function submitForReview(db: Db, restaurantId: string): Promise<void> {
  unwrap(await db.from('restaurants').update({ status: 'pending_review' }).eq('id', restaurantId));
}

export async function setAcceptingOrders(db: Db, restaurantId: string, accepting: boolean): Promise<void> {
  unwrap(await db.from('restaurants').update({ accepting_orders: accepting }).eq('id', restaurantId));
}

/** Uploads a verification document to the private bucket and records it for review. */
export async function addDocument(
  db: Db,
  userId: string,
  restaurantId: string,
  kind: RestaurantDocumentRow['kind'],
  fileName: string,
  localUri: string,
  upload: Uploader,
): Promise<void> {
  const path = await ensureUploaded(upload, localUri, 'documents', `${userId}/documents`);
  if (!path) throw new RemoteError('That file couldn’t be uploaded.');
  unwrap(
    await db.from('restaurant_documents').insert({ restaurant_id: restaurantId, kind, storage_path: path, file_name: fileName }),
  );
}

/* ---------- Drops and codes (Pro) ---------- */

export async function saveDrop(db: Db, restaurantId: string, d: Drop): Promise<void> {
  unwrap(await db.from('drops').upsert(dropRow(d, restaurantId)));
  unwrap(await db.from('drop_items').delete().eq('drop_id', d.id));
  if (d.itemIds.length) {
    unwrap(await db.from('drop_items').insert(d.itemIds.map((menu_item_id) => ({ drop_id: d.id, menu_item_id }))));
  }
}

export async function deleteDrop(db: Db, dropId: string): Promise<void> {
  unwrap(await db.from('drops').delete().eq('id', dropId));
}

export async function saveDiscountCode(db: Db, restaurantId: string, code: DiscountCode): Promise<void> {
  unwrap(await db.from('discount_codes').upsert(discountCodeRow(code, restaurantId)));
}

/* ---------- Orders ---------- */

/** Every order this person can see: theirs, and their kitchen's. */
export async function loadOrders(db: Db, privateUrl?: (p: string) => string): Promise<Order[]> {
  const rows = unwrap(
    await db.from('orders').select(ORDER_SELECT).order('created_at', { ascending: false }).limit(200),
  ) as OrderWithChildren[];
  return rows.map((r) => orderFromRow(r, privateUrl));
}

export async function loadOrder(db: Db, orderId: string, privateUrl?: (p: string) => string): Promise<Order | null> {
  const row = unwrap(await db.from('orders').select(ORDER_SELECT).eq('id', orderId).maybeSingle<OrderWithChildren>());
  return row ? orderFromRow(row, privateUrl) : null;
}

/** Places an order. Prices, fees and limits are worked out on the server; returns the new order's id. */
export async function placeOrder(db: Db, args: Parameters<typeof placeOrderArgs>[0]): Promise<string> {
  return unwrap(await db.rpc('place_order', placeOrderArgs(args))) as string;
}

export async function setOrderStatus(db: Db, orderId: string, status: OrderStatus): Promise<void> {
  unwrap(await db.rpc('set_order_status', { p_order_id: orderId, p_status: status }));
}

export async function cancelOrder(db: Db, orderId: string): Promise<void> {
  unwrap(await db.rpc('cancel_order', { p_order_id: orderId }));
}

export async function markArrived(db: Db, orderId: string): Promise<void> {
  unwrap(await db.rpc('mark_arrived', { p_order_id: orderId }));
}

/** An oven update on an order, with an optional photo in the private order-photos bucket. */
export async function postOrderUpdate(
  db: Db,
  orderId: string,
  text: string,
  photoUri: string | undefined,
  upload: Uploader,
): Promise<void> {
  const photo_path = await ensureUploaded(upload, photoUri, 'order-photos', orderId);
  unwrap(await db.from('order_updates').insert({ order_id: orderId, body: text.trim(), photo_path }));
}

export async function reportOrderIssue(db: Db, orderId: string, kind: OrderIssueKind, note: string): Promise<void> {
  unwrap(await db.from('order_issues').insert({ order_id: orderId, kind, note: note.trim() }));
}

/* ---------- Chat ---------- */

export async function loadMessages(db: Db, orders: Pick<Order, 'id' | 'customerId'>[]): Promise<OrderMessage[]> {
  if (!orders.length) return [];
  const customer = new Map(orders.map((o) => [o.id, o.customerId]));
  const rows = unwrap(
    await db
      .from('order_messages')
      .select('*')
      .in(
        'order_id',
        orders.map((o) => o.id),
      )
      .order('created_at'),
  ) as OrderMessageRow[];
  return rows.map((m) => messageFromRow(m, customer.get(m.order_id) ?? ''));
}

export async function sendMessage(db: Db, orderId: string, text: string): Promise<void> {
  unwrap(await db.from('order_messages').insert({ order_id: orderId, body: text.trim() }));
}

export async function markChatRead(db: Db, orderId: string, at: string): Promise<void> {
  unwrap(await db.from('order_chat_reads').upsert({ order_id: orderId, read_at: at }));
}

export async function reportMessage(db: Db, messageId: string): Promise<void> {
  unwrap(await db.from('message_reports').insert({ message_id: messageId }));
}

export async function blockUser(db: Db, blockedId: string): Promise<void> {
  unwrap(await db.from('user_blocks').insert({ blocked_id: blockedId }));
}

export async function unblockUser(db: Db, blockerId: string, blockedId: string): Promise<void> {
  unwrap(await db.from('user_blocks').delete().eq('blocker_id', blockerId).eq('blocked_id', blockedId));
}

/* ---------- Reviews and favorites ---------- */

export async function loadReviews(db: Db, restaurantId: string): Promise<Review[]> {
  const rows = unwrap(
    await db.from('reviews').select('*').eq('restaurant_id', restaurantId).order('created_at', { ascending: false }),
  ) as ReviewRow[];
  return rows.map(reviewFromRow);
}

export async function addReview(db: Db, orderId: string, stars: number, tags: string[], text: string): Promise<void> {
  unwrap(await db.rpc('add_review', { p_order_id: orderId, p_stars: stars, p_tags: tags, p_text: text.trim() }));
}

export async function reportReview(db: Db, reviewId: string): Promise<void> {
  unwrap(await db.from('review_reports').insert({ review_id: reviewId }));
}

export async function loadFavorites(db: Db, userId: string): Promise<string[]> {
  const rows = unwrap(await db.from('favorites').select('restaurant_id').eq('customer_id', userId)) as {
    restaurant_id: string;
  }[];
  return rows.map((r) => r.restaurant_id);
}

export async function setFavorite(db: Db, userId: string, restaurantId: string, on: boolean): Promise<void> {
  if (on) unwrap(await db.from('favorites').upsert({ customer_id: userId, restaurant_id: restaurantId }));
  else unwrap(await db.from('favorites').delete().eq('customer_id', userId).eq('restaurant_id', restaurantId));
}

/* ---------- Alerts, custom requests, area list ---------- */

/** Alerts from kitchens this person saved (the policy only returns those) and their own kitchen's. */
export async function loadAlerts(db: Db): Promise<KitchenAlert[]> {
  const rows = unwrap(
    await db
      .from('kitchen_alerts')
      .select('*, restaurants(name)')
      .gte('created_at', new Date(Date.now() - 14 * 86_400_000).toISOString())
      .order('created_at', { ascending: false }),
  ) as KitchenAlertRow[];
  return rows.map((r) => alertFromRow(r));
}

export async function sendAlert(db: Db, restaurantId: string, text: string): Promise<void> {
  unwrap(await db.from('kitchen_alerts').insert({ restaurant_id: restaurantId, body: text.trim() }));
}

export async function loadCustomRequests(db: Db): Promise<CustomRequest[]> {
  const rows = unwrap(
    await db.from('custom_requests').select('*, restaurants(name)').order('created_at', { ascending: false }),
  ) as CustomRequestRow[];
  return rows.map((r) => customRequestFromRow(r));
}

export async function requestCustomOrder(db: Db, r: CustomRequest): Promise<void> {
  unwrap(
    await db.from('custom_requests').insert({
      restaurant_id: r.restaurantId,
      customer_name: r.customerName,
      occasion: r.occasion,
      details: r.details,
      servings: r.servings,
      needed_by: r.neededBy,
      budget_cents: r.budgetCents ?? null,
    }),
  );
}

export async function quoteCustomOrder(
  db: Db,
  requestId: string,
  quote: { priceCents: number; note: string; pickupStart: string; pickupEnd: string },
): Promise<void> {
  unwrap(
    await db.rpc('quote_custom_request', {
      p_request_id: requestId,
      p_price_cents: quote.priceCents,
      p_note: quote.note,
      p_pickup_start: quote.pickupStart,
      p_pickup_end: quote.pickupEnd,
    }),
  );
}

export async function declineCustomOrder(db: Db, requestId: string, note: string): Promise<void> {
  unwrap(await db.rpc('decline_custom_request', { p_request_id: requestId, p_note: note }));
}

export async function withdrawCustomOrder(db: Db, requestId: string): Promise<void> {
  unwrap(await db.rpc('withdraw_custom_request', { p_request_id: requestId }));
}

/** Accepts a kitchen's price; returns the new order's id. */
export async function acceptQuote(db: Db, requestId: string): Promise<string> {
  return unwrap(await db.rpc('accept_custom_quote', { p_request_id: requestId })) as string;
}

export async function joinAreaWaitlist(db: Db, zip: string): Promise<void> {
  const { error } = await db.from('area_waitlist').insert({ zip });
  // Already on the list for this ZIP is fine.
  if (error && !/duplicate key/i.test(error.message)) throw new RemoteError(error.message);
}

/* ---------- Payments (Edge Functions in supabase/functions) ---------- */

/** Calls one of Manna's server functions, passing on its own message when it refuses. */
async function callFunction<T>(db: Db, name: string, body: Record<string, unknown> = {}): Promise<T> {
  const { data, error } = await db.functions.invoke(name, { body });
  if (error) {
    let message = 'Check your connection and try again.';
    const reply = (error as { context?: { json?: () => Promise<unknown> } }).context;
    try {
      const parsed = (await reply?.json?.()) as { error?: string } | undefined;
      if (parsed?.error) message = parsed.error;
    } catch {
      // Not a reply from our function; keep the general message.
    }
    throw new RemoteError(message);
  }
  return data as T;
}

/** Starts the card payment for an order just placed; returns the payment sheet's client secret. */
export async function startPayment(db: Db, orderId: string): Promise<string> {
  const { clientSecret } = await callFunction<{ clientSecret: string }>(db, 'create-payment', { order_id: orderId });
  return clientSecret;
}

/** Refunds a declined or cancelled order in full (nothing happens if it was never paid). */
export async function refundOrder(db: Db, orderId: string): Promise<void> {
  await callFunction(db, 'refund-payment', { order_id: orderId });
}

/** A link to Stripe for the cook's payouts: setup the first time, their Stripe dashboard after. */
export async function payoutsLink(db: Db): Promise<{ url: string; ready: boolean }> {
  return callFunction(db, 'stripe-connect');
}

/** Whether Stripe has finished setting up this cook's payouts. */
export async function loadPayoutsReady(db: Db, userId: string): Promise<boolean> {
  const row = unwrap(await db.from('payment_accounts').select('payouts_ready').eq('profile_id', userId).maybeSingle()) as {
    payouts_ready: boolean;
  } | null;
  return row?.payouts_ready ?? false;
}

/** A link to Stripe to start Manna Pro on a plan, or to manage it once it's running. */
export async function proBillingLink(db: Db, plan: 'monthly' | 'yearly'): Promise<string> {
  const { url } = await callFunction<{ url: string }>(db, 'pro-billing', { plan });
  return url;
}
