/**
 * Rough geography for the neighborhood map. Kitchens are placed by
 * neighborhood only; exact addresses stay private until a kitchen accepts
 * an order. Drive times are estimates from neighborhood centers.
 */

export interface LatLng {
  lat: number;
  lng: number;
}

/** Approximate centers of the neighborhoods Manna lists. Add new markets' neighborhoods here. */
export const NEIGHBORHOOD_CENTERS: Record<string, LatLng> = {
  'Audubon Park': { lat: 28.5664, lng: -81.354 },
  'Baldwin Park': { lat: 28.566, lng: -81.329 },
  'College Park': { lat: 28.569, lng: -81.392 },
  Colonialtown: { lat: 28.5505, lng: -81.3575 },
  'Delaney Park': { lat: 28.526, lng: -81.37 },
  'Downtown Orlando': { lat: 28.541, lng: -81.379 },
  'Ivanhoe Village': { lat: 28.563, lng: -81.378 },
  'Lake Eola Heights': { lat: 28.548, lng: -81.37 },
  'Lake Nona': { lat: 28.396, lng: -81.251 },
  'Mills 50': { lat: 28.556, lng: -81.365 },
  Parramore: { lat: 28.54, lng: -81.392 },
  'Pine Hills': { lat: 28.558, lng: -81.453 },
  'Thornton Park': { lat: 28.541, lng: -81.366 },
  'Winter Park': { lat: 28.6, lng: -81.339 },
};

/** A few lakes locals steer by, drawn softly for orientation. Approximate, like the rest of the map. */
export const LANDMARK_LAKES: { name: string; center: LatLng; radiusKm: number }[] = [
  { name: 'Lake Eola', center: { lat: 28.5432, lng: -81.3729 }, radiusKm: 0.22 },
  { name: 'Lake Ivanhoe', center: { lat: 28.5622, lng: -81.3738 }, radiusKm: 0.45 },
  { name: 'Lake Adair', center: { lat: 28.5604, lng: -81.3962 }, radiusKm: 0.3 },
  { name: 'Lake Fairview', center: { lat: 28.5905, lng: -81.3905 }, radiusKm: 0.6 },
];

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

function overlaps(a: Box, b: Box): boolean {
  return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
}

/**
 * Places each label below its dot, or above, right or left when that spot is
 * taken, so neighborhood names never print over each other. Returns the
 * text anchor point and alignment for each label, in input order.
 */
export function placeLabels(
  labels: { x: number; y: number; text: string; gap: number }[],
  bounds: { width: number; height: number },
  /** Dots to keep labels off. */
  avoid: { x: number; y: number }[] = [],
  charWidth = 6,
  lineHeight = 13,
): { x: number; y: number; anchor: 'start' | 'middle' | 'end' }[] {
  const taken: Box[] = avoid.map((d) => ({ x: d.x - 8, y: d.y - 8, w: 16, h: 16 }));
  return labels.map(({ x, y, text, gap }) => {
    const w = text.length * charWidth;
    const options = [
      { x, y: y + gap + lineHeight - 3, anchor: 'middle' as const, box: { x: x - w / 2, y: y + gap, w, h: lineHeight } },
      { x, y: y - gap - 3, anchor: 'middle' as const, box: { x: x - w / 2, y: y - gap - lineHeight, w, h: lineHeight } },
      { x: x + gap, y: y + 4, anchor: 'start' as const, box: { x: x + gap, y: y - lineHeight / 2, w, h: lineHeight } },
      { x: x - gap, y: y + 4, anchor: 'end' as const, box: { x: x - gap - w, y: y - lineHeight / 2, w, h: lineHeight } },
    ];
    const inside = (b: Box) => b.x >= 2 && b.y >= 2 && b.x + b.w <= bounds.width - 2 && b.y + b.h <= bounds.height - 2;
    const pick = options.find((o) => inside(o.box) && !taken.some((t) => overlaps(t, o.box))) ?? options[0];
    taken.push(pick.box);
    return { x: pick.x, y: pick.y, anchor: pick.anchor };
  });
}

export function centerOf(neighborhood: string): LatLng | undefined {
  return NEIGHBORHOOD_CENTERS[neighborhood];
}

/** Straight-line distance in kilometers. */
export function distanceKm(a: LatLng, b: LatLng): number {
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLng = (b.lng - a.lng) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

/**
 * A rough city drive time: roads run about a third longer than a straight
 * line, at around 35 km/h with lights, plus a few minutes to park. Rounded
 * to whole minutes, at least 3.
 */
export function driveMinutes(a: LatLng, b: LatLng): number {
  const km = distanceKm(a, b) * 1.35;
  return Math.max(3, Math.round((km / 35) * 60 + 2));
}

/** "About 8 min drive", or "In your neighborhood" when it's the same one. */
export function driveLabel(from: string, to: string): string | null {
  if (from === to) return 'In your neighborhood';
  const a = centerOf(from);
  const b = centerOf(to);
  if (!a || !b) return null;
  return `About ${driveMinutes(a, b)} min drive`;
}

/**
 * Fits points into a width × height box with padding, keeping true
 * proportions (longitude shrinks with latitude). Returns screen x, y.
 */
export function project(points: LatLng[], width: number, height: number, padding: number) {
  if (!points.length) return () => ({ x: width / 2, y: height / 2 });
  const midLat = points.reduce((s, p) => s + p.lat, 0) / points.length;
  const k = Math.cos((midLat * Math.PI) / 180);
  const xs = points.map((p) => p.lng * k);
  const ys = points.map((p) => p.lat);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const spanX = Math.max(maxX - minX, 0.01);
  const spanY = Math.max(maxY - minY, 0.01);
  const scale = Math.min((width - padding * 2) / spanX, (height - padding * 2) / spanY);
  const offX = (width - spanX * scale) / 2;
  const offY = (height - spanY * scale) / 2;
  return (p: LatLng) => ({ x: offX + (p.lng * k - minX) * scale, y: offY + (maxY - p.lat) * scale });
}

/**
 * Spreads several kitchens in one neighborhood around its center, so their
 * dots don't stack. Purely visual: it says nothing about where anyone lives.
 */
export function spread(center: { x: number; y: number }, index: number, count: number, radius = 16) {
  if (count <= 1) return center;
  const angle = (index / count) * Math.PI * 2 - Math.PI / 2;
  return { x: center.x + Math.cos(angle) * radius, y: center.y + Math.sin(angle) * radius };
}
