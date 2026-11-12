/**
 * Push notifications. Supabase's database webhooks call this for new and
 * changed rows in orders, order_messages, order_updates, kitchen_alerts,
 * custom_requests, restaurants, order_issues, message_reports and
 * review_reports (setup in docs/GO_LIVE.md). It works out who should hear
 * about the change (_shared/notifications.ts), finds their phones and sends
 * through Expo's push service. Phones that no longer exist are forgotten.
 *
 * The webhooks send the header x-manna-secret, matched against the
 * NOTIFY_WEBHOOK_SECRET function secret, so nobody else can send pushes.
 */
import { admin, env } from '../_shared/clients.ts';
import { json } from '../_shared/http.ts';
import { chunk, notesFor, type Change, type Context, type Note } from '../_shared/notifications.ts';

const EXPO_PUSH = 'https://exp.host/--/api/v2/push/send';

async function contextFor(change: Change): Promise<Context | null> {
  const row = change.record ?? {};
  let order: Context['order'];
  let restaurantId = (change.table === 'restaurants' ? row.id : row.restaurant_id) as string | undefined;
  let orderId = row.order_id as string | undefined;
  if (change.table === 'message_reports') {
    const { data } = await admin.from('order_messages').select('order_id').eq('id', row.message_id as string).maybeSingle();
    orderId = data?.order_id;
  }
  if (change.table === 'review_reports') {
    const { data } = await admin.from('reviews').select('restaurant_id').eq('id', row.review_id as string).maybeSingle();
    restaurantId = data?.restaurant_id;
  }
  if (orderId && ['order_messages', 'order_updates', 'order_issues', 'message_reports'].includes(change.table)) {
    const { data } = await admin
      .from('orders')
      .select('id, customer_id, customer_name, restaurant_id')
      .eq('id', orderId)
      .maybeSingle();
    if (!data) return null;
    order = { id: data.id, customerId: data.customer_id, customerName: data.customer_name };
    restaurantId = data.restaurant_id;
  }
  if (!restaurantId) return null;
  const [{ data: kitchen }, { data: settings }] = await Promise.all([
    admin.from('restaurants').select('id, name, owner_id').eq('id', restaurantId).maybeSingle(),
    admin.from('app_settings').select('payments_required').maybeSingle(),
  ]);
  if (!kitchen) return null;
  return {
    paymentsRequired: settings?.payments_required ?? false,
    kitchen: { id: kitchen.id, name: kitchen.name, ownerId: kitchen.owner_id },
    ...(order ? { order } : {}),
  };
}

async function recipients(note: Note): Promise<string[]> {
  if (typeof note.to === 'string') return note.to ? [note.to] : [];
  if ('team' in note.to) {
    const { data } = await admin.from('profiles').select('id').eq('is_admin', true);
    return (data ?? []).map((p) => p.id as string);
  }
  const { data } = await admin.from('favorites').select('customer_id').eq('restaurant_id', note.to.followersOf);
  return (data ?? []).map((f) => f.customer_id as string);
}

type Ticket = { status: 'ok' | 'error'; details?: { error?: string } };

async function send(notes: Note[]): Promise<number> {
  const messages: { to: string; title: string; body: string; data: { url: string }; sound: 'default'; channelId: string }[] = [];
  for (const note of notes) {
    const ids = await recipients(note);
    if (ids.length === 0) continue;
    const { data: tokens } = await admin.from('push_tokens').select('token').in('profile_id', ids);
    for (const { token } of tokens ?? []) {
      messages.push({ to: token, title: note.title, body: note.body, data: { url: note.url }, sound: 'default', channelId: 'orders' });
    }
  }
  const accessToken = Deno.env.get('EXPO_ACCESS_TOKEN');
  for (const batch of chunk(messages)) {
    const res = await fetch(EXPO_PUSH, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      body: JSON.stringify(batch),
    });
    if (!res.ok) throw new Error(`Expo push ${res.status}: ${await res.text()}`);
    const { data: tickets } = (await res.json()) as { data: Ticket[] };
    const gone = batch.filter((_, i) => tickets[i]?.details?.error === 'DeviceNotRegistered').map((m) => m.to);
    if (gone.length) await admin.from('push_tokens').delete().in('token', gone);
  }
  return messages.length;
}

Deno.serve(async (req) => {
  if (req.headers.get('x-manna-secret') !== env('NOTIFY_WEBHOOK_SECRET')) return json({ error: 'Not allowed' }, 401);
  try {
    const change = (await req.json()) as Change;
    const ctx = await contextFor(change);
    if (!ctx) return json({ sent: 0 });
    return json({ sent: await send(notesFor(change, ctx)) });
  } catch (e) {
    console.error(e);
    return json({ error: 'Not sent' }, 500);
  }
});
