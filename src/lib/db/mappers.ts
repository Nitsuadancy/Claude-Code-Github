/**
 * Converts between Supabase rows (snake_case, storage paths) and the app's
 * models (camelCase, image URIs). Pure functions, so they're easy to test and
 * the screens never see database shapes.
 */
import { DEFAULT_ACCENT, isAccentId } from '@/data/accents';
import { DEFAULT_STATE, marketFor } from '@/data/regions';
import { kitchenPlace } from '@/lib/location';
import { timezoneFor } from '@/lib/timezones';
import { lookupZip } from '@/lib/zips';
import { isCategoryId } from '@/data/categories';
import { ALLERGENS, DIETARY_TAGS } from '@/lib/dietary';
import { WEEKDAYS } from '@/lib/hours';
import { isValidBakeDay } from '@/lib/bake-days';
import { cleanInstagram, TAGLINE_MAX, UPDATE_MAX } from '@/lib/kitchen-style';
import type {
  Allergen,
  CustomRequest,
  DietaryTag,
  DiscountCode,
  Drop,
  KitchenAlert,
  MenuItem,
  Order,
  OrderMessage,
  OrderStatus,
  Restaurant,
  RestaurantDocument,
  Review,
  UserProfile,
  Weekday,
} from '@/types';

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
} from './rows';

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Turns a storage path into something an <Image> can load, e.g. a public URL. */
export type PhotoUrl = (path: string) => string;

const DIETARY = new Set<string>(DIETARY_TAGS.map((t) => t.value));
const ALLERGEN_SET = new Set<string>(ALLERGENS.map((a) => a.value));
const WEEKDAY_SET = new Set<string>(WEEKDAYS);

const dietaryTags = (values: string[]) => values.filter((v): v is DietaryTag => DIETARY.has(v));
const allergens = (values: string[]) => values.filter((v): v is Allergen => ALLERGEN_SET.has(v));

/** "09:00:00" → "09:00". The app stores times as 24h "HH:MM". */
export function toAppTime(dbTime: string | null): string {
  return dbTime ? dbTime.slice(0, 5) : '';
}

/** The average shown on a kitchen, to one decimal, from the running totals. */
export function averageRating(sum: number, count: number): number {
  return count > 0 ? Math.round((sum / count) * 10) / 10 : 0;
}

export function profileFromRow(row: ProfileRow): UserProfile {
  return {
    id: row.id,
    name: row.name,
    email: row.email ?? '',
    phone: row.phone ?? '',
    role: row.role,
    neighborhood: row.neighborhood,
    ...(row.zip ? { zip: row.zip } : {}),
    ...(row.is_admin ? { isAdmin: true } : {}),
    dietary: dietaryTags(row.dietary),
    avoidAllergens: allergens(row.avoid_allergens),
  };
}

/** The columns a person may change on their own profile. */
export function profileUpdate(changes: Partial<Omit<UserProfile, 'id'>>): Partial<ProfileRow> {
  const row: Partial<ProfileRow> = {};
  if (changes.name !== undefined) row.name = changes.name.trim();
  if (changes.email !== undefined) row.email = changes.email.trim() || null;
  if (changes.role !== undefined) row.role = changes.role;
  if (changes.neighborhood !== undefined) row.neighborhood = changes.neighborhood;
  if (changes.zip !== undefined) row.zip = changes.zip;
  if (changes.dietary !== undefined) row.dietary = changes.dietary;
  if (changes.avoidAllergens !== undefined) row.avoid_allergens = changes.avoidAllergens;
  return row;
}

export function menuItemFromRow(row: MenuItemRow, photoUrl: PhotoUrl, popular = false): MenuItem {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    priceCents: row.price_cents,
    available: row.available,
    photoUri: row.photo_path ? photoUrl(row.photo_path) : undefined,
    dietary: dietaryTags(row.dietary),
    allergens: allergens(row.allergens),
    dailyLimit: row.daily_limit,
    section: row.section ?? '',
    ...(row.drop_only ? { dropOnly: true } : {}),
    ...(row.ingredients ? { ingredients: row.ingredients } : {}),
    ...(row.net_weight ? { netWeight: row.net_weight } : {}),
    ...(popular ? { popular: true } : {}),
  };
}

/**
 * A menu item ready to save. Photos are uploaded first; pass the storage path
 * they landed at, or null to keep the dish without a photo.
 */
export function menuItemRow(
  item: MenuItem,
  restaurantId: string,
  position: number,
  photoPath: string | null,
): Omit<MenuItemRow, 'created_at'> {
  return {
    id: item.id,
    restaurant_id: restaurantId,
    name: item.name.trim(),
    description: item.description.trim(),
    price_cents: item.priceCents,
    available: item.available,
    photo_path: photoPath,
    dietary: item.dietary,
    allergens: item.allergens,
    daily_limit: item.dailyLimit,
    section: item.section?.trim() || null,
    position,
    drop_only: !!item.dropOnly,
    ingredients: (item.ingredients ?? '').trim().slice(0, 400),
    net_weight: (item.netWeight ?? '').trim().slice(0, 40),
  };
}

function documentFromRow(row: RestaurantDocumentRow): RestaurantDocument {
  return { kind: row.kind, fileName: row.file_name, uri: row.storage_path };
}

export interface RestaurantExtras {
  menu?: MenuItemRow[];
  /** Only the owner (and admins) can read the street address and pickup instructions. */
  address?: RestaurantAddressRow;
  documents?: RestaurantDocumentRow[];
  /** Dish ids from popular_menu_items(). */
  popularItemIds?: ReadonlySet<string>;
  /** Signed URLs for the private order-photos bucket (the pickup spot photo). */
  privateUrl?: (path: string) => string;
  drops?: DropRow[];
  /** Only the owner (and admins) can read a kitchen's codes. */
  discountCodes?: DiscountCodeRow[];
}

export function restaurantFromRow(row: RestaurantRow, photoUrl: PhotoUrl, extras: RestaurantExtras = {}): Restaurant {
  const menu = [...(extras.menu ?? [])]
    .sort((a, b) => a.position - b.position || a.created_at.localeCompare(b.created_at))
    .map((m) => menuItemFromRow(m, photoUrl, extras.popularItemIds?.has(m.id) ?? false));
  return {
    id: row.id,
    ownerId: row.owner_id,
    name: row.name,
    chefName: row.chef_name,
    chefBio: row.chef_bio,
    chefPhotoUri: row.chef_photo_path ? photoUrl(row.chef_photo_path) : undefined,
    signatureItemId: row.signature_item_id ?? undefined,
    verified: row.verified,
    founding: row.founding,
    licensed: row.licensed,
    ...(row.law_attested_at ? { lawAttestedAt: row.law_attested_at } : {}),
    inPerson: row.in_person ?? [],
    accent: isAccentId(row.accent) ? row.accent : undefined,
    tagline: row.tagline,
    update:
      (row.update_text || row.update_photo_path) && row.update_posted_at
        ? {
            text: row.update_text,
            postedAt: row.update_posted_at,
            ...(row.update_photo_path ? { photoUri: photoUrl(row.update_photo_path) } : {}),
          }
        : undefined,
    ...(row.intro_video_path ? { introVideoUri: photoUrl(row.intro_video_path) } : {}),
    instagram: row.instagram,
    orderMode: row.order_mode,
    bakeDays: row.bake_days
      .map((b) => ({ ...b, day: b.day as Weekday }))
      .filter((b) => WEEKDAY_SET.has(b.day) && isValidBakeDay(b)),
    skippedBakeDays: row.skipped_bake_days,
    prepMinutes: row.prep_minutes,
    cuisine: row.cuisine,
    categories: row.categories.filter(isCategoryId),
    logoUri: row.logo_path ? photoUrl(row.logo_path) : undefined,
    coverUris: row.cover_paths.map(photoUrl),
    address: extras.address?.address ?? '',
    pickupInstructions: extras.address?.instructions ?? '',
    ...(extras.address?.photo_path && extras.privateUrl ? { pickupPhotoUri: extras.privateUrl(extras.address.photo_path) } : {}),
    city: row.city,
    state: row.state,
    areaCode: row.zip,
    neighborhood: row.neighborhood,
    workingDays: row.working_days.filter((d): d is Weekday => WEEKDAY_SET.has(d)),
    openTime: toAppTime(row.open_time),
    closeTime: toAppTime(row.close_time),
    dayHours: Object.fromEntries(
      Object.entries(row.day_hours ?? {})
        .filter(([day]) => WEEKDAY_SET.has(day))
        .map(([day, h]) => [day, { open: toAppTime(h.open), close: toAppTime(h.close) }]),
    ),
    rating: averageRating(row.rating_sum, row.rating_count),
    ratingCount: row.rating_count,
    hasOffer: row.has_offer,
    // On Manna since it went live: new-kitchen labels and founding fee months count from here.
    createdAt: row.live_since ?? row.created_at,
    ...(row.referral_code ? { referralCode: row.referral_code } : {}),
    ...(row.referred_by_code ? { referredBy: row.referred_by_code } : {}),
    ...(row.fee_credit_until ? { feeCreditUntil: row.fee_credit_until } : {}),
    ...(row.pro_plan && row.pro_started_at && row.pro_billing_starts_at
      ? {
          pro: {
            plan: row.pro_plan,
            startedAt: row.pro_started_at,
            billingStartsAt: row.pro_billing_starts_at,
            ...(row.pro_canceled_at ? { canceledAt: row.pro_canceled_at } : {}),
          },
        }
      : {}),
    acceptingOrders: row.accepting_orders,
    menu,
    documents: (extras.documents ?? []).map(documentFromRow),
    ...(extras.drops?.length ? { drops: extras.drops.map(dropFromRow) } : {}),
    ...(extras.discountCodes?.length ? { discountCodes: extras.discountCodes.map(discountCodeFromRow) } : {}),
    // The app has two states; a kitchen under review or suspended isn't live.
    status: row.status === 'live' ? 'live' : 'draft',
    ...(row.status === 'pending_review' ? { underReview: true } : {}),
    ...(row.status === 'draft' && row.review_note ? { reviewNote: row.review_note } : {}),
  };
}

/**
 * The columns a chef may write on their kitchen. Verification, founding,
 * status and ratings are set by the server and left out on purpose.
 */
export function restaurantUpdate(
  r: Restaurant,
  paths: {
    coverPaths: string[];
    logoPath: string | null;
    chefPhotoPath: string | null;
    updatePhotoPath?: string | null;
    introVideoPath?: string | null;
  },
): Partial<RestaurantRow> {
  return {
    name: r.name.trim(),
    chef_name: r.chefName.trim(),
    chef_bio: r.chefBio.trim(),
    chef_photo_path: paths.chefPhotoPath,
    cuisine: r.cuisine,
    categories: r.categories,
    logo_path: paths.logoPath,
    cover_paths: paths.coverPaths.slice(0, 3),
    neighborhood: r.neighborhood,
    city: r.city.trim(),
    state: r.state ?? DEFAULT_STATE,
    // Bake-day cutoffs run on the market's clock.
    // The kitchen's time zone, for deadlines worked out on the server.
    timezone: marketFor(r.neighborhood, r.state)?.timezone ?? timezoneFor(r.state, lookupZip(r.areaCode)?.lng),
    // Its area's rough center (the ZIP's, never the address), for "kitchens near you".
    ...(kitchenPlace(r) ? { area_lat: round2(kitchenPlace(r)!.lat), area_lng: round2(kitchenPlace(r)!.lng) } : {}),
    zip: r.areaCode.trim(),
    referred_by_code: r.referredBy ?? null,
    working_days: r.workingDays,
    open_time: r.openTime || null,
    close_time: r.closeTime || null,
    day_hours: Object.fromEntries(
      Object.entries(r.dayHours ?? {}).filter(([day]) => r.workingDays.includes(day as Weekday)),
    ) as RestaurantRow['day_hours'],
    prep_minutes: r.prepMinutes,
    in_person: (r.inPerson ?? []).slice(0, 5),
    law_attested_at: r.lawAttestedAt ?? null,
    accent: r.accent ?? DEFAULT_ACCENT,
    tagline: (r.tagline ?? '').trim().slice(0, TAGLINE_MAX),
    update_text: (r.update?.text ?? '').trim().slice(0, UPDATE_MAX),
    update_posted_at: r.update?.text.trim() || paths.updatePhotoPath ? (r.update?.postedAt ?? null) : null,
    ...(paths.updatePhotoPath !== undefined ? { update_photo_path: paths.updatePhotoPath } : {}),
    ...(paths.introVideoPath !== undefined ? { intro_video_path: paths.introVideoPath } : {}),
    instagram: cleanInstagram(r.instagram ?? ''),
    order_mode: r.orderMode ?? 'hours',
    bake_days: (r.bakeDays ?? []).filter(isValidBakeDay).slice(0, 3),
    skipped_bake_days: r.skippedBakeDays ?? [],
    accepting_orders: r.acceptingOrders,
    signature_item_id: r.signatureItemId ?? null,
  };
}

/**
 * `privateUrl` turns paths in the private order-photos bucket into signed
 * URLs the app has already fetched; without it, private photos are left out.
 */
export function orderFromRow(row: OrderWithChildren, privateUrl?: (path: string) => string): Order {
  const history = [...row.order_status_events]
    .sort((a, b) => a.at.localeCompare(b.at))
    .map((e) => ({ status: e.status as OrderStatus, at: e.at }));
  return {
    id: row.id,
    customerId: row.customer_id,
    customerName: row.customer_name,
    restaurantId: row.restaurant_id,
    restaurantName: row.restaurant_name,
    lines: row.order_lines.map((l) => ({
      itemId: l.menu_item_id ?? `custom:${row.id}`,
      name: l.name,
      priceCents: l.price_cents,
      quantity: l.quantity,
    })),
    subtotalCents: row.subtotal_cents,
    movementFeeCents: row.movement_fee_cents,
    kitchenFeeCents: row.kitchen_fee_cents,
    ...(row.discount_cents ? { discountCents: row.discount_cents, discountCode: row.discount_code ?? undefined } : {}),
    ...(row.drop_id ? { dropId: row.drop_id } : {}),
    tipCents: row.tip_cents,
    totalCents: row.total_cents,
    pickupAddress: row.pickup_address,
    ...(row.pickup_instructions ? { pickupInstructions: row.pickup_instructions } : {}),
    ...(row.pickup_photo_path && privateUrl ? { pickupPhotoUri: privateUrl(row.pickup_photo_path) } : {}),
    ...(row.order_updates?.length
      ? {
          updates: [...row.order_updates]
            .sort((a, b) => a.created_at.localeCompare(b.created_at))
            .map((u) => ({
              id: u.id,
              text: u.body,
              at: u.created_at,
              ...(u.photo_path && privateUrl ? { photoUri: privateUrl(u.photo_path) } : {}),
            })),
        }
      : {}),
    ...(row.pickup_by ? { pickupBy: row.pickup_by } : {}),
    ...(row.arrived_at ? { arrivedAt: row.arrived_at } : {}),
    status: row.status,
    statusHistory: history.length ? history : [{ status: 'placed', at: row.created_at }],
    chefNote: row.chef_note,
    customerNote: row.customer_note,
    createdAt: row.created_at,
    estimatedReadyAt: row.estimated_ready_at,
    scheduledFor: row.scheduled_for,
  };
}

/**
 * The kitchen's private row: street address, pickup instructions and the
 * storage path of the pickup spot photo once it's uploaded.
 */
export function addressRow(r: Restaurant, pickupPhotoPath: string | null = null): RestaurantAddressRow {
  return {
    restaurant_id: r.id,
    address: r.address.trim().slice(0, 200),
    instructions: (r.pickupInstructions ?? '').trim().slice(0, 140),
    photo_path: r.pickupPhotoUri ? pickupPhotoPath : null,
  };
}

/** Arguments for the place_order() function. Prices come from the server, never the app. */
export function placeOrderArgs(order: {
  restaurantId: string;
  lines: { itemId: string; quantity: number }[];
  customerNote: string;
  scheduledFor: string | null;
  tipCents: number;
  dropId?: string;
  discountCode?: string;
}) {
  return {
    p_restaurant_id: order.restaurantId,
    p_lines: order.lines.map((l) => ({ menu_item_id: l.itemId, quantity: l.quantity })),
    p_customer_note: order.customerNote.trim().slice(0, 280),
    p_scheduled_for: order.scheduledFor,
    p_tip_cents: order.tipCents,
    p_drop_id: order.dropId ?? null,
    p_discount_code: order.discountCode ?? null,
  };
}

export function reviewFromRow(row: ReviewRow): Review {
  return {
    id: row.id,
    orderId: row.order_id,
    restaurantId: row.restaurant_id,
    customerId: row.customer_id,
    customerName: row.customer_name,
    stars: row.stars,
    tags: row.tags,
    text: row.text,
    createdAt: row.created_at,
  };
}

/* ---------- Chat, drops, codes, custom requests, alerts ---------- */

/** A chat message; its side comes from whether the customer sent it. */
export function messageFromRow(row: OrderMessageRow, customerId: string): OrderMessage {
  return {
    id: row.id,
    orderId: row.order_id,
    senderId: row.sender_id,
    side: row.sender_id === customerId ? 'customer' : 'kitchen',
    text: row.body,
    at: row.created_at,
  };
}

export function dropFromRow(row: DropRow): Drop {
  return {
    id: row.id,
    title: row.title,
    ...(row.note ? { note: row.note } : {}),
    itemIds: (row.drop_items ?? []).map((i) => i.menu_item_id),
    pickupStart: row.pickup_start,
    pickupEnd: row.pickup_end,
    closesAt: row.closes_at,
    createdAt: row.created_at,
  };
}

export function dropRow(d: Drop, restaurantId: string): Omit<DropRow, 'drop_items'> {
  return {
    id: d.id,
    restaurant_id: restaurantId,
    title: d.title.trim().slice(0, 40),
    note: (d.note ?? '').trim().slice(0, 140),
    pickup_start: d.pickupStart,
    pickup_end: d.pickupEnd,
    closes_at: d.closesAt,
    created_at: d.createdAt,
  };
}

export function discountCodeFromRow(row: DiscountCodeRow): DiscountCode {
  return {
    id: row.id,
    code: row.code,
    kind: row.kind,
    value: row.value,
    newCustomersOnly: row.new_customers_only,
    maxUses: row.max_uses,
    endsAt: row.ends_at,
    ...(row.paused ? { paused: true } : {}),
    createdAt: row.created_at,
  };
}

export function discountCodeRow(c: DiscountCode, restaurantId: string): DiscountCodeRow {
  return {
    id: c.id,
    restaurant_id: restaurantId,
    code: c.code,
    kind: c.kind,
    value: c.value,
    new_customers_only: c.newCustomersOnly,
    max_uses: c.maxUses,
    ends_at: c.endsAt,
    paused: !!c.paused,
    created_at: c.createdAt,
  };
}

export function customRequestFromRow(row: CustomRequestRow, restaurantName = ''): CustomRequest {
  return {
    id: row.id,
    restaurantId: row.restaurant_id,
    restaurantName: row.restaurants?.name ?? restaurantName,
    customerId: row.customer_id,
    customerName: row.customer_name,
    occasion: row.occasion,
    details: row.details,
    servings: row.servings,
    neededBy: row.needed_by,
    ...(row.budget_cents ? { budgetCents: row.budget_cents } : {}),
    createdAt: row.created_at,
    status: row.status,
    ...(row.quote_cents && row.quote_pickup_start && row.quote_pickup_end
      ? {
          quote: {
            priceCents: row.quote_cents,
            note: row.quote_note,
            pickupStart: row.quote_pickup_start,
            pickupEnd: row.quote_pickup_end,
            at: row.quoted_at ?? row.created_at,
          },
        }
      : {}),
    ...(row.decline_note ? { declineNote: row.decline_note } : {}),
    ...(row.order_id ? { orderId: row.order_id } : {}),
  };
}

export function alertFromRow(row: KitchenAlertRow, restaurantName = ''): KitchenAlert {
  return {
    id: row.id,
    restaurantId: row.restaurant_id,
    restaurantName: row.restaurants?.name ?? restaurantName,
    text: row.body,
    at: row.created_at,
  };
}
