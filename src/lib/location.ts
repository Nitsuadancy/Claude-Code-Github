import { DEFAULT_NEIGHBORHOOD } from '@/data/neighborhoods';
import type { Restaurant, UserProfile } from '@/types';

import { centerOf, distanceKm, driveMinutes, type LatLng } from './geo';
import { lookupZip, placeLabel } from './zips';

/**
 * Where people and kitchens are, roughly. Customers set a ZIP (or a
 * neighborhood in a launched city); kitchens show their neighborhood and
 * ZIP, never their address. Everything here is approximate on purpose.
 */

/** How far customers see kitchens from: pickup only, so close by. */
export const NEARBY_MILES = 25;
const KM_PER_MILE = 1.609;

export interface Place extends LatLng {
  /** What to call it: a neighborhood, or "City, ST". */
  label: string;
  /** Two-letter state, when known. */
  state?: string;
}

/** The customer's place: their ZIP, else their neighborhood, else the launch neighborhood. */
export function userPlace(user: Pick<UserProfile, 'neighborhood' | 'zip'> | null | undefined): Place {
  const zip = lookupZip(user?.zip);
  if (zip) {
    const hood = user?.neighborhood ? centerOf(user.neighborhood) : undefined;
    return hood
      ? { ...hood, label: user!.neighborhood, state: zip.state }
      : { lat: zip.lat, lng: zip.lng, label: zip.city, state: zip.state };
  }
  const name = user?.neighborhood || DEFAULT_NEIGHBORHOOD;
  const center = centerOf(name) ?? centerOf(DEFAULT_NEIGHBORHOOD)!;
  return { ...center, label: name, state: 'FL' };
}

/** A kitchen's public place: its neighborhood's center when Manna knows it, else its ZIP's. */
export function kitchenPlace(r: Pick<Restaurant, 'neighborhood' | 'areaCode' | 'state'>): Place | undefined {
  const hood = centerOf(r.neighborhood);
  if (hood) return { ...hood, label: r.neighborhood, state: r.state };
  const zip = lookupZip(r.areaCode);
  if (!zip) return undefined;
  return {
    lat: zip.lat,
    lng: zip.lng,
    label: r.neighborhood || zip.city,
    state: zip.state,
  };
}

export function distanceMiles(a: LatLng, b: LatLng): number {
  return distanceKm(a, b) / KM_PER_MILE;
}

/** Live kitchens within reach of a place, nearest first, with their distance in miles. */
export function nearbyKitchens<T extends Pick<Restaurant, 'neighborhood' | 'areaCode' | 'state'>>(
  restaurants: T[],
  from: LatLng,
  miles = NEARBY_MILES,
): { r: T; miles: number; place: Place }[] {
  return restaurants
    .map((r) => {
      const place = kitchenPlace(r);
      return place ? { r, place, miles: distanceMiles(from, place) } : null;
    })
    .filter((x): x is { r: T; miles: number; place: Place } => !!x && x.miles <= miles)
    .sort((a, b) => a.miles - b.miles);
}

/** "In your neighborhood", "About 8 min drive" or "About 14 miles away". */
export function driveBetween(from: Place, to: Place): string {
  if (from.label === to.label && distanceMiles(from, to) < 1) return 'In your neighborhood';
  const minutes = driveMinutes(from, to);
  if (minutes <= 45) return `About ${minutes} min drive`;
  return `About ${Math.round(distanceMiles(from, to))} miles away`;
}

/** "Austin, TX" for a ZIP, or null. */
export function zipLabel(zip: string | undefined): string | null {
  const p = lookupZip(zip);
  return p ? placeLabel(p) : null;
}
