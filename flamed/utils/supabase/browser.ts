import { createBrowserClient } from '@supabase/ssr'

// Lightweight browser-side Supabase client factory.
// Use inside Client Components / hooks. Avoid calling in Server Components.
export const supabaseBrowser = () =>
  createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  )

// Example usage (client component):
// 'use client'
// import { supabaseBrowser } from '@/utils/supabase/browser'
// const supabase = supabaseBrowser()
// const { data } = await supabase.from('restaurants').select('*').limit(10)
