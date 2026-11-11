/**
 * A kitchen's time zone from its state, and its longitude where a state
 * spans two. Bake-day and drop deadlines are worked out in this zone on the
 * server. Approximate near the lines; a kitchen can be corrected by hand.
 */
const PRIMARY: Record<string, string> = {
  AL: "America/Chicago",
  AK: "America/Anchorage",
  AZ: "America/Phoenix",
  AR: "America/Chicago",
  CA: "America/Los_Angeles",
  CO: "America/Denver",
  CT: "America/New_York",
  DE: "America/New_York",
  DC: "America/New_York",
  FL: "America/New_York",
  GA: "America/New_York",
  HI: "Pacific/Honolulu",
  ID: "America/Boise",
  IL: "America/Chicago",
  IN: "America/Indiana/Indianapolis",
  IA: "America/Chicago",
  KS: "America/Chicago",
  KY: "America/New_York",
  LA: "America/Chicago",
  ME: "America/New_York",
  MD: "America/New_York",
  MA: "America/New_York",
  MI: "America/Detroit",
  MN: "America/Chicago",
  MS: "America/Chicago",
  MO: "America/Chicago",
  MT: "America/Denver",
  NE: "America/Chicago",
  NV: "America/Los_Angeles",
  NH: "America/New_York",
  NJ: "America/New_York",
  NM: "America/Denver",
  NY: "America/New_York",
  NC: "America/New_York",
  ND: "America/Chicago",
  OH: "America/New_York",
  OK: "America/Chicago",
  OR: "America/Los_Angeles",
  PA: "America/New_York",
  RI: "America/New_York",
  SC: "America/New_York",
  SD: "America/Chicago",
  TN: "America/Chicago",
  TX: "America/Chicago",
  UT: "America/Denver",
  VT: "America/New_York",
  VA: "America/New_York",
  WA: "America/Los_Angeles",
  WV: "America/New_York",
  WI: "America/Chicago",
  WY: "America/Denver",
};

/** States split by a rough north–south line: west of `lng` uses `west`. */
const SPLITS: Record<string, { lng: number; west: string; east: string }> = {
  FL: { lng: -85.0, west: "America/Chicago", east: "America/New_York" },
  TX: { lng: -104.9, west: "America/Denver", east: "America/Chicago" },
  TN: { lng: -85.3, west: "America/Chicago", east: "America/New_York" },
  KY: { lng: -86.0, west: "America/Chicago", east: "America/New_York" },
  IN: {
    lng: -87.0,
    west: "America/Chicago",
    east: "America/Indiana/Indianapolis",
  },
  KS: { lng: -101.3, west: "America/Denver", east: "America/Chicago" },
  NE: { lng: -101.0, west: "America/Denver", east: "America/Chicago" },
  SD: { lng: -100.5, west: "America/Denver", east: "America/Chicago" },
  ND: { lng: -101.0, west: "America/Denver", east: "America/Chicago" },
  OR: { lng: -117.5, west: "America/Los_Angeles", east: "America/Boise" },
  ID: { lng: -116.0, west: "America/Los_Angeles", east: "America/Boise" },
};

export function timezoneFor(state: string | undefined, lng?: number): string {
  const code = (state ?? "").toUpperCase();
  const split = SPLITS[code];
  if (split && lng !== undefined)
    return lng < split.lng ? split.west : split.east;
  return PRIMARY[code] ?? "America/New_York";
}
