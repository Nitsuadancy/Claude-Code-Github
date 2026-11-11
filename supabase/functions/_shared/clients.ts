/**
 * Stripe and Supabase for the Edge Functions. Secrets come from the project's
 * function secrets (see docs/GO_LIVE.md); nothing here ships in the app.
 */
import Stripe from 'npm:stripe@17';
import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2';

import { Refusal } from './http.ts';

export function env(name: string): string {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Missing secret ${name}`);
  return value;
}

export const stripe = new Stripe(env('STRIPE_SECRET_KEY'), { httpClient: Stripe.createFetchHttpClient() });

/** The service-role client: bypasses row-level security, so use it only after checking who's asking. */
export const admin: SupabaseClient = createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), {
  auth: { persistSession: false },
});

/** The signed-in person making the request, from their Supabase session token. */
export async function requireUser(req: Request): Promise<{ id: string; phone?: string; email?: string }> {
  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  if (!token) throw new Refusal('Sign in first.', 401);
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) throw new Refusal('Sign in first.', 401);
  return { id: data.user.id, phone: data.user.phone ?? undefined, email: data.user.email ?? undefined };
}

/** Where Stripe sends people back after onboarding or checkout. */
export const SITE_URL = Deno.env.get('SITE_URL') ?? 'https://example.com';
