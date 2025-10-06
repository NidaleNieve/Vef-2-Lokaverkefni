// app/api/restaurants/meta/price-tags/route.ts
import { NextResponse } from 'next/server'
import { serverClient } from '@/utils/supabase/server'

export async function GET() {
  const supa = await serverClient()
  // pick ONE of the RPCs you created
  const { data, error } = await supa.rpc('list_price_tags') // or 'list_price_tags_with_unknown'
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ items: data ?? [] }, { headers: { 'Cache-Control': 'no-store' } })
}