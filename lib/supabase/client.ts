import { createBrowserClient } from "@supabase/ssr";

/**
 * Browser-side Supabase client for use in Client Components.
 * All data access goes through Row Level Security, so users can only
 * ever read/write their own rows.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
