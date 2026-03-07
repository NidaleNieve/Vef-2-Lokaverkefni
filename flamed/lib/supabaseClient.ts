import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
// Support both common names used across the repo and older examples
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  // Warn instead of throwing so build/time-of-check isn't blocked — Vercel should have these set.
  // Runtime will still fail if these are missing in production, so set them in Vercel dashboard.
  // eslint-disable-next-line no-console
  console.warn('Supabase env vars missing. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY (or PUBLISHABLE_KEY) in Vercel.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);