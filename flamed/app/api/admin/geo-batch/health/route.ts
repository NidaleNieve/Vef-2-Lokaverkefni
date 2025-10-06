import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    has_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    has_SERVICE_ROLE: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    has_GOOGLE_KEY: !!process.env.GOOGLE_MAPS_API_KEY,
  })
}