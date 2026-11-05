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
  sample('sample_cafe_parmesan', 1, 'Renée T.', 5, 2, 'The lasagna tasted exactly like my Italian aunt’s. Still warm when it arrived.', ['Tasted like home', 'Generous portions']),
  sample('sample_cafe_parmesan', 2, 'Marcus B.', 4, 9, 'Lovely tiramisu, light and not too sweet. Will be back for the lasagna.', ['Beautifully presented']),
  sample('sample_momo_mania', 1, 'Priya S.', 5, 1, 'Best momos in Houston, hands down. That achar is addictive.', ['Will order again', 'Packed with care']),
  sample('sample_momo_mania', 2, 'Jordan K.', 5, 6, 'Pema even wrote a little thank-you note on the box.', ['Packed with care']),
  sample('sample_jacksons_deep_dish', 1, 'Tasha W.', 5, 3, 'Fed the whole family on Friday. Crust was perfect.', ['Generous portions', 'Will order again']),
  sample('sample_jacksons_deep_dish', 2, 'Luis M.', 4, 12, 'Worth the wait. Order early, they sell out.', ['Tasted like home']),
  sample('sample_green_bowl', 1, 'Hannah P.', 5, 4, 'My weekly meal prep has never tasted this good. Feels like a treat.', ['Right on time', 'Generous portions']),
  sample('sample_sunrise_plates', 1, 'Andre J.', 5, 2, 'Shrimp & grits that remind me of New Orleans Sundays.', ['Tasted like home', 'Right on time']),
  sample('sample_sunrise_plates', 2, 'Claire D.', 4, 8, 'Biscuits were flaky and huge. Gravy had a nice peppery kick.', ['Generous portions']),
  sample('sample_susies_sweets', 1, 'Monique R.', 5, 1, 'Mrs. Susie’s cobbler is the real deal. We fought over the last spoonful.', ['Tasted like home', 'Will order again']),
  sample('sample_susies_sweets', 2, 'Ben A.', 5, 5, 'Cookies still warm, wrapped like a gift.', ['Packed with care', 'Beautifully presented']),
];
