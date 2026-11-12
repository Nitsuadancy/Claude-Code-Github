/**
 * Which sign-in buttons the app shows. Phone sign-in is always there. Apple
 * and Google switch on with the backend and one setting in `.env`:
 *
 *   EXPO_PUBLIC_SIGN_IN_WITH=apple,google
 *
 * Each provider also has to be set up in Supabase (docs/GO_LIVE.md, step 1).
 */
export type SocialProvider = 'apple' | 'google';

export function parseProviders(setting: string | undefined): SocialProvider[] {
  const wanted = (setting ?? '').split(',').map((s) => s.trim().toLowerCase());
  return (['apple', 'google'] as const).filter((p) => wanted.includes(p));
}

/**
 * The buttons for this phone. Sign in with Apple exists only on Apple
 * devices. Apple's rules (guideline 4.8) require it on iPhone whenever Google
 * is offered, so Google is hidden there unless Apple is on too.
 */
export function signInProviders(
  configured: SocialProvider[],
  platform: string,
  backendOn: boolean,
): SocialProvider[] {
  if (!backendOn) return [];
  const apple = configured.includes('apple') && platform === 'ios';
  const google = configured.includes('google') && (platform !== 'ios' || apple);
  return [...(apple ? (['apple'] as const) : []), ...(google ? (['google'] as const) : [])];
}

/** The one-time code in the address Google sign-in returns to. */
export function codeFromRedirect(url: string): string | null {
  const match = /[?&#]code=([^&#]+)/.exec(url);
  return match ? decodeURIComponent(match[1]) : null;
}
