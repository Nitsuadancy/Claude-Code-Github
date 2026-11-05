import { type Href, router } from 'expo-router';

/**
 * Clears the navigation history and opens `href`. Used when switching between
 * Foodie and Chef, or signing in or out, so old screens don't linger underneath.
 */
export function resetTo(href: Href): void {
  if (router.canDismiss()) router.dismissAll();
  router.replace(href);
}
