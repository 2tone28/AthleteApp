import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/database'

// Client-side Supabase client (for use in client components)
export const createSupabaseClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    // In development, show helpful error
    if (process.env.NODE_ENV === 'development') {
      console.error(
        '❌ Missing Supabase environment variables!\n' +
        'Please add these to your .env.local file:\n' +
        '  - NEXT_PUBLIC_SUPABASE_URL\n' +
        '  - NEXT_PUBLIC_SUPABASE_ANON_KEY\n' +
        '\nGet these from: https://supabase.com/dashboard/project/_/settings/api'
      )
    }
    
    // Return a client that will fail gracefully when methods are called
    // This prevents the app from crashing immediately
    return createBrowserClient<Database>(
      supabaseUrl || 'https://placeholder.supabase.co',
      supabaseAnonKey || 'placeholder-key'
    )
  }

  return createBrowserClient<Database>(
    supabaseUrl,
    supabaseAnonKey
  )
}
