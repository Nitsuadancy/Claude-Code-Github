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
  | 'foodie-adventures'
  | 'bakery'
  | 'meal-preppers'
  | 'global-flavors'
  | 'sweet-tooth'
  | 'kids-favorites'
  | 'breakfast-preppers'
  | 'late-night-bites';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: Role | null;
  deliveryAddress: string;
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
}

export type DocumentKind = 'food-handler' | 'home-kitchen-permit' | 'government-id';

export interface RestaurantDocument {
  kind: DocumentKind;
  fileName: string;
  uri: string;
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
  /** Set once the Manna team has checked the kitchen's permit and certificate. */
  verified: boolean;
  /** Typical minutes from order to ready. */
  prepMinutes: number;
  cuisine: string;
  categories: CategoryId[];
  logoUri?: string;
  coverUris: string[];
  address: string;
  city: string;
  areaCode: string;
  workingDays: Weekday[];
  /** 24h "HH:MM". */
  openTime: string;
  /** 24h "HH:MM". May be earlier than openTime for overnight hours. */
  closeTime: string;
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
  | 'declined';

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
  serviceFeeCents: number;
  deliveryFeeCents: number;
  totalCents: number;
  deliveryAddress: string;
  status: OrderStatus;
  /** Every status the order has been in, oldest first, with timestamps. */
  statusHistory: OrderStatusChange[];
  /** Optional message from the kitchen to the customer. */
  chefNote: string;
  /** Optional request from the customer, e.g. allergies or "no onions". */
  customerNote: string;
  createdAt: string;
  estimatedReadyAt: string;
  /** When the customer wants the food, or null for as soon as possible. */
  scheduledFor: string | null;
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
