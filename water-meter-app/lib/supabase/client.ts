import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import type { Database } from "./types"

/**
 * Singleton browser-side Supabase client.
 * Requires the env vars:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY
 */
let supabaseClient: ReturnType<typeof createClientComponentClient<Database>> | null = null

export function createClient() {
  if (!supabaseClient) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    supabaseClient = createClientComponentClient<Database>({
      supabaseUrl,
      supabaseKey,
    })
  }
  return supabaseClient
}
