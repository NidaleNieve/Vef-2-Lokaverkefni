// app/api/restaurants/filter/rating/route.ts
import { NextResponse } from 'next/server'
import { serverClient } from '@/utils/supabase/server'

// Example
// /api/restaurants/filter/rating?min=3.5&max=5&limit=20&offset=0

const clamp = (n: number, min: number, max: number) =>
  Math.min(max, Math.max(min, n))

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  let min = Number(searchParams.get('min') ?? 0)
  let max = Number(searchParams.get('max') ?? 5)
  const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit') ?? 50)))
  const offset = Math.max(0, Number(searchParams.get('offset') ?? 0))
  const activeOnly = searchParams.get('activeOnly') !== 'false'

  // Clamp & normalize
  min = clamp(isFinite(min) ? min : 0, 0, 5)
  max = clamp(isFinite(max) ? max : 5, 0, 5)
  if (min > max) [min, max] = [max, min]

  const supa = await serverClient()

  let q = supa
    .from('restaurants')
    .select('id,name,avg_rating,review_count,is_active,parent_city,price_tag', { count: 'exact' })
    .gte('avg_rating', min)
    .lte('avg_rating', max)
    .not('avg_rating', 'is', null)
    .order('avg_rating', { ascending: false })
    .order('review_count', { ascending: false, nullsFirst: false })
    .limit(limit)
    .range(offset, offset + limit - 1)

  if (activeOnly) q = q.eq('is_active', true)

  const { data, error, count } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(
    { items: data ?? [], count, min, max, limit, offset },
    { headers: { 'Cache-Control': 'no-store' } }
  )
}