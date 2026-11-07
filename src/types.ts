import type { AccentId } from '@/data/accents';
import type { DayHours } from '@/lib/hours';

export type Role = 'foodie' | 'chef';

export type Weekday =
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday'
  | 'sunday';

export type CategoryId =
  | 'vegan'
  | 'cottage-kitchen'
  | 'global-flavors'
  | 'bakery'
  | 'breakfast-preppers'
  | 'late-night-bites'
  | 'sweet-tooth';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: Role | null;
  /** Where the foodie browses from, e.g. "College Park". Empty until they choose. */
  neighborhood: string;
  /** Diets the customer follows; dishes that match get a "Fits your diet" tag. */
  dietary?: DietaryTag[];
  /** Allergens the customer avoids; dishes containing them show a warning. */
  avoidAllergens?: Allergen[];
}

export type DietaryTag = 'vegan' | 'vegetarian' | 'gluten-free' | 'dairy-free' | 'halal' | 'spicy';

export type Allergen =
  | 'peanuts'
  | 'tree-nuts'
  | 'dairy'
  | 'gluten'
  | 'eggs'
  | 'soy'
  | 'fish'
  | 'shellfish'
  | 'sesame';

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  /** Price in cents to avoid floating point rounding. */
  priceCents: number;
  available: boolean;
  photoUri?: string;
  dietary: DietaryTag[];
  allergens: Allergen[];
  /** Most the kitchen will make per day, or null for no limit. */
  dailyLimit: number | null;
  /** Menu section such as "Mains" or "Desserts"; empty when unfiled. */
  section?: string;
  /** Set by Manna from order history: one of the kitchen's most ordered dishes. */
  popular?: boolean;
}

export type DocumentKind = 'food-handler' | 'home-kitchen-permit' | 'government-id';

export interface RestaurantDocument {
  kind: DocumentKind;
  fileName: string;
  uri: string;
}

/**
 * "bake-days": customers order ahead for a weekly bake day and pick up in a window.
 * "hours": customers order while the kitchen is open and pick up when it's ready.
 */
export type OrderMode = 'bake-days' | 'hours';

/** One weekly bake day, e.g. Saturdays, pickup 9–12, orders close Thursday at 8 PM. */
export interface BakeDaySchedule {
  day: Weekday;
  /** Pickup window, 24h "HH:MM". */
  pickupStart: string;
  pickupEnd: string;
  /** Orders close at 8 PM this many days before the bake day (1 to 3). */
  closeDaysBefore: number;
}

export interface KitchenUpdate {
  text: string;
  postedAt: string;
}

export interface InPersonSpot {
  place: string;
  when: string;
}

export type RestaurantStatus = 'draft' | 'live';

export interface Restaurant {
  id: string;
  /** Set for restaurants created by a chef on this device; sample restaurants have none. */
  ownerId?: string;
  name: string;
  chefName: string;
  /** The chef's story, shown in "Meet the chef". */
  chefBio: string;
  chefPhotoUri?: string;
  /** Menu item the chef is proudest of; shown first with a "Signature" label. */
  signatureItemId?: string;
  /** Set once the Manna team has checked the kitchen's certificate and ID. */
  verified: boolean;
  /** One of the first kitchens on Manna. Set by the Manna team. */
  founding?: boolean;
  /**
   * The Manna team approved a food permit or license (commercial kitchen,
   * food truck, catering, a home-kitchen permit). Optional: kitchens without
   * one still sell, labeled "Home kitchen".
   */
  licensed?: boolean;
  /** When the cook confirmed they follow their state's and county's food laws. Needed to open. */
  lawAttestedAt?: string;
  /** Where people can also find the cook in person, e.g. a market table or a coffee shop pop-up. */
  inPerson?: InPersonSpot[];
  /** Kitchen page accent color, one of KITCHEN_ACCENTS. Manna's champagne when unset. */
  accent?: AccentId;
  /** One line under the kitchen's name, e.g. "Small-batch sourdough, baked Saturdays". */
  tagline?: string;
  /** A short note pinned to the top of the menu for a week, e.g. "Pumpkin bread is back". */
  update?: KitchenUpdate;
  /** Instagram username, without the @. */
  instagram?: string;
  /** How the kitchen takes orders. Kitchens without one use set hours. */
  orderMode?: OrderMode;
  /** Weekly bake days, for kitchens that take orders ahead and bake in one batch. */
  bakeDays?: BakeDaySchedule[];
  /** Bake days the cook is skipping, as local dates like "2026-11-26". */
  skippedBakeDays?: string[];
  /** e.g. "Cooler on the porch, ring once". Shared with a customer once the kitchen accepts. */
  pickupInstructions?: string;
  /** Typical minutes from order to ready. */
  prepMinutes: number;
  cuisine: string;
  categories: CategoryId[];
  logoUri?: string;
  coverUris: string[];
  /** Pickup address. Shown to a customer only once the chef accepts their order. */
  address: string;
  city: string;
  /** Two-letter state code, e.g. "FL". Home-food law, labels and limits follow it. */
  state?: string;
  areaCode: string;
  /** Public location, e.g. "College Park". */
  neighborhood: string;
  workingDays: Weekday[];
  /** 24h "HH:MM". */
  openTime: string;
  /** 24h "HH:MM". May be earlier than openTime for overnight hours. */
  closeTime: string;
  /** Days with different hours from openTime/closeTime, e.g. shorter weekends. */
  dayHours?: Partial<Record<Weekday, DayHours>>;
  rating: number;
  ratingCount: number;
  hasOffer: boolean;
  createdAt: string;
  acceptingOrders: boolean;
  menu: MenuItem[];
  documents: RestaurantDocument[];
  status: RestaurantStatus;
}

export interface CartLine {
  itemId: string;
  quantity: number;
}

export interface Cart {
  restaurantId: string | null;
  lines: CartLine[];
}

export type OrderStatus =
  | 'placed'
  | 'accepted'
  | 'preparing'
  | 'ready'
  | 'completed'
  | 'declined'
  /** The customer called it off before the kitchen accepted. */
  | 'cancelled';

export interface OrderLine {
  itemId: string;
  name: string;
  priceCents: number;
  quantity: number;
}

export interface OrderStatusChange {
  status: OrderStatus;
  at: string;
}

export interface Order {
  id: string;
  customerId: string;
  customerName: string;
  restaurantId: string;
  restaurantName: string;
  lines: OrderLine[];
  subtotalCents: number;
  /** Manna's movement fee (8%, at least $1), paid by the customer. Card processing comes out of it. */
  movementFeeCents: number;
  /** Only on orders from before Manna went pickup-only. */
  deliveryFeeCents?: number;
  /** Tip for the chef; all of it goes to the kitchen. */
  tipCents?: number;
  totalCents: number;
  /** The kitchen's pickup address when the order was placed. */
  pickupAddress: string;
  status: OrderStatus;
  /** Every status the order has been in, oldest first, with timestamps. */
  statusHistory: OrderStatusChange[];
  /** Optional message from the kitchen to the customer. */
  chefNote: string;
  /** Optional request from the customer, e.g. allergies or "no onions". */
  customerNote: string;
  createdAt: string;
  estimatedReadyAt: string;
  /** Pickup time the customer chose, or null for as soon as it's ready. */
  scheduledFor: string | null;
  /** End of the pickup window, for bake-day orders. */
  pickupBy?: string;
  /** The kitchen's pickup instructions, shared once it accepts. */
  pickupInstructions?: string;
  /** When the customer tapped "I'm here" at pickup. */
  arrivedAt?: string;
  /** The customer's request for help with this order, if they sent one. */
  issue?: OrderIssue;
}

export type OrderIssueKind =
  | 'late'
  | 'pickup'
  | 'change'
  | 'missing'
  | 'quality'
  | 'not-received'
  | 'charge'
  | 'other';

/** Which side of an order a chat message comes from. */
export type ChatSide = 'customer' | 'kitchen';

/**
 * A message in an order's chat between the customer and the kitchen, for
 * changes and timing ("running 10 minutes late", "can I swap the scones?").
 */
export interface OrderMessage {
  id: string;
  orderId: string;
  senderId: string;
  side: ChatSide;
  text: string;
  at: string;
}

/** One person stopped messages from another. Either side can block. */
export interface Block {
  blockerId: string;
  blockedId: string;
  at: string;
}

/** "Need help with this order?": what went wrong, in the customer's words, for Manna's support team. */
export interface OrderIssue {
  kind: OrderIssueKind;
  note: string;
  at: string;
}

/** A farmer or artisan asking to sell on Manna Mart before it opens. */
export interface GrowerApplication {
  id: string;
  businessName: string;
  /** What they grow or make, in their words. */
  offering: string;
  neighborhood: string;
  /** Phone number or email. */
  contact: string;
  createdAt: string;
}

export interface Review {
  id: string;
  orderId: string;
  restaurantId: string;
  customerId: string;
  /** Shown as first name and last initial, e.g. "Ada L." */
  customerName: string;
  /** 1 to 5. */
  stars: number;
  /** Quick compliments like "Tasted like home". */
  tags: string[];
  text: string;
  createdAt: string;
}
