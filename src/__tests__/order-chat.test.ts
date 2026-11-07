import { describe, expect, it } from '@jest/globals';

import {
  chatState,
  cleanMessage,
  isBlockedBetween,
  kitchenParticipantId,
  MESSAGE_MAX,
  mentionsOffAppPayment,
  quickReplies,
  readKey,
  sideFor,
  unreadCount,
  visibleMessages,
} from '@/lib/order-chat';
import { type AppState, INITIAL_STATE, reducer } from '@/state/reducer';
import type { Order, OrderMessage, Restaurant } from '@/types';

const at = (h: number, m = 0) => new Date(Date.UTC(2026, 10, 7, h, m)).toISOString();

function order(partial: Partial<Order> = {}): Order {
  return {
    id: 'o1',
    customerId: 'c1',
    customerName: 'Maya',
    restaurantId: 'k1',
    restaurantName: 'Susie’s Sweets',
    lines: [{ itemId: 'a', name: 'Pound Cake', priceCents: 1800, quantity: 1 }],
    subtotalCents: 1800,
    movementFeeCents: 144,
    totalCents: 1944,
    pickupAddress: '5 Willow Way',
    status: 'accepted',
    statusHistory: [
      { status: 'placed', at: at(14) },
      { status: 'accepted', at: at(14, 5) },
    ],
    chefNote: '',
    customerNote: '',
    createdAt: at(14),
    estimatedReadyAt: at(15),
    scheduledFor: null,
    ...partial,
  };
}

const msg = (id: string, senderId: string, minute: number): OrderMessage => ({
  id,
  orderId: 'o1',
  senderId,
  side: senderId === 'c1' ? 'customer' : 'kitchen',
  text: id,
  at: at(15, minute),
});

describe('when the chat is open', () => {
  it('opens when the kitchen accepts and closes a day after pickup', () => {
    const now = new Date(at(16));
    expect(chatState(order({ status: 'placed' }), now)).toBe('not-yet');
    expect(chatState(order(), now)).toBe('open');
    expect(chatState(order({ status: 'ready' }), now)).toBe('open');
    expect(chatState(order({ status: 'declined' }), now)).toBe('closed');
    expect(chatState(order({ status: 'cancelled' }), now)).toBe('closed');
    const done = order({ status: 'completed', statusHistory: [{ status: 'completed', at: at(15) }] });
    expect(chatState(done, new Date(Date.parse(at(15)) + 23 * 3_600_000))).toBe('open');
    expect(chatState(done, new Date(Date.parse(at(15)) + 25 * 3_600_000))).toBe('closed');
  });
});

describe('who is who', () => {
  it('gives demo kitchens without an account a stable id', () => {
    expect(kitchenParticipantId({ id: 'k1', ownerId: 'u9' } as Restaurant)).toBe('u9');
    expect(kitchenParticipantId({ id: 'k1' } as Restaurant)).toBe('kitchen:k1');
  });

  it('knows each side and nobody else', () => {
    expect(sideFor(order(), 'c1', 'u9')).toBe('customer');
    expect(sideFor(order(), 'u9', 'u9')).toBe('kitchen');
    expect(sideFor(order(), 'x', 'u9')).toBeNull();
    expect(sideFor(order(), undefined, 'u9')).toBeNull();
  });
});

describe('messages', () => {
  it('tidies text and caps its length', () => {
    expect(cleanMessage('  hi  \r\n\n\n\nthere ')).toBe('hi\n\nthere');
    expect(cleanMessage('x'.repeat(MESSAGE_MAX + 20))).toHaveLength(MESSAGE_MAX);
  });

  it('spots requests to pay outside Manna without catching prices', () => {
    expect(mentionsOffAppPayment('Just Venmo me')).toBe(true);
    expect(mentionsOffAppPayment('cash app is fine')).toBe(true);
    expect(mentionsOffAppPayment('send to $susiebakes')).toBe(true);
    expect(mentionsOffAppPayment('It’s $5 more for the big one')).toBe(false);
    expect(mentionsOffAppPayment('Running late, sorry!')).toBe(false);
  });

  it('suggests replies that fit the side and the moment', () => {
    expect(quickReplies('customer', 'ready')).toContain('I’m out front');
    expect(quickReplies('kitchen', 'ready')).toContain('Ready when you are');
    expect(quickReplies('kitchen', 'accepted')).toContain('Can I swap one item?');
  });

  it('counts unread messages from the other side only, and hides reported or blocked ones', () => {
    const all = [msg('a', 'u9', 1), msg('b', 'c1', 2), msg('c', 'u9', 3), msg('d', 'u9', 4)];
    expect(unreadCount(all, 'o1', 'c1', undefined)).toBe(3);
    expect(unreadCount(all, 'o1', 'c1', at(15, 2))).toBe(2);
    expect(unreadCount(all, 'o1', 'c1', at(15, 2), ['d'])).toBe(1);
    expect(visibleMessages(all, 'o1', 'c1', [], [{ blockerId: 'c1', blockedId: 'u9', at: at(15) }]).map((m) => m.id)).toEqual(['b']);
  });

  it('treats a block in either direction as a block', () => {
    const blocks = [{ blockerId: 'u9', blockedId: 'c1', at: at(15) }];
    expect(isBlockedBetween(blocks, 'c1', 'u9')).toBe(true);
    expect(isBlockedBetween(blocks, 'u9', 'c1')).toBe(true);
    expect(isBlockedBetween(blocks, 'c1', 'u8')).toBe(false);
  });
});

describe('sending messages', () => {
  const kitchen = { id: 'k1', ownerId: 'u9' } as Restaurant;
  const base = (o: Order): AppState => ({ ...INITIAL_STATE, orders: [o], restaurants: [kitchen] });
  const send = (s: AppState, senderId: string, text: string, id: string, when = at(15)) =>
    reducer(s, { type: 'sendMessage', orderId: 'o1', senderId, kitchenId: 'u9', text, id, at: when });

  it('lets both sides talk once the order is accepted, and marks the sender as caught up', () => {
    let s = send(base(order()), 'c1', '  Running 10 minutes late  ', 'm1');
    s = send(s, 'u9', 'No problem!', 'm2', at(15, 1));
    expect(s.messages.map((m) => [m.side, m.text])).toEqual([
      ['customer', 'Running 10 minutes late'],
      ['kitchen', 'No problem!'],
    ]);
    expect(s.chatReadAt[readKey('o1', 'u9')]).toBe(at(15, 1));
    expect(send(s, 'c1', 'again', 'm1').messages).toHaveLength(2); // same id isn't sent twice
  });

  it('refuses strangers, empty messages, a chat that isn’t open, a wrong kitchen id and blocked people', () => {
    expect(send(base(order()), 'x', 'hi', 'm').messages).toHaveLength(0);
    expect(send(base(order()), 'c1', '   ', 'm').messages).toHaveLength(0);
    expect(send(base(order({ status: 'placed' })), 'c1', 'hi', 'm').messages).toHaveLength(0);
    const wrong = reducer(base(order()), { type: 'sendMessage', orderId: 'o1', senderId: 'imposter', kitchenId: 'imposter', text: 'hi', id: 'm', at: at(15) });
    expect(wrong.messages).toHaveLength(0);
    let s = reducer(base(order()), { type: 'blockUser', blockerId: 'u9', blockedId: 'c1', at: at(15) });
    expect(send(s, 'c1', 'hi', 'm').messages).toHaveLength(0);
    expect(send(s, 'u9', 'hi', 'm').messages).toHaveLength(0);
    s = reducer(s, { type: 'unblockUser', blockerId: 'u9', blockedId: 'c1' });
    expect(send(s, 'c1', 'hi', 'm').messages).toHaveLength(1);
  });

  it('reports a message once, and deleting an account takes its chats with it', () => {
    let s = send(base(order()), 'c1', 'hi', 'm1');
    s = reducer(s, { type: 'reportMessage', messageId: 'm1' });
    s = reducer(s, { type: 'reportMessage', messageId: 'm1' });
    expect(s.reportedMessageIds).toEqual(['m1']);
    s = { ...s, user: { id: 'c1', name: 'Maya', email: '', phone: '', role: 'foodie', neighborhood: '' } as AppState['user'] };
    s = reducer(s, { type: 'deleteAccount' });
    expect(s.messages).toHaveLength(0);
  });
});
