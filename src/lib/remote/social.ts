/**
 * Sign in with Apple and Google, through Supabase. Each returns who signed
 * in, or null when the person backed out. See src/lib/sign-in-options.ts for
 * when the buttons show.
 *
 * - Apple: the iPhone's own sheet gives an identity token, checked by
 *   Supabase with a one-time nonce. Apple shares the name only the first time.
 * - Google: Supabase's Google page opens in a browser sheet and returns to
 *   manna://auth-callback with a one-time code, swapped for a session.
 */
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import type * as AppleSdk from 'expo-apple-authentication';
import type * as CryptoSdk from 'expo-crypto';

import { codeFromRedirect } from '@/lib/sign-in-options';

import { RemoteError, type Db } from './api';

export interface SocialSignIn {
  userId: string;
  name: string;
  email: string;
}

export async function signInWithApple(db: Db): Promise<SocialSignIn | null> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Apple = require('expo-apple-authentication') as typeof AppleSdk;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Crypto = require('expo-crypto') as typeof CryptoSdk;
  const nonce = Crypto.randomUUID();
  let credential: AppleSdk.AppleAuthenticationCredential;
  try {
    credential = await Apple.signInAsync({
      requestedScopes: [Apple.AppleAuthenticationScope.FULL_NAME, Apple.AppleAuthenticationScope.EMAIL],
      nonce: await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, nonce),
    });
  } catch (e) {
    if ((e as { code?: string }).code === 'ERR_REQUEST_CANCELED') return null;
    throw new RemoteError('Sign in with Apple didn’t work. Try again or use your phone number.');
  }
  if (!credential.identityToken) throw new RemoteError('Apple didn’t confirm who you are. Try again.');
  const { data, error } = await db.auth.signInWithIdToken({ provider: 'apple', token: credential.identityToken, nonce });
  if (error || !data.user) throw new RemoteError(error?.message ?? 'Sign in with Apple didn’t work.');
  const name = [credential.fullName?.givenName, credential.fullName?.familyName].filter(Boolean).join(' ');
  return { userId: data.user.id, name, email: credential.email ?? data.user.email ?? '' };
}

export async function signInWithGoogle(db: Db): Promise<SocialSignIn | null> {
  const redirectTo = Linking.createURL('auth-callback');
  const { data, error } = await db.auth.signInWithOAuth({ provider: 'google', options: { redirectTo, skipBrowserRedirect: true } });
  if (error || !data.url) throw new RemoteError(error?.message ?? 'Google sign-in isn’t available right now.');
  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type !== 'success') return null;
  const code = codeFromRedirect(result.url);
  if (!code) throw new RemoteError('Google didn’t finish signing you in. Try again.');
  const session = await db.auth.exchangeCodeForSession(code);
  const user = session.data.user;
  if (session.error || !user) throw new RemoteError(session.error?.message ?? 'Google sign-in didn’t work.');
  const meta = (user.user_metadata ?? {}) as { full_name?: string; name?: string };
  return { userId: user.id, name: meta.full_name ?? meta.name ?? '', email: user.email ?? '' };
}
