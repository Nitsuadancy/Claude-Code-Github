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
  /** Home ZIP code, so the app can show kitchens nearby anywhere in the US. */
  zip?: string;
  /** Diets the customer follows; dishes that match get a "Fits your diet" tag. */
  dietary?: DietaryTag[];
  /** Allergens the customer avoids; dishes containing them show a warning. */
  avoidAllergens?: Allergen[];
  /** On the Manna team: sees the team tools. Set only in the database. */
  isAdmin?: boolean;
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
  /** Only sold in drops, not on the everyday menu (e.g. Thanksgiving pies). */
  dropOnly?: boolean;
  /** Ingredients in order of weight, for the dish's label. */
  ingredients?: string;
  /** Net weight or volume for the label, e.g. "1 lb 4 oz (567 g)". */
  netWeight?: string;
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
  /** A photo from the kitchen right now: a fresh batch, the week's special. */
  photoUri?: string;
}

/** A short update from the kitchen on one order, often with a photo of it mid-bake. */
export interface OrderUpdate {
  id: string;
  text: string;
  photoUri?: string;
  at: string;
}

export interface InPersonSpot {
  place: string;
  when: string;
}

export type RestaurantStatus = 'draft' | 'live';

/** A Pro kitchen's alert to everyone who saved it: "Saturday's bake day is open". */
export interface KitchenAlert {
  id: string;
  restaurantId: string;
  restaurantName: string;
  text: string;
  at: string;
}

export type CustomRequestStatus = 'open' | 'quoted' | 'accepted' | 'declined' | 'withdrawn';

/** The kitchen's price for a custom order, with when to pick it up. */
export interface CustomQuote {
  priceCents: number;
  note: string;
  pickupStart: string;
  pickupEnd: string;
  at: string;
}

/** A customer's request for something off-menu: a birthday cake, a party tray, catering. */
export interface CustomRequest {
  id: string;
  restaurantId: string;
  restaurantName: string;
  customerId: string;
  customerName: string;
  /** What it's for, e.g. "Birthday cake". */
  occasion: string;
  details: string;
  servings: number;
  /** Local date the customer needs it, "YYYY-MM-DD". */
  neededBy: string;
  budgetCents?: number;
  createdAt: string;
  status: CustomRequestStatus;
  quote?: CustomQuote;
  /** Why the kitchen couldn't take it, if it said. */
  declineNote?: string;
  /** The order created when the customer accepted the quote. */
  orderId?: string;
}

/**
 * A Pro kitchen's drop: a one-off menu with its own pickup window and order
 * deadline, like "Thanksgiving pies, order by Tuesday".
 */
export interface Drop {
  id: string;
  title: string;
  note?: string;
  /** Menu items in the drop. */
  itemIds: string[];
  pickupStart: string;
  pickupEnd: string;
  /** When ordering closes. */
  closesAt: string;
  createdAt: string;
}

/** A Pro kitchen's discount code, like WELCOME10. The kitchen pays for the discount. */
export interface DiscountCode {
  id: string;
  /** Uppercase letters and numbers, e.g. "WELCOME10". */
  code: string;
  kind: 'percent' | 'amount';
  /** Percent off (5 to 50), or cents off. */
  value: number;
  /** Only for people who haven't ordered from this kitchen before. */
  newCustomersOnly: boolean;
  /** How many orders can use it, or null for no limit. */
  maxUses: number | null;
  endsAt: string | null;
  /** Turned off by the cook. */
  paused?: boolean;
  createdAt: string;
}

export type ProPlan = 'monthly' | 'yearly';

/** A kitchen's Manna Pro subscription. Billing isn't connected yet. */
export interface ProSubscription {
  plan: ProPlan;
  startedAt: string;
  /** When the first paid period starts (after a founding kitchen's free months). */
  billingStartsAt: string;
  /** Set when the cook cancels. Pro stays on until the end of the period they paid for. */
  canceledAt?: string;
}


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
  /** Manna Pro, if the cook subscribed. Founding kitchens also get Pro for their first months. */
  pro?: ProSubscription;
  /** One-off menus with their own pickup day (a Pro tool). */
  drops?: Drop[];
  /** Discount codes (a Pro tool). */
  discountCodes?: DiscountCode[];
  /** This kitchen's invite code for other cooks, set when it opens. */
  referralCode?: string;
  /** The invite code the cook entered while setting up, if another cook invited them. */
  referredBy?: string;
  /** Fee-free months earned from invites: no kitchen fee on orders before this time. */
  feeCreditUntil?: string;
  /** Sent to the Manna team and waiting for approval (only when the backend is on). */
  underReview?: boolean;
  /** The Manna team sent the kitchen back with this note; the cook fixes it and submits again. */
  reviewNote?: string;
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
  /** A short hello from the cook (up to 30 seconds), shown on the kitchen page. */
  introVideoUri?: string;
  /** A photo of the door, gate or cooler where customers pick up. Private, like the address. */
  pickupPhotoUri?: string;
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
  /** Set when the cart is for one of the kitchen's drops, which has its own pickup day. */
  dropId?: string;
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
  /** Manna's movement fee (10%, at least $1.50), paid by the customer. Card processing comes out of it. */
  movementFeeCents: number;
  /**
   * Manna's share of the food, taken from the kitchen's payout (5%, or 0 in a
   * founding kitchen's first months). Missing on orders from before the kitchen fee.
   */
  kitchenFeeCents?: number;
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
  /** The kitchen's first text note, from before updates could carry photos. Shown as the first update. */
  chefNote: string;
  /** Updates from the kitchen on this order, oldest first, often with a photo. */
  updates?: OrderUpdate[];
  /** Optional request from the customer, e.g. allergies or "no onions". */
  customerNote: string;
  createdAt: string;
  estimatedReadyAt: string;
  /** Pickup time the customer chose, or null for as soon as it's ready. */
  scheduledFor: string | null;
  /** End of the pickup window, for bake-day and drop orders. */
  pickupBy?: string;
  /** A discount code used on this order, and how much it took off the food. Paid by the kitchen. */
  discountCode?: string;
  discountCents?: number;
  /** The drop this order came from, if any. */
  dropId?: string;
  dropTitle?: string;
  /** The kitchen's pickup instructions, shared once it accepts. */
  pickupInstructions?: string;
  /** The kitchen's photo of its pickup spot, shown once it accepts. */
  pickupPhotoUri?: string;
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
