import { describe, expect, it, jest } from '@jest/globals';
import { Alert } from 'react-native';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import { SAMPLE_RESTAURANTS } from '@/data/sample-restaurants';
import {
  joinAreaWaitlist,
  loadKitchensNear,
  placeOrder,
  RemoteError,
  saveMyKitchen,
  setFavorite,
  verifyCode,
  type Db,
} from '@/lib/remote/api';
import { contentTypeOf, ensureUploaded, extensionOf, storagePathFromUrl, type Uploader } from '@/lib/remote/uploads';
import { type AppState, INITIAL_STATE, reducer } from '@/state/reducer';
import { makeServerDispatch } from '@/state/server-sync';
import type { Restaurant } from '@/types';

/**
 * A stand-in for the Supabase client: it records every call and answers from
 * `respond`, so these tests check what the app would send without a server.
 */
type Call = { table?: string; rpc?: string; op: string; args: unknown[] };

function fakeDb(respond: (call: Call, chain: Call[]) => { data?: unknown; error?: { message: string } | null }) {
  const calls: Call[][] = [];
  const builder = (first: Call): unknown => {
    const chain: Call[] = [first];
    calls.push(chain);
    const target: Record<string, unknown> = {};
    const proxy: unknown = new Proxy(target, {
      get(_t, prop: string) {
        if (prop === 'then') {
          const res = respond(chain[0], chain);
          return (resolve: (v: unknown) => void) => resolve({ data: res.data ?? null, error: res.error ?? null });
        }
        return (...args: unknown[]) => {
          chain.push({ op: prop, args });
          return proxy;
        };
      },
    });
    return proxy;
  };
  const db = {
    from: (table: string) => builder({ table, op: 'from', args: [] }),
    rpc: (fn: string, args?: unknown) => builder({ rpc: fn, op: 'rpc', args: [args] }),
    auth: {
      verifyOtp: async () => respond({ op: 'verifyOtp', args: [] }, []),
    },
  };
  return { db: db as unknown as Db, calls };
}

const ops = (chain: Call[]) => chain.map((c) => c.op);

describe('uploads', () => {
  it('uploads local files once and keeps everything else', async () => {
    const uploaded: string[] = [];
    const upload: Uploader = async (bucket, path) => {
      uploaded.push(`${bucket}:${path}`);
    };
    const path = await ensureUploaded(upload, 'file:///tmp/cake.PNG', 'public-photos', 'u1/menu');
    expect(path).toMatch(/^u1\/menu\/[0-9a-f-]{36}\.png$/);
    expect(uploaded).toEqual([`public-photos:${path}`]);
    expect(await ensureUploaded(upload, 'demo:pound-cake', 'public-photos', 'u1')).toBe('demo:pound-cake');
    expect(await ensureUploaded(upload, 'u1/kitchen/x.jpg', 'public-photos', 'u1')).toBe('u1/kitchen/x.jpg');
    expect(
      await ensureUploaded(upload, 'https://abc.supabase.co/storage/v1/object/public/public-photos/u1/a%20b.jpg', 'public-photos', 'u1'),
    ).toBe('u1/a b.jpg');
    expect(await ensureUploaded(upload, undefined, 'public-photos', 'u1')).toBeNull();
    expect(uploaded).toHaveLength(1);
    expect(storagePathFromUrl('https://x.supabase.co/storage/v1/object/sign/order-photos/o1/p.jpg?token=t', 'order-photos')).toBe(
      'o1/p.jpg',
    );
    expect(extensionOf('file:///x/clip.MOV')).toBe('mov');
    expect(contentTypeOf('file:///x/id.pdf')).toBe('application/pdf');
  });
});

describe('remote api', () => {
  it('places orders with only ids, quantities, the drop and the code', async () => {
    const { db, calls } = fakeDb(() => ({ data: 'order-1' }));
    const id = await placeOrder(db, {
      restaurantId: 'r1',
      lines: [{ itemId: 'm1', quantity: 2 }],
      customerNote: ' No nuts ',
      scheduledFor: null,
      tipCents: 300,
      dropId: 'd1',
      discountCode: 'HOLIDAY10',
    });
    expect(id).toBe('order-1');
    expect(calls[0][0]).toEqual({
      rpc: 'place_order',
      op: 'rpc',
      args: [
        {
          p_restaurant_id: 'r1',
          p_lines: [{ menu_item_id: 'm1', quantity: 2 }],
          p_customer_note: 'No nuts',
          p_scheduled_for: null,
          p_tip_cents: 300,
          p_drop_id: 'd1',
          p_discount_code: 'HOLIDAY10',
        },
      ],
    });
  });

  it('shows the server’s own message when something is refused', async () => {
    const { db } = fakeDb(() => ({ error: { message: 'This kitchen is closed right now' } }));
    await expect(
      placeOrder(db, { restaurantId: 'r1', lines: [], customerNote: '', scheduledFor: null, tipCents: 0 }),
    ).rejects.toEqual(new RemoteError('This kitchen is closed right now'));
    const bad = fakeDb(() => ({ data: { user: null } }));
    await expect(verifyCode(bad.db, '+14075550100', '123456')).rejects.toBeInstanceOf(RemoteError);
  });

  it('keeps nearby kitchens nearest first', async () => {
    const susie = SAMPLE_RESTAURANTS.find((r) => r.id === 'sample_susies_sweets')!;
    const row = (id: string, name: string) => ({
      id,
      owner_id: 'o',
      name,
      chef_name: 'C',
      chef_bio: '',
      chef_photo_path: null,
      cuisine: 'Bakery',
      categories: [],
      logo_path: null,
      cover_paths: [],
      neighborhood: 'College Park',
      city: 'Orlando',
      state: 'FL',
      zip: '32804',
      timezone: 'America/New_York',
      area_lat: 28.58,
      area_lng: -81.4,
      working_days: [],
      open_time: null,
      close_time: null,
      day_hours: {},
      prep_minutes: 30,
      verified: true,
      founding: false,
      licensed: false,
      law_attested_at: null,
      in_person: [],
      accent: 'champagne',
      tagline: '',
      update_text: '',
      update_posted_at: null,
      update_photo_path: null,
      intro_video_path: null,
      instagram: '',
      order_mode: 'hours',
      bake_days: [],
      skipped_bake_days: [],
      accepting_orders: true,
      has_offer: false,
      status: 'live',
      signature_item_id: null,
      rating_sum: 0,
      rating_count: 0,
      live_since: null,
      pro_plan: null,
      pro_started_at: null,
      pro_billing_starts_at: null,
      pro_canceled_at: null,
      referral_code: null,
      referred_by_code: null,
      fee_credit_until: null,
      created_at: '2026-11-01T00:00:00Z',
      menu_items: [],
      drops: [],
    });
    const { db } = fakeDb((call) => {
      if (call.rpc === 'nearby_kitchens') return { data: [{ restaurant_id: 'b' }, { restaurant_id: 'a' }] };
      if (call.rpc === 'popular_menu_items') return { data: [] };
      return { data: [row('a', 'Far'), row('b', 'Near')] };
    });
    const kitchens = await loadKitchensNear(db, 28.5, -81.4, (p) => p);
    expect(kitchens.map((k) => k.name)).toEqual(['Near', 'Far']);
    expect(susie).toBeDefined();
  });

  it('saves a kitchen: uploads new photos, writes the menu and removes deleted dishes', async () => {
    const uploads: string[] = [];
    const upload: Uploader = async (bucket, path) => {
      uploads.push(`${bucket}:${path}`);
    };
    const { db, calls } = fakeDb(() => ({ data: null }));
    const kitchen: Restaurant = {
      ...SAMPLE_RESTAURANTS[0],
      id: 'r1',
      coverUris: ['file:///cover.jpg', 'demo:pound-cake'],
      chefPhotoUri: undefined,
      logoUri: undefined,
      pickupPhotoUri: 'file:///porch.jpg',
      drops: [],
      menu: [{ ...SAMPLE_RESTAURANTS[0].menu[0], id: 'm1', photoUri: 'file:///dish.jpg' }],
    };
    await saveMyKitchen(db, 'u1', kitchen, upload);
    expect(uploads).toEqual([
      expect.stringMatching(/^public-photos:u1\/kitchen\//),
      expect.stringMatching(/^order-photos:u1\/pickup\//),
      expect.stringMatching(/^public-photos:u1\/menu\//),
    ]);
    const kitchenWrite = calls.find((c) => c[0].table === 'restaurants')!;
    const payload = kitchenWrite[1].args[0] as { owner_id: string; cover_paths: string[] };
    expect(payload.owner_id).toBe('u1');
    expect(payload.cover_paths[1]).toBe('demo:pound-cake');
    const removal = calls.find((c) => c[0].table === 'menu_items' && ops(c).includes('delete'))!;
    expect(removal.find((c) => c.op === 'not')!.args).toEqual(['id', 'in', '(m1)']);
  });

  it('turns favorites on and off, and ignores joining the same area list twice', async () => {
    const { db, calls } = fakeDb((call, chain) =>
      chain.some((c) => c.op === 'insert') && call.table === 'area_waitlist'
        ? { error: { message: 'duplicate key value violates unique constraint' } }
        : { data: null },
    );
    await setFavorite(db, 'u1', 'r1', true);
    await setFavorite(db, 'u1', 'r1', false);
    expect(ops(calls[0])).toContain('upsert');
    expect(ops(calls[1])).toEqual(['from', 'delete', 'eq', 'eq']);
    await expect(joinAreaWaitlist(db, '78701')).resolves.toBeUndefined();
  });
});

describe('server sync', () => {
  it('applies a server snapshot, keeping a role picked on the phone', () => {
    const before = { ...INITIAL_STATE, hydrated: true, pendingRole: 'chef' as const };
    const after = reducer(before, {
      type: 'syncFromServer',
      snapshot: {
        profile: { id: 'u1', name: 'Ada', email: 'a@x.co', phone: '+14075550100', role: null, neighborhood: '' },
        orders: [],
        favoriteRestaurantIds: ['k1'],
      },
    });
    expect(after.user).toMatchObject({ id: 'u1', role: 'chef' });
    expect(after.favoriteRestaurantIds).toEqual(['k1']);
    expect(after.cart).toBe(before.cart);
  });

  it('shows changes at once, sends them, and waits for the server on publishing', async () => {
    const { db, calls } = fakeDb(() => ({ data: null }));
    const local: string[] = [];
    let state: AppState = {
      ...INITIAL_STATE,
      hydrated: true,
      user: { id: 'u1', name: 'A', email: '', phone: '', role: 'foodie', neighborhood: '' },
    };
    const send = makeServerDispatch(db as never, (a) => {
      local.push(a.type);
      state = reducer(state, a);
    }, () => state);
    send({ type: 'toggleFavorite', restaurantId: 'k1' });
    send({ type: 'publishRestaurant', restaurantId: 'k1' });
    send({ type: 'rememberSearch', query: 'pie' });
    await new Promise((r) => setTimeout(r, 0));
    expect(local).toEqual(['toggleFavorite', 'rememberSearch']);
    expect(calls.find((c) => c[0].table === 'favorites')?.map((c) => c.op)).toContain('upsert');
  });

  it('tells people when the server refuses a change', async () => {
    const shown: string[] = [];
    const spy = jest.spyOn(Alert, 'alert').mockImplementation((title, message) => {
      shown.push(`${title}: ${message}`);
    });
    const { db } = fakeDb(() => ({ error: { message: 'Can’t move an order from placed to ready' } }));
    let state: AppState = { ...INITIAL_STATE, hydrated: true };
    const send = makeServerDispatch(db as never, (a) => {
      state = reducer(state, a);
    }, () => state);
    send({ type: 'setOrderStatus', orderId: 'o1', status: 'ready' });
    await new Promise((r) => setTimeout(r, 0));
    spy.mockRestore();
    expect(shown).toEqual(['That didn’t go through: Can’t move an order from placed to ready']);
  });
});
