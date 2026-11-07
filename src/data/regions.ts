/**
 * Where Manna operates. Home-food law is set state by state, so each state
 * Manna opens in has its own rules, and each city it launches in is a market
 * with its own neighborhoods. To open a new state: add its rules here after
 * checking them against the state's official sources. To open a new city:
 * add a market. Kitchens elsewhere can't publish until their state is open.
 */
export interface UsState {
  code: string;
  name: string;
}

export const US_STATES: UsState[] = [
  { code: 'AL', name: 'Alabama' },
  { code: 'AK', name: 'Alaska' },
  { code: 'AZ', name: 'Arizona' },
  { code: 'AR', name: 'Arkansas' },
  { code: 'CA', name: 'California' },
  { code: 'CO', name: 'Colorado' },
  { code: 'CT', name: 'Connecticut' },
  { code: 'DE', name: 'Delaware' },
  { code: 'DC', name: 'District of Columbia' },
  { code: 'FL', name: 'Florida' },
  { code: 'GA', name: 'Georgia' },
  { code: 'HI', name: 'Hawaii' },
  { code: 'ID', name: 'Idaho' },
  { code: 'IL', name: 'Illinois' },
  { code: 'IN', name: 'Indiana' },
  { code: 'IA', name: 'Iowa' },
  { code: 'KS', name: 'Kansas' },
  { code: 'KY', name: 'Kentucky' },
  { code: 'LA', name: 'Louisiana' },
  { code: 'ME', name: 'Maine' },
  { code: 'MD', name: 'Maryland' },
  { code: 'MA', name: 'Massachusetts' },
  { code: 'MI', name: 'Michigan' },
  { code: 'MN', name: 'Minnesota' },
  { code: 'MS', name: 'Mississippi' },
  { code: 'MO', name: 'Missouri' },
  { code: 'MT', name: 'Montana' },
  { code: 'NE', name: 'Nebraska' },
  { code: 'NV', name: 'Nevada' },
  { code: 'NH', name: 'New Hampshire' },
  { code: 'NJ', name: 'New Jersey' },
  { code: 'NM', name: 'New Mexico' },
  { code: 'NY', name: 'New York' },
  { code: 'NC', name: 'North Carolina' },
  { code: 'ND', name: 'North Dakota' },
  { code: 'OH', name: 'Ohio' },
  { code: 'OK', name: 'Oklahoma' },
  { code: 'OR', name: 'Oregon' },
  { code: 'PA', name: 'Pennsylvania' },
  { code: 'RI', name: 'Rhode Island' },
  { code: 'SC', name: 'South Carolina' },
  { code: 'SD', name: 'South Dakota' },
  { code: 'TN', name: 'Tennessee' },
  { code: 'TX', name: 'Texas' },
  { code: 'UT', name: 'Utah' },
  { code: 'VT', name: 'Vermont' },
  { code: 'VA', name: 'Virginia' },
  { code: 'WA', name: 'Washington' },
  { code: 'WV', name: 'West Virginia' },
  { code: 'WI', name: 'Wisconsin' },
  { code: 'WY', name: 'Wyoming' },
];

/** What a state's home-food law means for kitchens on Manna. */
export interface StateRules {
  code: string;
  /** The statement the state requires on labels, also shown on kitchen pages. */
  labelStatement: string;
  /** Most a home kitchen may sell in a year, or null for no state limit. */
  annualSalesCapCents: number | null;
  /** Shown on the documents step: what licensing the state asks for. */
  permitNote: string;
  /** Official page the rules were checked against. */
  source: string;
}

/** States Manna is open in. Florida's rules: Florida Statutes 500.80 and FDACS. */
export const STATE_RULES: Record<string, StateRules> = {
  FL: {
    code: 'FL',
    labelStatement: 'Made in a cottage food operation that is not subject to Florida’s food safety regulations.',
    annualSalesCapCents: 25_000_000,
    permitNote:
      'Florida cottage food kitchens don’t need a state license. Add a local business tax receipt or permit if your city or county asks for one.',
    source: 'https://www.fdacs.gov/Business-Services/Food/Cottage-Foods',
  },
};

/** A city Manna has launched in, with the neighborhoods kitchens and customers choose from. */
export interface Market {
  id: string;
  city: string;
  state: string;
  /** IANA time zone, for bake-day cutoffs in the database. */
  timezone: string;
  neighborhoods: string[];
}

export const MARKETS: Market[] = [
  {
    id: 'orlando-fl',
    city: 'Orlando',
    state: 'FL',
    timezone: 'America/New_York',
    neighborhoods: [
      'Audubon Park',
      'Baldwin Park',
      'College Park',
      'Colonialtown',
      'Delaney Park',
      'Downtown Orlando',
      'Ivanhoe Village',
      'Lake Eola Heights',
      'Lake Nona',
      'Mills 50',
      'Parramore',
      'Pine Hills',
      'Thornton Park',
      'Winter Park',
    ],
  },
];

export const DEFAULT_STATE = 'FL';

export function stateName(code: string | undefined): string {
  return US_STATES.find((s) => s.code === code)?.name ?? code ?? '';
}

export function rulesFor(code: string | undefined): StateRules | undefined {
  return code ? STATE_RULES[code] : undefined;
}

/** Whether kitchens in this state can publish on Manna. */
export function isOpenState(code: string | undefined): boolean {
  return !!rulesFor(code) && MARKETS.some((m) => m.state === code);
}

/** Neighborhoods kitchens in a state can list, across its markets. */
export function neighborhoodsFor(code: string | undefined): string[] {
  return MARKETS.filter((m) => m.state === code).flatMap((m) => m.neighborhoods);
}

/** Every neighborhood customers can browse from. */
export const ALL_NEIGHBORHOODS = MARKETS.flatMap((m) => m.neighborhoods);

/** The market a neighborhood belongs to, optionally within one state. */
export function marketFor(neighborhood: string, state?: string): Market | undefined {
  return MARKETS.find((m) => (!state || m.state === state) && m.neighborhoods.includes(neighborhood));
}

/** The label statement for a kitchen's state, with a plain fallback. */
export function cottageStatement(code: string | undefined): string {
  return rulesFor(code)?.labelStatement ?? 'Made in a home kitchen that is not inspected by a state food safety agency.';
}
