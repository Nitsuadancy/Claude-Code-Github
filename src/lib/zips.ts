/**
 * US ZIP codes: place name, state and an approximate center, from GeoNames
 * (CC BY 4.0, see docs/CREDITS.md). Built by scripts/zip-data.py. The table
 * is decoded the first time it's needed, not when the app starts.
 */

export interface ZipPlace {
  zip: string;
  city: string;
  /** Two-letter state code. */
  state: string;
  lat: number;
  lng: number;
}

interface ZipFile {
  states: string[];
  places: string[];
  rows: string;
}

let table: Map<string, ZipPlace> | null = null;

function load(): Map<string, ZipPlace> {
  if (table) return table;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const data = require("@/data/zips.json") as ZipFile;
  const places = data.places.map((p) => {
    const [city, stateIndex] = p.split("|");
    return { city, state: data.states[Number(stateIndex)] };
  });
  const map = new Map<string, ZipPlace>();
  let zip = 0;
  let lat = 0;
  let lng = 0;
  for (const row of data.rows.split(";")) {
    const [dz, dlat, dlng, place] = row.split(",");
    zip += parseInt(dz, 36);
    lat += parseInt(dlat, 36);
    lng += parseInt(dlng, 36);
    const key = String(zip).padStart(5, "0");
    const p = places[parseInt(place, 36)];
    map.set(key, {
      zip: key,
      city: p.city,
      state: p.state,
      lat: lat / 100,
      lng: lng / 100,
    });
  }
  table = map;
  return map;
}

/** The place for a 5-digit ZIP, or null if it isn't a known US ZIP. */
export function lookupZip(zip: string | undefined | null): ZipPlace | null {
  const z = (zip ?? "").trim();
  if (!/^\d{5}$/.test(z)) return null;
  return load().get(z) ?? null;
}

/** "Austin, TX" */
export function placeLabel(p: Pick<ZipPlace, "city" | "state">): string {
  return `${p.city}, ${p.state}`;
}
