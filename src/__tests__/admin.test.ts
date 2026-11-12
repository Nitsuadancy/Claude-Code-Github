import { describe, expect, it } from '@jest/globals';

import {
  type AdminKitchen,
  canApprove,
  groupReports,
  isOverdue,
  issueLabel,
  licensedNote,
  reviewChecklist,
  sendBackSuggestions,
  waitingFor,
} from '@/lib/admin';
import { loadHelpRequests } from '@/lib/remote/admin';
import type { Db } from '@/lib/remote/api';

const kitchen = (over: Partial<AdminKitchen> = {}): AdminKitchen => ({
  id: 'k1',
  name: 'Susie’s Sweets',
  chefName: 'Susie Park',
  cuisine: 'Bakery',
  city: 'Orlando',
  state: 'FL',
  zip: '32804',
  lawAttested: true,
  stateLaunched: true,
  dishCount: 4,
  createdAt: '2026-11-10T12:00:00Z',
  documents: [
    { id: 'd1', kind: 'food-handler', fileName: 'card.jpg', status: 'approved' },
    { id: 'd2', kind: 'government-id', fileName: 'id.jpg', status: 'approved' },
  ],
  ...over,
});

describe('kitchen review', () => {
  it('opens a kitchen only when every check passes', () => {
    expect(canApprove(kitchen())).toBe(true);
    expect(canApprove(kitchen({ stateLaunched: false }))).toBe(false);
    expect(canApprove(kitchen({ lawAttested: false }))).toBe(false);
    expect(canApprove(kitchen({ dishCount: 0 }))).toBe(false);
    const pendingId = kitchen({ documents: [{ id: 'd1', kind: 'food-handler', fileName: 'c', status: 'approved' }, { id: 'd2', kind: 'government-id', fileName: 'i', status: 'pending' }] });
    expect(canApprove(pendingId)).toBe(false);
    expect(reviewChecklist(pendingId).filter((c) => !c.ok).map((c) => c.label)).toEqual(['Government ID approved']);
  });

  it('treats the permit as optional', () => {
    expect(licensedNote(kitchen())).toMatch(/optional/);
    const withPermit = kitchen({ documents: [...kitchen().documents, { id: 'd3', kind: 'home-kitchen-permit', fileName: 'p', status: 'pending' }] });
    expect(canApprove(withPermit)).toBe(true);
    expect(licensedNote(withPermit)).toMatch(/Licensed label/);
  });

  it('suggests notes for what’s missing or rejected', () => {
    const k = kitchen({ dishCount: 0, documents: [{ id: 'd2', kind: 'government-id', fileName: 'i', status: 'rejected' }] });
    expect(sendBackSuggestions(k)).toEqual([
      'Your government id couldn\'t be verified. Please upload a clear photo of the whole document.',
      'Please upload your food handler certificate.',
      'Add at least one dish to your menu.',
    ]);
    expect(sendBackSuggestions(kitchen())).toEqual([]);
  });
});

describe('reports and help', () => {
  it('puts the most reported first, then the oldest', () => {
    const groups = groupReports([
      { targetId: 'a', reason: 'Spam', createdAt: '2026-11-10T10:00:00Z' },
      { targetId: 'b', reason: '', createdAt: '2026-11-09T10:00:00Z' },
      { targetId: 'a', reason: 'Spam', createdAt: '2026-11-08T10:00:00Z' },
      { targetId: 'c', reason: 'Rude', createdAt: '2026-11-07T10:00:00Z' },
    ]);
    expect(groups.map((g) => `${g.targetId}:${g.count}`)).toEqual(['a:2', 'c:1', 'b:1']);
    expect(groups[0]).toMatchObject({ reasons: ['Spam'], firstAt: '2026-11-08T10:00:00Z' });
  });

  it('says how long things have waited, and flags a day', () => {
    const now = new Date('2026-11-12T12:00:00Z');
    expect(waitingFor('2026-11-12T11:59:30Z', now)).toBe('just now');
    expect(waitingFor('2026-11-12T11:15:00Z', now)).toBe('45 minutes ago');
    expect(waitingFor('2026-11-12T09:00:00Z', now)).toBe('3 hours ago');
    expect(waitingFor('2026-11-09T12:00:00Z', now)).toBe('3 days ago');
    expect(isOverdue('2026-11-11T11:00:00Z', now)).toBe(true);
    expect(isOverdue('2026-11-11T13:00:00Z', now)).toBe(false);
  });

  it('names every help topic', () => {
    expect(issueLabel('late')).toBe('It’s running late');
    expect(issueLabel('not-received')).toBe('I didn’t get my order');
    expect(issueLabel('charge')).toBe('A problem with a charge');
  });

  it('loads help requests whether joins come back as objects or lists', async () => {
    const rows = [
      {
        id: 'h1',
        order_id: 'o1',
        kind: 'late',
        note: 'Been 30 minutes',
        created_at: '2026-11-12T10:00:00Z',
        orders: [{ customer_name: 'Ada', restaurant_name: 'Susie’s', status: 'ready', total_cents: 2450, created_at: '2026-11-12T09:00:00Z' }],
        profiles: { phone: '+14075550100' },
      },
    ];
    const chain = { select: () => chain, is: () => chain, order: async () => ({ data: rows, error: null }) };
    const db = { from: () => chain } as unknown as Db;
    expect(await loadHelpRequests(db)).toEqual([
      expect.objectContaining({ customerName: 'Ada', customerPhone: '+14075550100', kitchenName: 'Susie’s', totalCents: 2450, orderStatus: 'ready' }),
    ]);
  });
});
