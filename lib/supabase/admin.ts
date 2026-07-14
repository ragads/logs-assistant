import { createClient } from "@supabase/supabase-js";

/**
 * Service-role client for OUR project. Bypasses RLS — server-only.
 * Returns null if the service role key isn't configured (some features,
 * e.g. hard account deletion, are then unavailable).
 */
export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) return null;

  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
}
