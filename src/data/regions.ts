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
  /**
   * The statement the state requires on labels, also shown on kitchen pages.
   * Empty when the state asks for no special statement (its labels still
   * need the usual name, ingredients, weight, allergens and maker).
   */
  labelStatement: string;
  /** Most a home kitchen may sell in a year, or null for no state limit. */
  annualSalesCapCents: number | null;
  /** Shown on the documents step: what licensing the state asks for. */
  permitNote: string;
  /** Official page the rules were checked against. */
  source: string;
  /**
   * Kitchens here can open on Manna. Turn a state on once a lawyer has
   * confirmed its rules (see docs/STATES.md). Until then cooks can set up and
   * save their kitchen, and open it the day the state launches.
   */
  launched: boolean;
  /** How the rules were checked: the state's own page, or secondary sources only (confirm before launch). */
  checked: 'official' | 'secondary';
  /** The state wants a dish's label details shown online before the customer pays (Texas, Illinois). */
  showLabelOnline?: boolean;
  /** A notice the state wants shown where people buy online, when it differs from the label statement. */
  onlineNotice?: string;
  /** Anything else cooks there should know. */
  notes?: string[];
}

/**
 * Home-food rules by state. Florida is open; the others are researched and
 * waiting for a lawyer's review before launch. Each was checked on the date
 * in docs/STATES.md against the source listed.
 */
export const STATE_RULES: Record<string, StateRules> = {
  FL: {
    code: 'FL',
    labelStatement: 'Made in a cottage food operation that is not subject to Florida’s food safety regulations.',
    annualSalesCapCents: 25_000_000,
    permitNote:
      'Florida cottage food kitchens don’t need a state license. Add a local business tax receipt or permit if your city or county asks for one.',
    source: 'https://www.fdacs.gov/Business-Services/Food/Cottage-Foods',
    launched: true,
    checked: 'official',
  },
  TX: {
    code: 'TX',
    labelStatement:
      'THIS PRODUCT WAS PRODUCED IN A PRIVATE RESIDENCE THAT IS NOT SUBJECT TO GOVERNMENTAL LICENSING OR INSPECTION.',
    annualSalesCapCents: 15_000_000,
    permitNote:
      'Texas cottage food kitchens don’t need a license. Register free on the DSHS online registry to put a registration number on labels instead of your home address. Registration is required if you sell foods that need refrigeration.',
    source: 'https://www.dshs.texas.gov/foodestablishments/cfpo',
    launched: false,
    checked: 'official',
    showLabelOnline: true,
    notes: [
      'Foods that need refrigeration need DSHS registration, the date made and safe handling instructions on the label.',
      'Online orders: the label details must be shown before payment.',
    ],
  },
  CA: {
    code: 'CA',
    labelStatement: 'Made in a Home Kitchen',
    annualSalesCapCents: 8_887_800,
    permitNote:
      'Register with your county environmental health department as a Class A cottage food operation (direct sales), or get a Class B permit (inspected) to also sell through shops and restaurants. Both renew yearly, and fees vary by county. Your registration or permit number and county go on your label.',
    source: 'https://www.cdph.ca.gov/Programs/CEH/DFDCS/Pages/FDBPrograms/FoodSafetyProgram/CFORequirements.aspx',
    launched: false,
    checked: 'secondary',
    notes: ['The yearly sales limit shown is for Class A in 2026; Class B is higher. Confirm both on the CDPH site.'],
  },
  NY: {
    code: 'NY',
    labelStatement: 'Made in a Home Kitchen',
    annualSalesCapCents: null,
    permitNote:
      'Register free with the New York State Department of Agriculture and Markets as a home processor. Foods that need refrigeration aren’t allowed, and everything must be packaged and labeled at home.',
    source: 'https://agriculture.ny.gov/food-safety/home-processing',
    launched: false,
    checked: 'official',
    notes: ['Internet sales are allowed within New York State only.'],
  },
  PA: {
    code: 'PA',
    labelStatement: '',
    annualSalesCapCents: null,
    permitNote:
      'Register with the Pennsylvania Department of Agriculture as a Limited Food Establishment: $35, a home kitchen inspection, and a $35 renewal each year. Registration covers selling from home, including internet sales.',
    source: 'https://www.pa.gov/agencies/pda/food/food-safety/limited-food-establishment-.html',
    launched: false,
    checked: 'official',
    notes: ['Labels need the product name, ingredients by weight, net weight, your business name and address, and allergens.'],
  },
  OH: {
    code: 'OH',
    labelStatement: 'This product is home produced.',
    annualSalesCapCents: null,
    permitNote: 'Ohio cottage food kitchens don’t need a license or registration for the foods the law allows. Sell within Ohio.',
    source: 'https://codes.ohio.gov/ohio-revised-code/section-3715.023',
    launched: false,
    checked: 'official',
  },
  IL: {
    code: 'IL',
    labelStatement:
      'This product was produced in a home kitchen not inspected by a health department that may also process common food allergens. If you have safety concerns, contact your local health department.',
    annualSalesCapCents: null,
    permitNote:
      'Register with your local health department as a cottage food operation (the state caps the fee at $50). Your registration number, county or city, and the date made go on your label.',
    source: 'https://extension.illinois.edu/cottage-food/food-labeling-and-placards',
    launched: false,
    checked: 'official',
    showLabelOnline: true,
    onlineNotice:
      'This product was produced in a home kitchen not subject to public health inspection that may also process common food allergens.',
    notes: [
      'Chicago has its own limits on cottage food operations.',
    ],
  },
  GA: {
    code: 'GA',
    labelStatement: 'Made in a home kitchen that has not been inspected by the Georgia Department of Agriculture.',
    annualSalesCapCents: null,
    permitNote:
      'Since July 1, 2025, Georgia cottage food kitchens don’t need a state license. You can ask the Georgia Department of Agriculture for an identification number to use on labels instead of your address. Check local business license and zoning rules.',
    source: 'https://agr.georgia.gov/sites/default/files/documents/assets/Cottage-Food-Update-HB398-Frequently-Asked-Questions.pdf',
    launched: false,
    checked: 'secondary',
    notes: ['The Department of Agriculture is rewriting its rules after HB 398, including the label wording. Confirm the statement before launch.'],
  },
  NC: {
    code: 'NC',
    labelStatement: '',
    annualSalesCapCents: null,
    permitNote:
      'Apply to NCDA&CS for a free home kitchen inspection (allow 8 to 12 weeks). No permit is issued: keep your Notice of Inspection. Pets aren’t allowed indoors under the home processor program.',
    source: 'https://www.ncagr.gov/divisions/food-drug-protection/food-program/fdpd-food-program-home-processor',
    launched: false,
    checked: 'official',
    notes: ['Labels are needed for packaged and shipped foods. Food made to order and handed to the customer can skip the label.'],
  },
  MI: {
    code: 'MI',
    labelStatement: 'Made in a home kitchen that has not been inspected by the Michigan department of agriculture and rural development.',
    annualSalesCapCents: 5_000_000,
    permitNote: 'Michigan cottage food kitchens don’t need a license. Keep to the yearly sales limit and the foods the law allows.',
    source: 'https://www.michigan.gov/mdard/food-dairy/michigan-cottage-food-information',
    launched: false,
    checked: 'secondary',
    notes: ['A 2025 change reportedly raised the sales limit to $50,000 and allowed online sales and shipping in Michigan. Confirm on the MDARD site.'],
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

/**
 * Whether kitchens in this state can publish on Manna: its rules are in
 * STATE_RULES and it has launched. Cities don't need to be set up first;
 * kitchens are placed by ZIP code anywhere in an open state.
 */
export function isOpenState(code: string | undefined): boolean {
  return !!rulesFor(code)?.launched;
}

/** Researched and waiting to launch: cooks can set up now and open on launch day. */
export function isComingSoon(code: string | undefined): boolean {
  const rules = rulesFor(code);
  return !!rules && !rules.launched;
}

/** States kitchens can open in now, by name. */
export function openStateNames(): string[] {
  return Object.values(STATE_RULES)
    .filter((r) => r.launched)
    .map((r) => stateName(r.code));
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

/**
 * The notice a kitchen's state wants shown where people buy online (Texas and
 * Illinois), or null. Shown on the kitchen page above the menu's fine print.
 */
export function onlineNotice(code: string | undefined): string | null {
  const rules = rulesFor(code);
  if (!rules?.showLabelOnline) return null;
  return rules.onlineNotice ?? (rules.labelStatement || null);
}

/** The label statement for a kitchen's state, with a plain fallback. */
export function cottageStatement(code: string | undefined): string {
  return rulesFor(code)?.labelStatement ?? 'Made in a home kitchen that is not inspected by a state food safety agency.';
}
