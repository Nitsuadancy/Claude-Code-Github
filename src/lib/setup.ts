import type { DocumentKind, Restaurant, UserProfile } from '@/types';

import { isValidZip } from './validation';

export type SetupStep = 'information' | 'documents' | 'menu' | 'preview';

export const SETUP_STEPS: { key: SetupStep; title: string }[] = [
  { key: 'information', title: 'Kitchen details' },
  { key: 'documents', title: 'Documents' },
  { key: 'menu', title: 'Menu' },
  { key: 'preview', title: 'Preview & publish' },
];

export const DOCUMENT_TYPES: {
  kind: DocumentKind;
  title: string;
  description: string;
  required: boolean;
}[] = [
  {
    kind: 'food-handler',
    title: 'Food handler certificate',
    description: 'A current food handler or food manager card (for example, ServSafe).',
    required: true,
  },
  {
    kind: 'government-id',
    title: 'Government ID',
    description: 'Used only to verify who you are. Never shown to customers.',
    required: true,
  },
  {
    kind: 'home-kitchen-permit',
    title: 'Local permit (if required)',
    description:
      'Florida cottage food kitchens don’t need a state license. Add a local business tax receipt or permit if your city or county asks for one.',
    required: false,
  },
];

export function isInformationComplete(r: Restaurant | undefined): boolean {
  return (
    !!r &&
    r.name.trim().length > 0 &&
    r.cuisine.trim().length > 0 &&
    r.neighborhood.length > 0 &&
    r.address.trim().length > 0 &&
    r.city.trim().length > 0 &&
    isValidZip(r.areaCode) &&
    r.workingDays.length > 0 &&
    !!r.openTime &&
    !!r.closeTime &&
    r.openTime !== r.closeTime
  );
}

export function isDocumentsComplete(r: Restaurant | undefined): boolean {
  if (!r) return false;
  return DOCUMENT_TYPES.filter((d) => d.required).every((d) =>
    r.documents.some((doc) => doc.kind === d.kind),
  );
}

export function isMenuComplete(r: Restaurant | undefined): boolean {
  return !!r && r.menu.some((m) => m.available);
}

export function completedSteps(r: Restaurant | undefined): Record<SetupStep, boolean> {
  return {
    information: isInformationComplete(r),
    documents: isDocumentsComplete(r),
    menu: isMenuComplete(r),
    preview: r?.status === 'live',
  };
}

/** The first step that still needs work. */
export function currentStep(r: Restaurant | undefined): SetupStep {
  const done = completedSteps(r);
  return SETUP_STEPS.find((s) => !done[s.key])?.key ?? 'preview';
}

export function blankRestaurant(user: UserProfile, id: string): Restaurant {
  return {
    id,
    ownerId: user.id,
    name: '',
    chefName: user.name,
    chefBio: '',
    verified: false,
    prepMinutes: 30,
    cuisine: '',
    categories: [],
    coverUris: [],
    address: '',
    city: '',
    areaCode: '',
    neighborhood: '',
    workingDays: [],
    openTime: '',
    closeTime: '',
    rating: 0,
    ratingCount: 0,
    hasOffer: false,
    createdAt: new Date().toISOString(),
    acceptingOrders: true,
    menu: [],
    documents: [],
    status: 'draft',
  };
}
