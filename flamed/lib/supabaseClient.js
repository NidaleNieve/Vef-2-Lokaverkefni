import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

//error handling
if (!url || !anonKey) {
  console.error('Supabase configuration error: Missing environment variables. Please check your .env.local file.');
  console.error('Required variables: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY');
  throw new Error('Supabase environment variables are not configured properly');
}

//skila client
export const supabase = createClient(url, anonKey);