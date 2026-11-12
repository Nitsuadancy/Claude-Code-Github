/**
 * Rules for the Manna team's tools (src/app/admin/). The database makes the
 * final call (approve_restaurant, review_document, remove_review); these
 * shape what the team sees so the right button is the obvious one.
 */
import { DOCUMENT_TYPES } from '@/lib/setup';
import { helpTopicsFor } from '@/lib/order-extras';
import type { DocumentKind, OrderIssueKind } from '@/types';

export type DocumentReview = 'pending' | 'approved' | 'rejected';

export interface AdminDocument {
  id: string;
  kind: DocumentKind;
  fileName: string;
  status: DocumentReview;
  /** Short-lived link to the private file. */
  url?: string;
}

export interface AdminKitchen {
  id: string;
  name: string;
  chefName: string;
  cuisine: string;
  city: string;
  state: string;
  zip: string;
  lawAttested: boolean;
  stateLaunched: boolean;
  dishCount: number;
  referredBy?: string;
  createdAt: string;
  documents: AdminDocument[];
}

export interface ReviewCheck {
  label: string;
  ok: boolean;
}

const docTitle = (kind: DocumentKind) => DOCUMENT_TYPES.find((d) => d.kind === kind)?.title ?? kind;

/** What has to be true before a kitchen opens, in the order the team checks it. */
export function reviewChecklist(k: AdminKitchen): ReviewCheck[] {
  const approved = (kind: DocumentKind) => k.documents.some((d) => d.kind === kind && d.status === 'approved');
  return [
    { label: `Manna is open in ${k.state}`, ok: k.stateLaunched },
    { label: 'Cook confirmed they follow their food law', ok: k.lawAttested },
    ...DOCUMENT_TYPES.filter((t) => t.required).map((t) => ({ label: `${t.title} approved`, ok: approved(t.kind) })),
    { label: 'At least one dish on the menu', ok: k.dishCount > 0 },
  ];
}

export function canApprove(k: AdminKitchen): boolean {
  return reviewChecklist(k).every((c) => c.ok);
}

/** The optional permit earns the Licensed label; say so, so it isn't mistaken for a blocker. */
export function licensedNote(k: AdminKitchen): string {
  const permit = k.documents.find((d) => d.kind === 'home-kitchen-permit');
  if (!permit) return `No ${docTitle('home-kitchen-permit').toLowerCase()}. It's optional; it opens without the Licensed label.`;
  if (permit.status === 'approved') return 'Permit approved: the kitchen shows the Licensed label.';
  if (permit.status === 'rejected') return 'Permit rejected: it opens without the Licensed label.';
  return 'Permit uploaded: approve it to give the kitchen the Licensed label.';
}

/** A few ready-made notes for sending a kitchen back; the team can edit them. */
export function sendBackSuggestions(k: AdminKitchen): string[] {
  const out: string[] = [];
  for (const d of k.documents) {
    if (d.status === 'rejected') out.push(`Your ${docTitle(d.kind).toLowerCase()} couldn't be verified. Please upload a clear photo of the whole document.`);
  }
  for (const t of DOCUMENT_TYPES.filter((t) => t.required)) {
    if (!k.documents.some((d) => d.kind === t.kind)) out.push(`Please upload your ${t.title.toLowerCase()}.`);
  }
  if (k.dishCount === 0) out.push('Add at least one dish to your menu.');
  if (!k.lawAttested) out.push('Please confirm you follow your state’s home food law on the last setup step.');
  return out;
}

/** Plain words for a help request's topic. */
export function issueLabel(kind: OrderIssueKind): string {
  for (const status of ['placed', 'completed', 'declined'] as const) {
    const topic = helpTopicsFor(status).find((t) => t.kind === kind);
    if (topic) return topic.label;
  }
  return 'Something else';
}

export interface ReportRow {
  /** The reported message or review. */
  targetId: string;
  reason: string;
  createdAt: string;
}

export interface ReportGroup {
  targetId: string;
  count: number;
  reasons: string[];
  firstAt: string;
}

/** One card per reported message or review, most reported first, then oldest. */
export function groupReports(rows: ReportRow[]): ReportGroup[] {
  const groups = new Map<string, ReportGroup>();
  for (const r of rows) {
    const g = groups.get(r.targetId) ?? { targetId: r.targetId, count: 0, reasons: [], firstAt: r.createdAt };
    g.count += 1;
    if (r.reason.trim() && !g.reasons.includes(r.reason.trim())) g.reasons.push(r.reason.trim());
    if (r.createdAt < g.firstAt) g.firstAt = r.createdAt;
    groups.set(r.targetId, g);
  }
  return [...groups.values()].sort((a, b) => b.count - a.count || a.firstAt.localeCompare(b.firstAt));
}

/** "2 hours ago", "3 days ago": how long something has waited for the team. */
export function waitingFor(since: string, now: Date): string {
  const minutes = Math.max(0, Math.round((now.getTime() - new Date(since).getTime()) / 60000));
  if (minutes < 60) return minutes <= 1 ? 'just now' : `${minutes} minutes ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 48) return hours === 1 ? '1 hour ago' : `${hours} hours ago`;
  return `${Math.round(hours / 24)} days ago`;
}

/** Help requests and reports should get an answer within a day (App Store guideline 1.2). */
export function isOverdue(since: string, now: Date): boolean {
  return now.getTime() - new Date(since).getTime() > 24 * 60 * 60 * 1000;
}
