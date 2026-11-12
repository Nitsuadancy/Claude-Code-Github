/**
 * The Manna team's calls. Row-level security lets only admins read these
 * rows, and the database functions refuse anyone else, so this file only
 * decides what to load and how to show it.
 */
import type { AdminDocument, AdminKitchen, DocumentReview, ReportGroup } from '@/lib/admin';
import { groupReports } from '@/lib/admin';
import type { DocumentKind, OrderIssueKind, OrderStatus } from '@/types';

import { RemoteError, type Db } from './api';
import { signPrivatePaths } from './uploads';

/** Supabase's answer, typed by the caller (the client has no generated database types). */
function unwrap<T>({ data, error }: { data: unknown; error: { message: string } | null }): T {
  if (error) throw new RemoteError(error.message || 'Something went wrong. Try again.');
  return data as T;
}

/** A joined row: one object for a many-to-one link, though the client can't know that. */
function one<T>(v: T | T[] | null | undefined): T | null {
  return Array.isArray(v) ? (v[0] ?? null) : (v ?? null);
}

/* ---------- Kitchens waiting for review ---------- */

interface PendingRow {
  id: string;
  name: string;
  chef_name: string;
  cuisine: string;
  city: string;
  state: string;
  zip: string;
  law_attested_at: string | null;
  referred_by_code: string | null;
  created_at: string;
  menu_items: { id: string }[] | null;
  restaurant_documents: { id: string; kind: DocumentKind; file_name: string; storage_path: string; review_status: DocumentReview }[] | null;
}

const PENDING_SELECT =
  'id, name, chef_name, cuisine, city, state, zip, law_attested_at, referred_by_code, created_at, menu_items(id), restaurant_documents(id, kind, file_name, storage_path, review_status)';

async function toKitchens(db: Db, rows: PendingRow[]): Promise<AdminKitchen[]> {
  const launched = new Set(
    (unwrap<{ code: string }[] | null>(await db.from('launched_states').select('code')) ?? []).map((l) => l.code),
  );
  const signed = new Map<string, string>();
  await signPrivatePaths(
    db,
    'documents',
    rows.flatMap((r) => (r.restaurant_documents ?? []).map((d) => d.storage_path)),
    signed,
  );
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    chefName: r.chef_name,
    cuisine: r.cuisine,
    city: r.city,
    state: r.state,
    zip: r.zip,
    lawAttested: !!r.law_attested_at,
    stateLaunched: launched.has(r.state),
    dishCount: (r.menu_items ?? []).length,
    ...(r.referred_by_code ? { referredBy: r.referred_by_code } : {}),
    createdAt: r.created_at,
    documents: (r.restaurant_documents ?? []).map(
      (d): AdminDocument => ({
        id: d.id,
        kind: d.kind,
        fileName: d.file_name,
        status: d.review_status,
        ...(signed.get(d.storage_path) ? { url: signed.get(d.storage_path)! } : {}),
      }),
    ),
  }));
}

export async function loadKitchensToReview(db: Db): Promise<AdminKitchen[]> {
  const rows = unwrap<PendingRow[] | null>(
    await db.from('restaurants').select(PENDING_SELECT).eq('status', 'pending_review').order('created_at'),
  );
  return toKitchens(db, rows ?? []);
}

export async function loadKitchenToReview(db: Db, id: string): Promise<AdminKitchen | null> {
  const row = unwrap<PendingRow | null>(await db.from('restaurants').select(PENDING_SELECT).eq('id', id).maybeSingle());
  return row ? (await toKitchens(db, [row]))[0] : null;
}

export async function reviewDocument(db: Db, documentId: string, approved: boolean): Promise<void> {
  unwrap(await db.rpc('review_document', { p_document_id: documentId, p_approved: approved }));
}

export async function approveKitchen(db: Db, restaurantId: string): Promise<void> {
  unwrap(await db.rpc('approve_restaurant', { p_restaurant_id: restaurantId }));
}

export async function sendBackKitchen(db: Db, restaurantId: string, note: string): Promise<void> {
  unwrap(await db.rpc('send_back_restaurant', { p_restaurant_id: restaurantId, p_note: note }));
}

/* ---------- Help requests ---------- */

export interface HelpRequest {
  id: string;
  orderId: string;
  kind: OrderIssueKind;
  note: string;
  createdAt: string;
  customerName: string;
  /** For texting or calling the customer back. */
  customerPhone: string;
  kitchenName: string;
  orderStatus: OrderStatus;
  totalCents: number;
  orderedAt: string;
}

interface HelpRow {
  id: string;
  order_id: string;
  kind: OrderIssueKind;
  note: string;
  created_at: string;
  orders: { customer_name: string; restaurant_name: string; status: OrderStatus; total_cents: number; created_at: string } | null;
  profiles: { phone: string | null } | null;
}

export async function loadHelpRequests(db: Db): Promise<HelpRequest[]> {
  const rows = unwrap<HelpRow[] | null>(
    await db
      .from('order_issues')
      .select('id, order_id, kind, note, created_at, orders(customer_name, restaurant_name, status, total_cents, created_at), profiles(phone)')
      .is('resolved_at', null)
      .order('created_at'),
  );
  return (rows ?? []).map((r) => {
    const o = one(r.orders);
    return {
      id: r.id,
      orderId: r.order_id,
      kind: r.kind,
      note: r.note,
      createdAt: r.created_at,
      customerName: o?.customer_name || 'Customer',
      customerPhone: one(r.profiles)?.phone ?? '',
      kitchenName: o?.restaurant_name ?? '',
      orderStatus: o?.status ?? 'placed',
      totalCents: o?.total_cents ?? 0,
      orderedAt: o?.created_at ?? r.created_at,
    };
  });
}

export async function resolveHelpRequest(db: Db, id: string): Promise<void> {
  unwrap(await db.from('order_issues').update({ resolved_at: new Date().toISOString() }).eq('id', id));
}

/* ---------- Reported messages and reviews ---------- */

export interface ReportedItem extends ReportGroup {
  type: 'message' | 'review';
  text: string;
  /** Who wrote it. */
  author: string;
  /** For a review, its stars; for a message, which order's chat. */
  detail: string;
}

interface MessageReportRow {
  message_id: string;
  created_at: string;
  order_messages: { body: string; order_id: string; profiles: { name: string } | null } | null;
}

interface ReviewReportRow {
  review_id: string;
  reason: string;
  created_at: string;
  reviews: { stars: number; text: string; customer_name: string; restaurants: { name: string } | null } | null;
}

export async function loadReports(db: Db): Promise<ReportedItem[]> {
  const [messages, reviews] = await Promise.all([
    db.from('message_reports').select('message_id, created_at, order_messages(body, order_id, profiles(name))'),
    db.from('review_reports').select('review_id, reason, created_at, reviews(stars, text, customer_name, restaurants(name))'),
  ]);
  const messageRows = unwrap<MessageReportRow[] | null>(messages) ?? [];
  const reviewRows = unwrap<ReviewReportRow[] | null>(reviews) ?? [];
  const messageById = new Map(messageRows.map((r) => [r.message_id, one(r.order_messages)]));
  const reviewById = new Map(reviewRows.map((r) => [r.review_id, one(r.reviews)]));
  const items: ReportedItem[] = [
    ...groupReports(messageRows.map((r) => ({ targetId: r.message_id, reason: '', createdAt: r.created_at }))).map(
      (g): ReportedItem => {
        const m = messageById.get(g.targetId);
        return { ...g, type: 'message', text: m?.body ?? '(message removed)', author: one(m?.profiles)?.name || 'Someone', detail: 'In an order chat' };
      },
    ),
    ...groupReports(reviewRows.map((r) => ({ targetId: r.review_id, reason: r.reason, createdAt: r.created_at }))).map(
      (g): ReportedItem => {
        const r = reviewById.get(g.targetId);
        return {
          ...g,
          type: 'review',
          text: r?.text || '(no written review)',
          author: r?.customer_name || 'A customer',
          detail: r ? `${r.stars}★ review of ${one(r.restaurants)?.name ?? 'a kitchen'}` : 'Review',
        };
      },
    ),
  ];
  return items.sort((a, b) => b.count - a.count || a.firstAt.localeCompare(b.firstAt));
}

/** Takes a reported message or review down (and a review out of the kitchen's rating). */
export async function removeReported(db: Db, item: Pick<ReportedItem, 'type' | 'targetId'>): Promise<void> {
  if (item.type === 'review') unwrap(await db.rpc('remove_review', { p_review_id: item.targetId }));
  else unwrap(await db.from('order_messages').delete().eq('id', item.targetId));
}

/** The team looked and it's fine: clears its reports. */
export async function dismissReports(db: Db, item: Pick<ReportedItem, 'type' | 'targetId'>): Promise<void> {
  unwrap(
    await db.rpc('dismiss_reports', {
      p_message_id: item.type === 'message' ? item.targetId : null,
      p_review_id: item.type === 'review' ? item.targetId : null,
    }),
  );
}

/* ---------- Where Manna should grow ---------- */

export interface Demand {
  areas: { zip: string; people: number }[];
  waitingKitchens: { state: string; kitchens: number }[];
}

export async function loadDemand(db: Db): Promise<Demand> {
  const [areas, waiting] = await Promise.all([db.rpc('area_demand'), db.rpc('kitchens_waiting_by_state')]);
  return {
    areas: (unwrap<{ zip: string; people: number }[] | null>(areas) ?? []).map((a) => ({ zip: a.zip, people: Number(a.people) })),
    waitingKitchens: (unwrap<{ state: string; kitchens: number }[] | null>(waiting) ?? []).map((w) => ({
      state: w.state,
      kitchens: Number(w.kitchens),
    })),
  };
}
