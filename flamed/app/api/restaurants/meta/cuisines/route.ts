// app/api/restaurants/meta/cuisines/route.ts
import { NextResponse } from 'next/server'
import { serverClient } from '@/utils/supabase/server'

export async function GET() {
  const supa = await serverClient()
  const { data, error } = await supa.rpc('list_cuisines')
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ items: data ?? [] }, { headers: { 'Cache-Control': 'no-store' } })
}