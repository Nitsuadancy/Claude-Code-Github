import type { Restaurant } from '@/types';

/** Things a cook did outside the app that Manna can't see in their kitchen data. */
export type SharedStep = 'story' | 'link';

export interface FirstOrderStep {
  id: 'photos' | 'bio' | SharedStep;
  title: string;
  body: string;
  done: boolean;
}

/**
 * The "Get your first order" checklist on a new cook's dashboard: the few
 * things that most help a kitchen with no orders yet.
 */
export function firstOrderSteps(restaurant: Restaurant, shared: readonly SharedStep[]): FirstOrderStep[] {
  const dishes = restaurant.menu.filter((m) => m.available);
  return [
    {
      id: 'photos',
      title: 'Add a photo to every dish',
      body: 'Customers order what they can see. Natural light, close up.',
      done: dishes.length > 0 && dishes.every((m) => !!m.photoUri),
    },
    {
      id: 'bio',
      title: 'Tell your story',
      body: 'A few lines about you and where your recipes come from.',
      done: restaurant.chefBio.trim().length > 0,
    },
    {
      id: 'story',
      title: 'Post your Story card on Instagram',
      body: 'Your followers scan the QR code and order in one tap.',
      done: shared.includes('story'),
    },
    {
      id: 'link',
      title: 'Text your link to your regulars',
      body: 'The people who already buy from you are your first orders.',
      done: shared.includes('link'),
    },
  ];
}
