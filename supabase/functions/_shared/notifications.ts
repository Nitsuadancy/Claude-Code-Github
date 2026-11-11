/**
 * Who hears about what. Plain TypeScript with no Deno APIs, so the app's
 * tests check it too (src/__tests__/notifications.test.ts).
 *
 * The notify function gets every new or changed row from Supabase's database
 * webhooks and asks notesFor() what to send. Each note names one person, or
 * everyone who saved a kitchen, and the screen a tap opens.
 */

type Row = Record<string, unknown>;

export interface Change {
  type: 'INSERT' | 'UPDATE' | 'DELETE';
  table: string;
  record: Row | null;
  old_record: Row | null;
}

export interface Context {
  /** Card payments are on: kitchens hear about an order once it's paid. */
  paymentsRequired: boolean;
  /** The kitchen the change is about. */
  kitchen: { id: string; name: string; ownerId: string };
  /** The order, for chat messages and oven updates. */
  order?: { id: string; customerId: string; customerName: string };
}

export interface Note {
  /** A profile id, or everyone who saved the kitchen. */
  to: string | { followersOf: string };
  title: string;
  body: string;
  /** The screen a tap opens. */
  url: string;
}

const str = (v: unknown) => (typeof v === 'string' ? v : '');
const short = (text: string, max = 120) => (text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text);
const KITCHEN_ORDERS = '/chef/dashboard';

function orderNotes(change: Change, ctx: Context): Note[] {
  const o = change.record!;
  const old = change.old_record ?? {};
  const id = str(o.id);
  const customer = str(o.customer_id);
  const who = str(o.customer_name) || 'A customer';
  const kitchen = ctx.kitchen.name;
  const notes: Note[] = [];
  const visibleToKitchen = (row: Row) => !ctx.paymentsRequired || row.payment_status === 'paid';
  const status = str(o.status);
  const oldStatus = change.type === 'INSERT' ? '' : str(old.status);

  // A custom order the kitchen already priced starts accepted: at once, or
  // when its payment goes through (mark_order_paid sets both together).
  if (status === 'accepted' && (change.type === 'INSERT' || (oldStatus === 'placed' && old.payment_status !== o.payment_status))) {
    return [
      { to: ctx.kitchen.ownerId, title: 'Custom order confirmed', body: `${who} accepted your price.`, url: KITCHEN_ORDERS },
      { to: customer, title: `${kitchen} has your order`, body: 'The pickup address is in the app.', url: `/order/${id}` },
    ];
  }

  // The kitchen's new order: when it's placed, or when its payment goes through.
  if (status === 'placed' && visibleToKitchen(o) && (change.type === 'INSERT' || !visibleToKitchen(old))) {
    notes.push({ to: ctx.kitchen.ownerId, title: 'New order', body: `${who} placed an order. Accept it in Manna.`, url: KITCHEN_ORDERS });
  }

  if (status !== oldStatus && change.type === 'UPDATE') {
    switch (status) {
      case 'accepted':
        notes.push({ to: customer, title: `${kitchen} accepted your order`, body: 'The pickup address is in the app. We’ll tell you when it’s ready.', url: `/order/${id}` });
        break;
      case 'preparing':
        notes.push({ to: customer, title: `${kitchen} is making your order`, body: 'Watch for updates from the kitchen.', url: `/order/${id}` });
        break;
      case 'ready':
        notes.push({ to: customer, title: 'Your order is ready', body: `Head to ${kitchen} for pickup. Tap “I’m here” when you arrive.`, url: `/order/${id}` });
        break;
      case 'declined':
        notes.push({
          to: customer,
          title: `${kitchen} can’t take your order`,
          body: o.payment_status === 'paid' || o.payment_status === 'refunded' ? 'Your payment is refunded in full.' : 'You haven’t been charged.',
          url: `/order/${id}`,
        });
        break;
      case 'cancelled':
        if (oldStatus === 'placed' && visibleToKitchen(old)) {
          notes.push({ to: ctx.kitchen.ownerId, title: 'Order cancelled', body: `${who} cancelled their order.`, url: KITCHEN_ORDERS });
        }
        break;
      case 'completed':
        notes.push({ to: customer, title: 'Enjoy!', body: `Rate ${kitchen} once you’ve tried it.`, url: `/order/${id}` });
        break;
    }
  }

  if (!old.arrived_at && o.arrived_at && change.type === 'UPDATE') {
    notes.push({ to: ctx.kitchen.ownerId, title: `${who} is here`, body: 'Bring their order out.', url: KITCHEN_ORDERS });
  }
  return notes;
}

function requestNotes(change: Change, ctx: Context): Note[] {
  const r = change.record!;
  const old = change.old_record ?? {};
  const id = str(r.id);
  const who = str(r.customer_name) || 'A customer';
  if (change.type === 'INSERT') {
    return [
      {
        to: ctx.kitchen.ownerId,
        title: 'New custom order request',
        body: short(`${who}: ${str(r.occasion)} for ${String(r.servings)}`),
        url: `/chef/request/${id}`,
      },
    ];
  }
  if (r.status === old.status) return [];
  switch (r.status) {
    case 'quoted':
      return [{ to: str(r.customer_id), title: `${ctx.kitchen.name} sent a price`, body: short(`For ${str(r.occasion)}. Accept it to order.`), url: `/custom/${id}` }];
    case 'declined':
      return [{ to: str(r.customer_id), title: `${ctx.kitchen.name} can’t take this one`, body: short(str(r.decline_note) || str(r.occasion)), url: `/custom/${id}` }];
    case 'withdrawn':
      return [{ to: ctx.kitchen.ownerId, title: 'Request withdrawn', body: short(`${who} no longer needs ${str(r.occasion)}.`), url: `/chef/request/${id}` }];
    default:
      return [];
  }
}

export function notesFor(change: Change, ctx: Context): Note[] {
  if (!change.record || change.type === 'DELETE') return [];
  const r = change.record;
  switch (change.table) {
    case 'orders':
      return orderNotes(change, ctx);
    case 'order_messages': {
      if (change.type !== 'INSERT' || !ctx.order) return [];
      const fromCustomer = r.sender_id === ctx.order.customerId;
      return [
        {
          to: fromCustomer ? ctx.kitchen.ownerId : ctx.order.customerId,
          title: fromCustomer ? ctx.order.customerName || 'Your customer' : ctx.kitchen.name,
          body: short(str(r.body)),
          url: `/chat/${ctx.order.id}`,
        },
      ];
    }
    case 'order_updates':
      if (change.type !== 'INSERT' || !ctx.order) return [];
      return [
        {
          to: ctx.order.customerId,
          title: `${ctx.kitchen.name} posted an update`,
          body: short(str(r.body)) || 'A new photo of your order.',
          url: `/order/${ctx.order.id}`,
        },
      ];
    case 'kitchen_alerts':
      if (change.type !== 'INSERT') return [];
      return [{ to: { followersOf: ctx.kitchen.id }, title: ctx.kitchen.name, body: short(str(r.body), 140), url: `/restaurant/${ctx.kitchen.id}` }];
    case 'custom_requests':
      return requestNotes(change, ctx);
    default:
      return [];
  }
}

/** Expo's push service takes up to 100 messages a request. */
export function chunk<T>(items: T[], size = 100): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}
