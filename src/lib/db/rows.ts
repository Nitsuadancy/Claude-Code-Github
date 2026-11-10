/**
 * Row shapes of the Supabase tables, as PostgREST returns them. They mirror
 * supabase/migrations/20261105000000_init.sql; keep both in step.
 */

export type DbRestaurantStatus = 'draft' | 'pending_review' | 'live' | 'suspended';
export type DbOrderStatus = 'placed' | 'accepted' | 'preparing' | 'ready' | 'completed' | 'declined' | 'cancelled';
export type DbDocumentKind = 'food-handler' | 'home-kitchen-permit' | 'government-id';

export interface ProfileRow {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  role: 'foodie' | 'chef' | null;
  neighborhood: string;
  dietary: string[];
  avoid_allergens: string[];
  is_admin: boolean;
  deleted_at: string | null;
  created_at: string;
}

export interface RestaurantRow {
  id: string;
  owner_id: string;
  name: string;
  chef_name: string;
  chef_bio: string;
  chef_photo_path: string | null;
  cuisine: string;
  categories: string[];
  logo_path: string | null;
  cover_paths: string[];
  neighborhood: string;
  city: string;
  /** Two-letter state code. */
  state: string;
  zip: string;
  timezone: string;
  working_days: string[];
  /** "HH:MM:SS" */
  open_time: string | null;
  close_time: string | null;
  /** Days with their own hours, "HH:MM:SS" or "HH:MM". */
  day_hours: Record<string, { open: string; close: string }>;
  prep_minutes: number;
  verified: boolean;
  founding: boolean;
  licensed: boolean;
  law_attested_at: string | null;
  in_person: { place: string; when: string }[];
  accent: string;
  tagline: string;
  update_text: string;
  update_posted_at: string | null;
  update_photo_path: string | null;
  intro_video_path: string | null;
  instagram: string;
  order_mode: 'bake-days' | 'hours';
  bake_days: { day: string; pickupStart: string; pickupEnd: string; closeDaysBefore: number }[];
  /** "YYYY-MM-DD" */
  skipped_bake_days: string[];
  accepting_orders: boolean;
  has_offer: boolean;
  status: DbRestaurantStatus;
  signature_item_id: string | null;
  rating_sum: number;
  rating_count: number;
  created_at: string;
}

/** The private part of a kitchen: only its owner and admins can read it. */
export interface RestaurantAddressRow {
  restaurant_id: string;
  address: string;
  instructions: string;
  photo_path: string | null;
}

export interface MenuItemRow {
  id: string;
  restaurant_id: string;
  name: string;
  description: string;
  price_cents: number;
  available: boolean;
  photo_path: string | null;
  dietary: string[];
  allergens: string[];
  daily_limit: number | null;
  section: string | null;
  position: number;
  created_at: string;
}

export interface RestaurantDocumentRow {
  id: string;
  restaurant_id: string;
  kind: DbDocumentKind;
  storage_path: string;
  file_name: string;
  review_status: 'pending' | 'approved' | 'rejected';
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
}

export interface OrderRow {
  id: string;
  customer_id: string;
  restaurant_id: string;
  status: DbOrderStatus;
  customer_name: string;
  restaurant_name: string;
  subtotal_cents: number;
  movement_fee_cents: number;
  tip_cents: number;
  total_cents: number;
  pickup_address: string;
  pickup_instructions: string;
  pickup_photo_path: string;
  pickup_by: string | null;
  arrived_at: string | null;
  customer_note: string;
  chef_note: string;
  scheduled_for: string | null;
  estimated_ready_at: string;
  created_at: string;
}

export interface OrderLineRow {
  order_id: string;
  menu_item_id: string;
  name: string;
  price_cents: number;
  quantity: number;
}

export interface OrderStatusEventRow {
  id: number;
  order_id: string;
  status: DbOrderStatus;
  at: string;
}

export interface ReviewRow {
  id: string;
  order_id: string;
  restaurant_id: string;
  customer_id: string;
  customer_name: string;
  stars: number;
  tags: string[];
  text: string;
  created_at: string;
}

/** An order fetched with its lines and status events embedded. */
export type OrderWithChildren = OrderRow & {
  order_lines: OrderLineRow[];
  order_status_events: Pick<OrderStatusEventRow, 'status' | 'at'>[];
  /** Selected alongside the order; absent from older queries. */
  order_updates?: OrderUpdateRow[];
};

/** An oven update on an order. Photo paths are in the private order-photos bucket. */
export interface OrderUpdateRow {
  id: string;
  order_id: string;
  body: string;
  photo_path: string | null;
  created_at: string;
}
