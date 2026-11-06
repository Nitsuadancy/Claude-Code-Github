import { normalizePersisted } from '@/lib/migrate';
import type {
  Cart,
  GrowerApplication,
  Order,
  OrderStatus,
  Restaurant,
  Review,
  Role,
  UserProfile,
} from '@/types';

export interface AppState {
  /** False until persisted state has been loaded from device storage. */
  hydrated: boolean;
  hasSeenWelcome: boolean;
  hasSeenCoachMarks: boolean;
  /** Role picked on "Choose your Experience", before the user has signed in. */
  pendingRole: Role | null;
  user: UserProfile | null;
  /** Restaurants created on this device. Sample restaurants are added by selectors. */
  restaurants: Restaurant[];
  cart: Cart;
  orders: Order[];
  favoriteRestaurantIds: string[];
  /** Reviews written on this device. */
  reviews: Review[];
  /** When the customer last opened Activity; newer items show a dot on the bell. */
  activitySeenAt: string | null;
  /** Most recent searches first, at most 6. */
  recentSearches: string[];
  /** Hides the "Personalize your feed" card on home. */
  dietNudgeDismissed: boolean;
  /** Set once someone on this device joins the Farmer & Artisan waitlist. */
  growerApplication: GrowerApplication | null;
  /** Reviews this person reported. They are hidden here and sent to Manna's team to check. */
  reportedReviewIds: string[];
}

export type PersistedState = Omit<AppState, 'hydrated'>;

export const EMPTY_CART: Cart = { restaurantId: null, lines: [] };

export const INITIAL_STATE: AppState = {
  hydrated: false,
  hasSeenWelcome: false,
  hasSeenCoachMarks: false,
  pendingRole: null,
  user: null,
  restaurants: [],
  cart: EMPTY_CART,
  orders: [],
  favoriteRestaurantIds: [],
  reviews: [],
  activitySeenAt: null,
  recentSearches: [],
  dietNudgeDismissed: false,
  growerApplication: null,
  reportedReviewIds: [],
};

export type Action =
  | { type: 'hydrate'; state: Partial<PersistedState> | null }
  | { type: 'completeWelcome' }
  | { type: 'joinGrowerWaitlist'; application: GrowerApplication }
  | { type: 'completeCoachMarks' }
  | { type: 'chooseRole'; role: Role }
  | { type: 'signIn'; userId: string; phone: string }
  | { type: 'updateProfile'; changes: Partial<Omit<UserProfile, 'id'>> }
  | { type: 'signOut' }
  | { type: 'deleteAccount' }
  | { type: 'saveRestaurant'; restaurant: Restaurant }
  | { type: 'publishRestaurant'; restaurantId: string }
  | { type: 'setAcceptingOrders'; restaurantId: string; accepting: boolean }
  | {
      type: 'addToCart';
      restaurantId: string;
      itemId: string;
      /** Portions still available today; adding stops here. */
      max?: number | null;
    }
  | { type: 'setCartQuantity'; itemId: string; quantity: number }
  | { type: 'clearCart' }
  | { type: 'replaceCart'; restaurantId: string; lines: Cart['lines'] }
  | { type: 'placeOrder'; order: Order }
  | { type: 'setOrderStatus'; orderId: string; status: OrderStatus; at?: string }
  | { type: 'setOrderNote'; orderId: string; note: string }
  | { type: 'toggleFavorite'; restaurantId: string }
  | { type: 'addReview'; review: Review }
  | { type: 'reportReview'; reviewId: string }
  | { type: 'markActivitySeen'; at: string }
  | { type: 'rememberSearch'; query: string }
  | { type: 'clearSearches' }
  | { type: 'dismissDietNudge' };

/** Which status changes a kitchen is allowed to make. */
export const NEXT_STATUSES: Record<OrderStatus, OrderStatus[]> = {
  placed: ['accepted', 'declined'],
  accepted: ['preparing'],
  preparing: ['ready'],
  ready: ['completed'],
  completed: [],
  declined: [],
};

export function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'hydrate':
      return { ...state, ...(normalizePersisted(action.state) ?? {}), hydrated: true };

    case 'completeWelcome':
      return { ...state, hasSeenWelcome: true };

    case 'joinGrowerWaitlist':
      return { ...state, growerApplication: action.application };

    case 'completeCoachMarks':
      return { ...state, hasSeenCoachMarks: true };

    case 'chooseRole':
      return state.user
        ? { ...state, pendingRole: action.role, user: { ...state.user, role: action.role } }
        : { ...state, pendingRole: action.role };

    case 'signIn': {
      // Signing in again with the same number keeps the existing profile.
      if (state.user && state.user.phone === action.phone) {
        return { ...state, user: { ...state.user, role: state.pendingRole ?? state.user.role } };
      }
      return {
        ...state,
        cart: EMPTY_CART,
        user: {
          id: action.userId,
          phone: action.phone,
          name: '',
          email: '',
          role: state.pendingRole,
          neighborhood: '',
        },
      };
    }

    case 'updateProfile':
      if (!state.user) return state;
      return { ...state, user: { ...state.user, ...action.changes } };

    case 'deleteAccount': {
      // Removes everything this person created on the device: profile, their
      // kitchen, orders they placed or received, reviews, favorites and searches.
      const userId = state.user?.id;
      if (!userId) return state;
      const mine = new Set(state.restaurants.filter((r) => r.ownerId === userId).map((r) => r.id));
      return {
        ...INITIAL_STATE,
        hydrated: true,
        hasSeenWelcome: true,
        hasSeenCoachMarks: state.hasSeenCoachMarks,
        restaurants: state.restaurants.filter((r) => !mine.has(r.id)),
        orders: state.orders.filter((o) => o.customerId !== userId && !mine.has(o.restaurantId)),
        reviews: state.reviews.filter((r) => r.customerId !== userId && !mine.has(r.restaurantId)),
      };
    }

    case 'signOut':
      return { ...state, user: null, pendingRole: null, cart: EMPTY_CART };

    case 'saveRestaurant': {
      const exists = state.restaurants.some((r) => r.id === action.restaurant.id);
      return {
        ...state,
        restaurants: exists
          ? state.restaurants.map((r) => (r.id === action.restaurant.id ? action.restaurant : r))
          : [...state.restaurants, action.restaurant],
      };
    }

    case 'publishRestaurant':
      return {
        ...state,
        restaurants: state.restaurants.map((r) =>
          r.id === action.restaurantId
            ? { ...r, status: 'live', createdAt: new Date().toISOString() }
            : r,
        ),
      };

    case 'setAcceptingOrders':
      return {
        ...state,
        restaurants: state.restaurants.map((r) =>
          r.id === action.restaurantId ? { ...r, acceptingOrders: action.accepting } : r,
        ),
      };

    case 'addToCart': {
      // A cart holds food from one kitchen at a time; adding from another starts over.
      const sameKitchen = state.cart.restaurantId === action.restaurantId;
      const lines = sameKitchen ? state.cart.lines : [];
      const existing = lines.find((l) => l.itemId === action.itemId);
      const max = action.max ?? Infinity;
      if ((existing?.quantity ?? 0) >= max) return state;
      return {
        ...state,
        cart: {
          restaurantId: action.restaurantId,
          lines: existing
            ? lines.map((l) =>
                l.itemId === action.itemId ? { ...l, quantity: l.quantity + 1 } : l,
              )
            : [...lines, { itemId: action.itemId, quantity: 1 }],
        },
      };
    }

    case 'setCartQuantity': {
      const lines =
        action.quantity <= 0
          ? state.cart.lines.filter((l) => l.itemId !== action.itemId)
          : state.cart.lines.map((l) =>
              l.itemId === action.itemId ? { ...l, quantity: action.quantity } : l,
            );
      return {
        ...state,
        cart: lines.length ? { ...state.cart, lines } : EMPTY_CART,
      };
    }

    case 'clearCart':
      return { ...state, cart: EMPTY_CART };

    case 'replaceCart': {
      const lines = action.lines.filter((l) => l.quantity > 0);
      return { ...state, cart: lines.length ? { restaurantId: action.restaurantId, lines } : EMPTY_CART };
    }

    case 'placeOrder':
      return { ...state, orders: [action.order, ...state.orders], cart: EMPTY_CART };

    case 'setOrderStatus':
      return {
        ...state,
        orders: state.orders.map((o) =>
          o.id === action.orderId && NEXT_STATUSES[o.status].includes(action.status)
            ? {
                ...o,
                status: action.status,
                statusHistory: [
                  ...o.statusHistory,
                  { status: action.status, at: action.at ?? new Date().toISOString() },
                ],
              }
            : o,
        ),
      };

    case 'setOrderNote':
      return {
        ...state,
        orders: state.orders.map((o) =>
          o.id === action.orderId ? { ...o, chefNote: action.note.trim().slice(0, 280) } : o,
        ),
      };

    case 'toggleFavorite': {
      const ids = state.favoriteRestaurantIds;
      return {
        ...state,
        favoriteRestaurantIds: ids.includes(action.restaurantId)
          ? ids.filter((id) => id !== action.restaurantId)
          : [...ids, action.restaurantId],
      };
    }

    case 'rememberSearch': {
      const q = action.query.trim().replace(/\s+/g, ' ');
      if (q.length < 2) return state;
      const rest = state.recentSearches.filter((r) => r.toLowerCase() !== q.toLowerCase());
      return { ...state, recentSearches: [q, ...rest].slice(0, 6) };
    }

    case 'dismissDietNudge':
      return { ...state, dietNudgeDismissed: true };

    case 'clearSearches':
      return { ...state, recentSearches: [] };

    case 'reportReview':
      if (state.reportedReviewIds.includes(action.reviewId)) return state;
      return { ...state, reportedReviewIds: [...state.reportedReviewIds, action.reviewId] };

    case 'markActivitySeen':
      return { ...state, activitySeenAt: action.at };

    case 'addReview': {
      // One review per order, only for completed orders by the person who placed them.
      const order = state.orders.find((o) => o.id === action.review.orderId);
      if (!order || order.status !== 'completed' || order.customerId !== action.review.customerId) return state;
      if (state.reviews.some((r) => r.orderId === order.id)) return state;
      const stars = Math.min(5, Math.max(1, Math.round(action.review.stars)));
      return {
        ...state,
        reviews: [
          { ...action.review, stars, restaurantId: order.restaurantId, text: action.review.text.trim().slice(0, 500) },
          ...state.reviews,
        ],
      };
    }

    default:
      return state;
  }
}

export function toPersisted(state: AppState): PersistedState {
  const { hydrated: _hydrated, ...rest } = state;
  return rest;
}

/**
 * The signed-in chef's kitchen exactly as stored. Edits must start from this,
 * not from the copy shown on screen, which has device reviews blended into its
 * rating (saving that copy would count those reviews twice).
 */
export function storedKitchen(state: Pick<AppState, 'restaurants' | 'user'>): Restaurant | undefined {
  const userId = state.user?.id;
  return userId ? state.restaurants.find((r) => r.ownerId === userId) : undefined;
}
