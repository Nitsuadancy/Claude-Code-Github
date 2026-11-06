import type { MenuItem } from '@/types';

/**
 * Sections cooks can file dishes under, in the order they appear on the menu.
 * All fit Florida cottage food law; meals and drinks need a licensed kitchen.
 */
export const MENU_SECTIONS = [
  'Specials',
  'Breads',
  'Pastries',
  'Cakes',
  'Pies',
  'Cookies',
  'Candy',
  'Desserts',
  'Pantry',
] as const;

export interface MenuGroup {
  title: string | null;
  items: MenuItem[];
}

/**
 * The menu as customers see it: the signature dish first on its own, then
 * dishes grouped by section in a fixed order, then anything unfiled. When no
 * dish has a section, everything stays in one untitled group.
 */
export function groupMenu(menu: MenuItem[], signatureItemId?: string): MenuGroup[] {
  const signature = menu.find((m) => m.id === signatureItemId);
  const rest = menu.filter((m) => m.id !== signatureItemId);
  const groups: MenuGroup[] = signature ? [{ title: null, items: [signature] }] : [];
  const anySection = rest.some((m) => m.section);
  if (!anySection) {
    if (rest.length) groups.push({ title: null, items: rest });
    return groups;
  }
  for (const section of MENU_SECTIONS) {
    const items = rest.filter((m) => m.section === section);
    if (items.length) groups.push({ title: section, items });
  }
  const unfiled = rest.filter((m) => !m.section || !(MENU_SECTIONS as readonly string[]).includes(m.section));
  if (unfiled.length) groups.push({ title: 'Also on the menu', items: unfiled });
  return groups;
}

/**
 * Opens the kitchen in the Manna app (the "manna" scheme in app.json).
 * Before launch, switch to a https:// universal link on a domain the company owns.
 */
export const SHARE_BASE_URL = 'manna://';

/** Text and link for sharing a kitchen. */
export function kitchenShareMessage(name: string, chefName: string, id: string): { message: string; url: string } {
  const url = `${SHARE_BASE_URL}restaurant/${encodeURIComponent(id)}`;
  return {
    url,
    message: `${name} by ${chefName} is cooking on Manna. Order here: ${url}`,
  };
}
