/**
 * Order chat: the customer and the kitchen can message each other about one
 * order, from when the kitchen accepts it until a day after pickup. It's for
 * changes and timing, not a general inbox. Phone numbers stay private.
 */
import type { Block, ChatSide, Order, OrderMessage, Restaurant } from '@/types';

/** The chat stays open this long after the order is picked up, for "I left my bag" moments. */
export const CHAT_CLOSES_HOURS = 24;
/** Longest message, in characters. */
export const MESSAGE_MAX = 500;

export type ChatState = 'not-yet' | 'open' | 'closed';

/** Before the kitchen accepts there's nothing to discuss yet; after a decline or cancel there's nothing left to discuss. */
export function chatState(order: Pick<Order, 'status' | 'statusHistory'>, now: Date): ChatState {
  switch (order.status) {
    case 'placed':
      return 'not-yet';
    case 'declined':
    case 'cancelled':
      return 'closed';
    case 'completed': {
      const done = [...order.statusHistory].reverse().find((h) => h.status === 'completed')?.at;
      if (!done) return 'closed';
      return now.getTime() - new Date(done).getTime() < CHAT_CLOSES_HOURS * 3_600_000 ? 'open' : 'closed';
    }
    default:
      return 'open';
  }
}

/**
 * Who speaks for the kitchen. Kitchens that haven't linked an account
 * (the demo kitchens) still get a stable id, so blocking works the same way.
 */
export function kitchenParticipantId(restaurant: Pick<Restaurant, 'id' | 'ownerId'>): string {
  return restaurant.ownerId ?? `kitchen:${restaurant.id}`;
}

/** Which side this person is on for this order, or null if it isn't theirs. */
export function sideFor(order: Pick<Order, 'customerId'>, userId: string | undefined, kitchenId: string): ChatSide | null {
  if (!userId) return null;
  if (userId === order.customerId) return 'customer';
  if (userId === kitchenId) return 'kitchen';
  return null;
}

/** A block in either direction stops the chat for both people. */
export function isBlockedBetween(blocks: Block[], a: string, b: string): boolean {
  return blocks.some((x) => (x.blockerId === a && x.blockedId === b) || (x.blockerId === b && x.blockedId === a));
}

/** Trims, keeps at most one blank line in a row, and caps the length. */
export function cleanMessage(text: string): string {
  return text
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, MESSAGE_MAX);
}

const OFF_APP_PAYMENT = /\b(venmo|cash ?app|zelle|paypal|apple cash)\b|(^|\s)\$[a-z][a-z0-9_]{2,}/i;

/**
 * True when a message asks to pay outside Manna ("Venmo me", "$susiebakes").
 * The app shows a gentle reminder; it doesn't block the message.
 */
export function mentionsOffAppPayment(text: string): boolean {
  return OFF_APP_PAYMENT.test(text);
}

/** One-tap replies for the moments that come up most, by side and where the order is. */
export function quickReplies(side: ChatSide, status: Order['status']): string[] {
  if (side === 'kitchen') {
    if (status === 'completed') return ['Thank you!', 'Hope you loved it'];
    if (status === 'ready') return ['Ready when you are', 'Coming out now', 'It’s in the cooler'];
    return ['Running about 15 minutes behind', 'Can I swap one item?', 'Ready a little early'];
  }
  if (status === 'completed') return ['Thank you!', 'I think I left something'];
  if (status === 'ready') return ['On my way', 'I’m out front', 'Running 5 minutes late'];
  return ['Running 15 minutes late', 'Can I pick up a bit earlier?', 'Can I change my order?'];
}

/** Messages to show this person: their chat, minus ones they reported or from someone they blocked. */
export function visibleMessages(
  messages: OrderMessage[],
  orderId: string,
  viewerId: string,
  reportedIds: string[],
  blocks: Block[],
): OrderMessage[] {
  return messages
    .filter(
      (m) =>
        m.orderId === orderId &&
        !reportedIds.includes(m.id) &&
        !blocks.some((b) => b.blockerId === viewerId && b.blockedId === m.senderId),
    )
    .sort((a, b) => a.at.localeCompare(b.at));
}

/** Messages from the other side that arrived after this person last opened the chat. */
export function unreadCount(
  messages: OrderMessage[],
  orderId: string,
  viewerId: string,
  readAt: string | undefined,
  reportedIds: string[] = [],
  blocks: Block[] = [],
): number {
  return visibleMessages(messages, orderId, viewerId, reportedIds, blocks).filter(
    (m) => m.senderId !== viewerId && (!readAt || m.at > readAt),
  ).length;
}

/** Key for the "last read" time of one person in one order's chat. */
export function readKey(orderId: string, userId: string): string {
  return `${orderId}:${userId}`;
}

/** The divider above a day's messages: "Today", "Yesterday" or "Sat, Nov 7". */
export function messageDayLabel(iso: string, now: Date): string {
  const d = new Date(iso);
  const day = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((day(now) - day(d)) / 86_400_000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}
