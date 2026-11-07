/**
 * Photos bundled for the demo kitchens, referenced as "demo:<name>".
 * Photographers and licenses are listed in assets/photos/CREDITS.md.
 *
 * Each photo comes in three sizes (see scripts/photo-sizes.py) so small spots
 * never load a full-screen image: `full` 2100 x 1400 for heroes, `card`
 * 1200 x 800 for cards and sheets, `thumb` 480 x 320 for thumbnails.
 */
export type PhotoSize = 'full' | 'card' | 'thumb';

export const DEMO_PHOTOS: Record<string, Record<PhotoSize, number>> = {
  'olive-oil-cake': {
    full: require('@/assets/photos/olive-oil-cake.jpg'),
    card: require('@/assets/photos/card/olive-oil-cake.jpg'),
    thumb: require('@/assets/photos/thumb/olive-oil-cake.jpg'),
  },
  'biscotti': {
    full: require('@/assets/photos/biscotti.jpg'),
    card: require('@/assets/photos/card/biscotti.jpg'),
    thumb: require('@/assets/photos/thumb/biscotti.jpg'),
  },
  'country-loaf': {
    full: require('@/assets/photos/country-loaf.jpg'),
    card: require('@/assets/photos/card/country-loaf.jpg'),
    thumb: require('@/assets/photos/thumb/country-loaf.jpg'),
  },
  'gizzada': {
    full: require('@/assets/photos/gizzada.jpg'),
    card: require('@/assets/photos/card/gizzada.jpg'),
    thumb: require('@/assets/photos/thumb/gizzada.jpg'),
  },
  'cookies': {
    full: require('@/assets/photos/cookies.jpg'),
    card: require('@/assets/photos/card/cookies.jpg'),
    thumb: require('@/assets/photos/thumb/cookies.jpg'),
  },
  'brownies': {
    full: require('@/assets/photos/brownies.jpg'),
    card: require('@/assets/photos/card/brownies.jpg'),
    thumb: require('@/assets/photos/thumb/brownies.jpg'),
  },
  'granola': {
    full: require('@/assets/photos/granola.jpg'),
    card: require('@/assets/photos/card/granola.jpg'),
    thumb: require('@/assets/photos/thumb/granola.jpg'),
  },
  'banana-bread': {
    full: require('@/assets/photos/banana-bread.jpg'),
    card: require('@/assets/photos/card/banana-bread.jpg'),
    thumb: require('@/assets/photos/thumb/banana-bread.jpg'),
  },
  'cinnamon-rolls': {
    full: require('@/assets/photos/cinnamon-rolls.jpg'),
    card: require('@/assets/photos/card/cinnamon-rolls.jpg'),
    thumb: require('@/assets/photos/thumb/cinnamon-rolls.jpg'),
  },
  'biscuits': {
    full: require('@/assets/photos/biscuits.jpg'),
    card: require('@/assets/photos/card/biscuits.jpg'),
    thumb: require('@/assets/photos/thumb/biscuits.jpg'),
  },
  'apricot-jam': {
    full: require('@/assets/photos/apricot-jam.jpg'),
    card: require('@/assets/photos/card/apricot-jam.jpg'),
    thumb: require('@/assets/photos/thumb/apricot-jam.jpg'),
  },
  'peach-cobbler': {
    full: require('@/assets/photos/peach-cobbler.jpg'),
    card: require('@/assets/photos/card/peach-cobbler.jpg'),
    thumb: require('@/assets/photos/thumb/peach-cobbler.jpg'),
  },
  'pound-cake': {
    full: require('@/assets/photos/pound-cake.jpg'),
    card: require('@/assets/photos/card/pound-cake.jpg'),
    thumb: require('@/assets/photos/thumb/pound-cake.jpg'),
  },
  'conchas': {
    full: require('@/assets/photos/conchas.jpg'),
    card: require('@/assets/photos/card/conchas.jpg'),
    thumb: require('@/assets/photos/thumb/conchas.jpg'),
  },
};
