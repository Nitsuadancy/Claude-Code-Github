import { ALL_NEIGHBORHOODS, MARKETS } from './regions';

/**
 * Manna's first market. Kitchens list their neighborhood instead of a street
 * address; the exact address is shared once a chef accepts an order.
 * New cities are added as markets in ./regions.
 */
export const LAUNCH_CITY = MARKETS[0].city;
export const DEFAULT_NEIGHBORHOOD = 'College Park';
export const NEIGHBORHOODS = ALL_NEIGHBORHOODS;
