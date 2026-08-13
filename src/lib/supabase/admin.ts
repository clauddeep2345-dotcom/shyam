import { createClient } from '@supabase/supabase-js';

// Service-role client bypasses RLS — use ONLY for admin operations
// on the server side (e.g., creating users, backup triggers).
// NEVER expose this client to the browser.
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
