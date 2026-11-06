import type { Review } from '@/types';

/**
 * Fictional reviews for the demo kitchens. They're already counted in each
 * sample kitchen's rating, so they're shown but not added to it again.
 */
function sample(
  restaurantId: string,
  n: number,
  customerName: string,
  stars: number,
  daysAgo: number,
  text: string,
  tags: string[],
): Review {
  const created = new Date();
  created.setDate(created.getDate() - daysAgo);
  return {
    id: `sample_review_${restaurantId}_${n}`,
    orderId: `sample_order_${restaurantId}_${n}`,
    restaurantId,
    customerId: `sample_customer_${n}`,
    customerName,
    stars,
    tags,
    text,
    createdAt: created.toISOString(),
  };
}

export const SAMPLE_REVIEWS: Review[] = [
  sample('sample_cafe_parmesan', 1, 'Renée T.', 5, 2, 'The polenta cake tasted exactly like my Italian aunt’s. Gone in a day.', ['Tasted like home', 'Beautifully presented']),
  sample('sample_cafe_parmesan', 2, 'Marcus B.', 4, 9, 'Biscotti with my morning coffee all week. The country loaf is worth the early pickup.', ['Will order again']),
  sample('sample_blue_mountain', 1, 'Keisha W.', 5, 1, 'Gizzada just like my grandmother’s in Kingston. That jerk rub is no joke.', ['Tasted like home', 'Will order again']),
  sample('sample_blue_mountain', 2, 'Jordan K.', 5, 6, 'Marcia wrote a little thank-you note on the box.', ['Packed with care']),
  sample('sample_jacksons_night_oven', 1, 'Tasha W.', 5, 3, 'Picked up warm cookies at 11pm for movie night. The whole family was happy.', ['Generous portions', 'Will order again']),
  sample('sample_jacksons_night_oven', 2, 'Luis M.', 4, 12, 'Order early, the brownies sell out by Saturday night.', ['Tasted like home']),
  sample('sample_green_bowl', 1, 'Hannah P.', 5, 4, 'The granola is dangerous. Banana bread was moist and you’d never guess it’s vegan.', ['Right on time', 'Will order again']),
  sample('sample_sunrise_plates', 1, 'Andre J.', 5, 2, 'Cinnamon rolls that remind me of New Orleans Sundays.', ['Tasted like home', 'Right on time']),
  sample('sample_sunrise_plates', 2, 'Claire D.', 4, 8, 'Biscuits were flaky and huge. Get the apricot jam with them.', ['Generous portions']),
  sample('sample_susies_sweets', 1, 'Monique R.', 5, 1, 'Mrs. Susie’s cobbler is the real deal. We fought over the last spoonful.', ['Tasted like home', 'Will order again']),
  sample('sample_susies_sweets', 2, 'Ben A.', 5, 5, 'Pound cake wrapped like a gift, with a handwritten card.', ['Packed with care', 'Beautifully presented']),
  sample('sample_abuela_rosa', 1, 'Daniela G.', 5, 2, 'Conchas as soft as the ones from back home. My kids ask for them every weekend.', ['Tasted like home', 'Will order again']),
];
