/**
 * Small helpers around a placed order: putting the pickup on a calendar,
 * getting directions to it, and asking Manna for help with it.
 */
import type { Order, OrderIssueKind, OrderStatus } from '@/types';

import { endedWithoutSale, isActive, isAddressShared, orderNumber } from './orders';

/** How long an "as soon as it's ready" pickup takes up on a calendar. */
const ASAP_PICKUP_MINUTES = 30;

export interface PickupEvent {
  title: string;
  start: Date;
  end: Date;
  location: string;
  notes: string;
}

/**
 * The pickup as a calendar event: the bake day's window, the chosen time,
 * or half an hour from when the kitchen expects it to be ready.
 * The exact address is only included once the kitchen has shared it.
 */
export function pickupEvent(
  order: Pick<
    Order,
    | 'id'
    | 'restaurantName'
    | 'status'
    | 'lines'
    | 'pickupAddress'
    | 'pickupInstructions'
    | 'scheduledFor'
    | 'pickupBy'
    | 'estimatedReadyAt'
  >,
  neighborhood?: string,
): PickupEvent {
  const start = new Date(order.scheduledFor ?? order.estimatedReadyAt);
  const end = order.pickupBy
    ? new Date(order.pickupBy)
    : new Date(start.getTime() + ASAP_PICKUP_MINUTES * 60_000);
  const shared = isAddressShared(order.status) && order.pickupAddress.trim().length > 0;
  const items = order.lines.map((l) => `${l.quantity} × ${l.name}`).join(', ');
  const notes = [
    `Manna order No. ${orderNumber(order.id)}: ${items}.`,
    shared && order.pickupInstructions ? order.pickupInstructions : null,
    shared ? null : 'The exact address appears in the Manna app once the kitchen accepts.',
    'Tap “I’m here” in the app when you arrive.',
  ]
    .filter(Boolean)
    .join('\n');
  return {
    title: `Pick up from ${order.restaurantName}`,
    start: end > start ? start : new Date(end.getTime() - ASAP_PICKUP_MINUTES * 60_000),
    end,
    location: shared ? order.pickupAddress : neighborhood ? `${neighborhood} (address shared once accepted)` : '',
    notes,
  };
}

/** `20261113T150000Z`, the date format calendar links use. */
function calendarStamp(d: Date): string {
  return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

/** Opens Google Calendar's "new event" page, pre-filled. Works on Android and the web with no permissions. */
export function googleCalendarUrl(event: PickupEvent): string {
  const params = [
    ['action', 'TEMPLATE'],
    ['text', event.title],
    ['dates', `${calendarStamp(event.start)}/${calendarStamp(event.end)}`],
    ['details', event.notes],
    ...(event.location ? [['location', event.location]] : []),
  ];
  return `https://calendar.google.com/calendar/render?${params
    .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
    .join('&')}`;
}

/** Turn-by-turn directions in Apple Maps on iPhone, Google Maps everywhere else. */
export function directionsUrl(address: string, platform: string): string {
  const destination = encodeURIComponent(address.trim());
  return platform === 'ios'
    ? `https://maps.apple.com/?daddr=${destination}`
    : `https://www.google.com/maps/dir/?api=1&destination=${destination}`;
}

export interface HelpTopic {
  kind: OrderIssueKind;
  label: string;
}

/** What someone can ask about depends on where the order is. */
export function helpTopicsFor(status: OrderStatus): HelpTopic[] {
  if (endedWithoutSale(status)) {
    return [
      { kind: 'charge', label: 'A problem with a charge' },
      { kind: 'other', label: 'Something else' },
    ];
  }
  if (isActive(status)) {
    return [
      { kind: 'late', label: 'It’s running late' },
      { kind: 'pickup', label: 'I can’t find the pickup spot' },
      { kind: 'change', label: 'I need to change my order' },
      { kind: 'other', label: 'Something else' },
    ];
  }
  return [
    { kind: 'missing', label: 'Something was missing or wrong' },
    { kind: 'quality', label: 'A quality or food safety problem' },
    { kind: 'not-received', label: 'I didn’t get my order' },
    { kind: 'charge', label: 'A problem with a charge' },
    { kind: 'other', label: 'Something else' },
  ];
}

/** Longest note we keep with a help request. */
export const HELP_NOTE_MAX = 500;

/** "Something else" needs a few words so the team knows what happened. */
export function canSendHelp(kind: OrderIssueKind | null, note: string): boolean {
  if (!kind) return false;
  return kind !== 'other' || note.trim().length >= 3;
}
