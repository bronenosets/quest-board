import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types";

// Service-role client for server-only code (API routes, cron). Bypasses RLS.
// NEVER import this from a client component.
export function createAdminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}
