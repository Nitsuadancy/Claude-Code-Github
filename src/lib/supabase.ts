/**
 * The Supabase client, switched on by two settings in `.env`:
 *
 *   EXPO_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
 *   EXPO_PUBLIC_SUPABASE_ANON_KEY=<anon key>
 *
 * Without them `supabase` is null and the app keeps everything on the device,
 * as it does today. The anon key is safe to ship: row-level security decides
 * what each person can read and write. Never put the service-role key here.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

/** True once the Supabase settings are in place. */
export const isBackendConfigured = url.length > 0 && anonKey.length > 0;

/** Public bucket for kitchen, dish and chef photos (see supabase/README.md). */
export const PHOTO_BUCKET = 'public-photos';
/** Private bucket for verification documents. */
export const DOCUMENT_BUCKET = 'documents';

export const supabase: SupabaseClient | null = isBackendConfigured
  ? createClient(url, anonKey, {
      auth: {
        // The static web build renders once without a browser; skip storage there.
        storage: Platform.OS === 'web' && typeof window === 'undefined' ? undefined : AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    })
  : null;

// Keep the sign-in fresh only while the app is on screen, as Supabase recommends.
if (supabase && Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') void supabase.auth.startAutoRefresh();
    else void supabase.auth.stopAutoRefresh();
  });
}

/**
 * Turns a storage path into a URL an <Image> can load. Paths that are already
 * URLs, local files or bundled demo photos are returned as they are.
 */
export function photoUrl(path: string): string {
  if (!supabase || /^(https?:|file:|content:|data:|demo:)/.test(path)) return path;
  return supabase.storage.from(PHOTO_BUCKET).getPublicUrl(path).data.publicUrl;
}
