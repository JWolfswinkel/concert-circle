import { createBrowserClient } from '@supabase/ssr'

// We export a typed helper so call sites can still benefit from our manual types
// without fighting the Supabase v2 generic inference changes.
export function createClient() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return createBrowserClient<any>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
