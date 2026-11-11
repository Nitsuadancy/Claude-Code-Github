import type { SharedStep } from '@/lib/launch';
import { canCustomerCancel, isActive } from '@/lib/orders';
import { canSendHelp, helpTopicsFor, HELP_NOTE_MAX } from '@/lib/order-extras';
import { canPostOrderUpdate, ORDER_UPDATE_MAX } from '@/lib/order-updates';
import { chatState, cleanMessage, isBlockedBetween, kitchenParticipantId, readKey, sideFor } from '@/lib/order-chat';
import { isReadyToOpen } from '@/lib/setup';
import { normalizePersisted } from '@/lib/migrate';
import { hasPro, startSubscription } from '@/lib/pro';
import { canSendAlert, cleanAlert } from '@/lib/alerts';
import { DROP_TITLE_MAX } from '@/lib/drops';
import { addFeeCredit, kitchenForCode, referralCodeOf } from '@/lib/referrals';
import { checkCodeDraft, codeUses, normalizeCode } from '@/lib/discounts';
import {
  canAcceptQuote,
  canQuote,
  CUSTOM_DETAILS_MAX,
  CUSTOM_NOTE_MAX,
  MIN_QUOTE_CENTS,
  orderFromQuote,
} from '@/lib/custom-orders';
import { SAMPLE_RESTAURANTS as SAMPLE_KITCHENS } from '@/data/sample-restaurants';
import type {
  Block,
  Cart,
  CustomQuote,
  CustomRequest,
  DiscountCode,
  Drop,
  KitchenAlert,
  GrowerApplication,
  Order,
  OrderIssueKind,
  OrderMessage,
  OrderUpdate,
  OrderStatus,
  ProPlan,
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
  /** Sharing a new cook has done, for the "Get your first order" checklist. */
  sharedSteps: SharedStep[];
  /** When this cook asked to hear about Manna Pro. Kept on the device until billing exists. */
  proInterestAt: string | null;
  /** Order chat messages between customers and kitchens. */
  messages: OrderMessage[];
  /** When each person last opened each order's chat, keyed by `readKey(orderId, userId)`. */
  chatReadAt: Record<string, string>;
  /** Messages this person reported. Hidden for them and sent to Manna's team to check. */
  reportedMessageIds: string[];
  /** Who has blocked whom. A block stops the chat both ways. */
  blocks: Block[];
  /** Alerts Pro kitchens sent to the people who saved them. */
  alerts: KitchenAlert[];
  /** Custom order requests between customers and Pro kitchens. */
  customRequests: CustomRequest[];
  /** ZIPs this person asked to hear about when kitchens open there. */
  areaWaitlist: { zip: string; at: string }[];
  /** Kitchens loaded from the server (nearby, saved and ordered from). Empty without a backend. */
  serverKitchens: Restaurant[];
}

/** What a sync from the server replaces; anything left out stays as it is. */
export interface ServerSnapshot {
  profile?: UserProfile;
  myKitchen?: Restaurant | null;
  serverKitchens?: Restaurant[];
  orders?: Order[];
  messages?: OrderMessage[];
  favoriteRestaurantIds?: string[];
  alerts?: KitchenAlert[];
  customRequests?: CustomRequest[];
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
  sharedSteps: [],
  proInterestAt: null,
  messages: [],
  chatReadAt: {},
  reportedMessageIds: [],
  blocks: [],
  alerts: [],
  customRequests: [],
  areaWaitlist: [],
  serverKitchens: [],
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
      /** Adding from a drop: the cart is for that drop's pickup day. */
      dropId?: string;
    }
  | { type: 'setCartQuantity'; itemId: string; quantity: number }
  | { type: 'clearCart' }
  | { type: 'replaceCart'; restaurantId: string; lines: Cart['lines'] }
  | { type: 'placeOrder'; order: Order }
  | { type: 'setOrderStatus'; orderId: string; status: OrderStatus; at?: string }
  | { type: 'setOrderNote'; orderId: string; note: string }
  | { type: 'postOrderUpdate'; orderId: string; update: OrderUpdate }
  | { type: 'cancelOrder'; orderId: string; customerId: string; at?: string }
  | { type: 'markArrived'; orderId: string; customerId: string; at?: string }
  | {
      type: 'sendMessage';
      orderId: string;
      senderId: string;
      /** The kitchen's participant id (see kitchenParticipantId), so either side can be checked. */
      kitchenId: string;
      text: string;
      id: string;
      at?: string;
    }
  | { type: 'markChatRead'; orderId: string; userId: string; at?: string }
  | { type: 'reportMessage'; messageId: string }
  | { type: 'blockUser'; blockerId: string; blockedId: string; at?: string }
  | { type: 'unblockUser'; blockerId: string; blockedId: string }
  | { type: 'reportOrderIssue'; orderId: string; customerId: string; kind: OrderIssueKind; note: string; at?: string }
  | { type: 'toggleFavorite'; restaurantId: string }
  | { type: 'addReview'; review: Review }
  | { type: 'reportReview'; reviewId: string }
  | { type: 'markShared'; step: SharedStep }
  | { type: 'joinProWaitlist'; at: string }
  | { type: 'startPro'; restaurantId: string; plan: ProPlan; at: string }
  | { type: 'cancelPro'; restaurantId: string; at: string }
  | { type: 'resumePro'; restaurantId: string }
  | { type: 'sendAlert'; alert: KitchenAlert }
  | { type: 'joinAreaWaitlist'; zip: string; at: string }
  | { type: 'syncFromServer'; snapshot: ServerSnapshot }
  | { type: 'saveDrop'; restaurantId: string; drop: Drop }
  | { type: 'closeDrop'; restaurantId: string; dropId: string; at: string }
  | { type: 'deleteDrop'; restaurantId: string; dropId: string }
  | { type: 'saveDiscountCode'; restaurantId: string; code: DiscountCode }
  | { type: 'removeDiscountCode'; restaurantId: string; codeId: string }
  | { type: 'requestCustom'; request: CustomRequest }
  | { type: 'quoteCustom'; requestId: string; quote: CustomQuote }
  | { type: 'declineCustom'; requestId: string; note: string; at: string }
  | { type: 'withdrawCustom'; requestId: string; customerId: string }
  | { type: 'acceptQuote'; requestId: string; customerId: string; orderId: string; at: string }
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
  cancelled: [],
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
        // Chats go with the orders they belong to; anything else this person sent goes too.
        messages: state.messages.filter(
          (m) =>
            m.senderId !== userId &&
            state.orders.some((o) => o.id === m.orderId && o.customerId !== userId && !mine.has(o.restaurantId)),
        ),
        blocks: state.blocks.filter((b) => b.blockerId !== userId && b.blockedId !== userId),
        alerts: state.alerts.filter((a) => !mine.has(a.restaurantId)),
        customRequests: state.customRequests.filter((c) => c.customerId !== userId && !mine.has(c.restaurantId)),
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

    case 'publishRestaurant': {
      const opening = state.restaurants.find((r) => r.id === action.restaurantId);
      if (!opening || !isReadyToOpen(opening)) return state;
      const now = new Date();
      const firstOpen = opening.status !== 'live';
      // An invite counts once, when the invited kitchen first opens, and never for the cook's own code.
      const inviter =
        firstOpen && opening.referredBy
          ? kitchenForCode([...state.restaurants, ...SAMPLE_KITCHENS], opening.referredBy)
          : undefined;
      const validInvite = !!inviter && inviter.id !== opening.id && inviter.ownerId !== opening.ownerId;
      return {
        ...state,
        restaurants: state.restaurants.map((r) => {
          if (r.id === opening.id) {
            return {
              ...r,
              status: 'live',
              createdAt: now.toISOString(),
              referralCode: referralCodeOf(r),
              ...(validInvite ? { feeCreditUntil: addFeeCredit(r.feeCreditUntil, now) } : {}),
              ...(opening.referredBy && !validInvite && firstOpen ? { referredBy: undefined } : {}),
            };
          }
          // The inviting kitchen's month, when it's on this device. On the server, approval credits it.
          if (validInvite && r.id === inviter!.id) return { ...r, feeCreditUntil: addFeeCredit(r.feeCreditUntil, now) };
          return r;
        }),
      };
    }

    case 'setAcceptingOrders':
      return {
        ...state,
        restaurants: state.restaurants.map((r) =>
          r.id === action.restaurantId ? { ...r, acceptingOrders: action.accepting } : r,
        ),
      };

    case 'addToCart': {
      // A cart holds food from one kitchen at a time, and from one drop or the
      // everyday menu; adding from somewhere else starts over.
      const sameKitchen =
        state.cart.restaurantId === action.restaurantId && (state.cart.dropId ?? null) === (action.dropId ?? null);
      const lines = sameKitchen ? state.cart.lines : [];
      const existing = lines.find((l) => l.itemId === action.itemId);
      const max = action.max ?? Infinity;
      if ((existing?.quantity ?? 0) >= max) return state;
      return {
        ...state,
        cart: {
          restaurantId: action.restaurantId,
          ...(action.dropId ? { dropId: action.dropId } : {}),
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

    case 'markArrived':
      return {
        ...state,
        orders: state.orders.map((o) =>
          o.id === action.orderId && o.customerId === action.customerId && !o.arrivedAt && isActive(o.status) && o.status !== 'placed'
            ? { ...o, arrivedAt: action.at ?? new Date().toISOString() }
            : o,
        ),
      };

    case 'sendMessage': {
      const order = state.orders.find((o) => o.id === action.orderId);
      if (!order) return state;
      const at = action.at ?? new Date().toISOString();
      // A kitchen made on this device must be messaged as its real owner.
      const stored = state.restaurants.find((r) => r.id === order.restaurantId);
      if (stored && kitchenParticipantId(stored) !== action.kitchenId) return state;
      const side = sideFor(order, action.senderId, action.kitchenId);
      const text = cleanMessage(action.text);
      const other = side === 'customer' ? action.kitchenId : order.customerId;
      if (
        !side ||
        !text ||
        chatState(order, new Date(at)) !== 'open' ||
        isBlockedBetween(state.blocks, action.senderId, other) ||
        state.messages.some((m) => m.id === action.id)
      ) {
        return state;
      }
      return {
        ...state,
        messages: [...state.messages, { id: action.id, orderId: order.id, senderId: action.senderId, side, text, at }],
        // Sending counts as reading everything before it.
        chatReadAt: { ...state.chatReadAt, [readKey(order.id, action.senderId)]: at },
      };
    }

    case 'markChatRead':
      return {
        ...state,
        chatReadAt: { ...state.chatReadAt, [readKey(action.orderId, action.userId)]: action.at ?? new Date().toISOString() },
      };

    case 'reportMessage':
      if (state.reportedMessageIds.includes(action.messageId)) return state;
      return { ...state, reportedMessageIds: [...state.reportedMessageIds, action.messageId] };

    case 'blockUser':
      if (
        action.blockerId === action.blockedId ||
        state.blocks.some((b) => b.blockerId === action.blockerId && b.blockedId === action.blockedId)
      ) {
        return state;
      }
      return {
        ...state,
        blocks: [...state.blocks, { blockerId: action.blockerId, blockedId: action.blockedId, at: action.at ?? new Date().toISOString() }],
      };

    case 'unblockUser':
      return {
        ...state,
        blocks: state.blocks.filter((b) => !(b.blockerId === action.blockerId && b.blockedId === action.blockedId)),
      };

    case 'reportOrderIssue': {
      const note = action.note.trim().slice(0, HELP_NOTE_MAX);
      return {
        ...state,
        orders: state.orders.map((o) =>
          o.id === action.orderId &&
          o.customerId === action.customerId &&
          !o.issue &&
          canSendHelp(action.kind, note) &&
          helpTopicsFor(o.status).some((t) => t.kind === action.kind)
            ? { ...o, issue: { kind: action.kind, note, at: action.at ?? new Date().toISOString() } }
            : o,
        ),
      };
    }

    case 'cancelOrder':
      return {
        ...state,
        orders: state.orders.map((o) =>
          o.id === action.orderId && o.customerId === action.customerId && canCustomerCancel(o.status)
            ? {
                ...o,
                status: 'cancelled',
                statusHistory: [...o.statusHistory, { status: 'cancelled', at: action.at ?? new Date().toISOString() }],
              }
            : o,
        ),
      };

    case 'postOrderUpdate': {
      const update = {
        ...action.update,
        text: action.update.text.trim().slice(0, ORDER_UPDATE_MAX),
      };
      return {
        ...state,
        orders: state.orders.map((o) =>
          o.id === action.orderId && canPostOrderUpdate(o, update)
            ? { ...o, updates: [...(o.updates ?? []), update] }
            : o,
        ),
      };
    }

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

    case 'joinProWaitlist':
      return state.proInterestAt ? state : { ...state, proInterestAt: action.at };

    case 'startPro':
      return updateKitchen(state, action.restaurantId, (r) => ({
        ...r,
        pro: startSubscription(r, action.plan, new Date(action.at)),
      }));

    case 'cancelPro':
      return updateKitchen(state, action.restaurantId, (r) =>
        r.pro && !r.pro.canceledAt ? { ...r, pro: { ...r.pro, canceledAt: action.at } } : r,
      );

    case 'sendAlert': {
      const { alert } = action;
      const kitchen = state.restaurants.find((r) => r.id === alert.restaurantId);
      const at = new Date(alert.at);
      if (!kitchen || !hasPro(kitchen, at) || !canSendAlert(state.alerts, alert.restaurantId, alert.text, at)) return state;
      return { ...state, alerts: [...state.alerts, { ...alert, text: cleanAlert(alert.text) }] };
    }

    case 'saveDrop': {
      const kitchen = state.restaurants.find((r) => r.id === action.restaurantId);
      if (!kitchen || !hasPro(kitchen, new Date(action.drop.createdAt))) return state;
      const drop = { ...action.drop, title: action.drop.title.trim().slice(0, DROP_TITLE_MAX) };
      return updateKitchen(state, action.restaurantId, (r) => {
        const drops = r.drops ?? [];
        return {
          ...r,
          drops: drops.some((d) => d.id === drop.id) ? drops.map((d) => (d.id === drop.id ? drop : d)) : [...drops, drop],
        };
      });
    }

    case 'closeDrop':
      return updateKitchen(state, action.restaurantId, (r) => ({
        ...r,
        drops: (r.drops ?? []).map((d) =>
          d.id === action.dropId && d.closesAt > action.at ? { ...d, closesAt: action.at } : d,
        ),
      }));

    case 'deleteDrop':
      // A drop with orders stays, so those orders keep their pickup details; close it instead.
      if (state.orders.some((o) => o.dropId === action.dropId)) return state;
      return updateKitchen(state, action.restaurantId, (r) => ({
        ...r,
        drops: (r.drops ?? []).filter((d) => d.id !== action.dropId),
      }));

    case 'saveDiscountCode': {
      const kitchen = state.restaurants.find((r) => r.id === action.restaurantId);
      const codes = kitchen?.discountCodes ?? [];
      const code = { ...action.code, code: normalizeCode(action.code.code) };
      if (!kitchen || !hasPro(kitchen, new Date(code.createdAt)) || checkCodeDraft(code, codes, code.id)) return state;
      return updateKitchen(state, action.restaurantId, (r) => ({
        ...r,
        discountCodes: codes.some((c) => c.id === code.id) ? codes.map((c) => (c.id === code.id ? code : c)) : [...codes, code],
      }));
    }

    case 'removeDiscountCode':
      // A code that's been used is paused instead, so past orders keep their record.
      return updateKitchen(state, action.restaurantId, (r) => {
        const target = r.discountCodes?.find((c) => c.id === action.codeId);
        if (!target) return r;
        const used = codeUses(state.orders, r.id, target.code) > 0;
        return {
          ...r,
          discountCodes: used
            ? (r.discountCodes ?? []).map((c) => (c.id === action.codeId ? { ...c, paused: true } : c))
            : (r.discountCodes ?? []).filter((c) => c.id !== action.codeId),
        };
      });

    case 'requestCustom': {
      const { request } = action;
      if (state.customRequests.some((r) => r.id === request.id)) return state;
      return {
        ...state,
        customRequests: [
          ...state.customRequests,
          {
            ...request,
            details: request.details.trim().slice(0, CUSTOM_DETAILS_MAX),
            status: 'open',
            quote: undefined,
            orderId: undefined,
          },
        ],
      };
    }

    case 'quoteCustom':
      return updateRequest(state, action.requestId, (r) =>
        canQuote(r) && action.quote.priceCents >= MIN_QUOTE_CENTS
          ? { ...r, status: 'quoted', quote: { ...action.quote, note: action.quote.note.trim().slice(0, CUSTOM_NOTE_MAX) } }
          : r,
      );

    case 'declineCustom':
      return updateRequest(state, action.requestId, (r) =>
        canQuote(r) ? { ...r, status: 'declined', declineNote: action.note.trim().slice(0, CUSTOM_NOTE_MAX) || undefined } : r,
      );

    case 'withdrawCustom':
      return updateRequest(state, action.requestId, (r) =>
        r.customerId === action.customerId && canQuote(r) ? { ...r, status: 'withdrawn' } : r,
      );

    case 'acceptQuote': {
      const request = state.customRequests.find((r) => r.id === action.requestId);
      const kitchen = state.restaurants.find((r) => r.id === request?.restaurantId)
        ?? SAMPLE_KITCHENS.find((r) => r.id === request?.restaurantId);
      const now = new Date(action.at);
      if (!request || !kitchen || request.customerId !== action.customerId || !canAcceptQuote(request, now)) return state;
      const order = orderFromQuote(request, request.quote!, kitchen, action.orderId, now);
      return {
        ...updateRequest(state, request.id, (r) => ({ ...r, status: 'accepted', orderId: order.id })),
        orders: [...state.orders, order],
      };
    }

    case 'syncFromServer': {
      const s = action.snapshot;
      const next: AppState = { ...state };
      if (s.profile) {
        // The server's profile wins, except a role chosen on this phone before it was saved.
        next.user = { ...s.profile, role: s.profile.role ?? state.pendingRole ?? state.user?.role ?? null };
      }
      if (s.myKitchen !== undefined) next.restaurants = s.myKitchen ? [s.myKitchen] : [];
      if (s.serverKitchens) next.serverKitchens = s.serverKitchens;
      if (s.orders) next.orders = s.orders;
      if (s.messages) next.messages = s.messages;
      if (s.favoriteRestaurantIds) next.favoriteRestaurantIds = s.favoriteRestaurantIds;
      if (s.alerts) next.alerts = s.alerts;
      if (s.customRequests) next.customRequests = s.customRequests;
      return next;
    }

    case 'joinAreaWaitlist':
      if (!/^\d{5}$/.test(action.zip) || state.areaWaitlist.some((w) => w.zip === action.zip)) return state;
      return { ...state, areaWaitlist: [...state.areaWaitlist, { zip: action.zip, at: action.at }] };

    case 'resumePro':
      return updateKitchen(state, action.restaurantId, (r) => {
        if (!r.pro?.canceledAt) return r;
        const { canceledAt: _canceled, ...pro } = r.pro;
        return { ...r, pro };
      });

    case 'markShared':
      if (state.sharedSteps.includes(action.step)) return state;
      return { ...state, sharedSteps: [...state.sharedSteps, action.step] };

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

/** Applies a change to one custom request. */
function updateRequest(state: AppState, id: string, change: (r: CustomRequest) => CustomRequest): AppState {
  return { ...state, customRequests: state.customRequests.map((r) => (r.id === id ? change(r) : r)) };
}

/** Applies a change to one kitchen stored on this device. */
function updateKitchen(state: AppState, restaurantId: string, change: (r: Restaurant) => Restaurant): AppState {
  if (!state.restaurants.some((r) => r.id === restaurantId)) return state;
  return { ...state, restaurants: state.restaurants.map((r) => (r.id === restaurantId ? change(r) : r)) };
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
