// app/api/restaurants/filter/search/route.ts
import { NextResponse } from 'next/server'
import { serverClient } from '@/utils/supabase/server'

export async function POST(req: Request) {
  const supa = await serverClient()

  // inbound body
  const { filters = {}, limit = 12, offset = 0 } = await req.json().catch(() => ({}))

  // unpack common filters
  const {
    min_rating = null,
    max_rating = null,
    city = null,
    price_tags = null,          // e.g. ['$', '$$ - $$$']
    active_only = true,
    random = false,

    // NEW (radius)
    center_lat = null,
    center_lng = null,
    radius_km = null,
  } = filters || {}

  const hasRadius =
    typeof center_lat === 'number' &&
    typeof center_lng === 'number' &&
    typeof radius_km === 'number' &&
    radius_km > 0

  // If radius filters are present, use the PostGIS RPC
  if (hasRadius) {
    const { data, error } = await supa.rpc('search_restaurants_by_radius', {
      p_lat: center_lat,
      p_lng: center_lng,
      p_radius_km: radius_km,
      p_min_rating: min_rating,
      p_max_rating: max_rating,
      p_city: city,
      p_price_tags: price_tags,
      p_active_only: active_only,
      p_random: random,
      p_limit: limit,
      p_offset: offset,
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    // RPC already orders & limits; returning count would cost extra, so null it
    return NextResponse.json({ items: data ?? [], count: null })
  }

  // -------- Fallback: your existing non-radius filter path ----------
  // Keep whatever you already had; a minimal version is included as reference:

  let q = supa
    .from('restaurants')
    .select('id,name,avg_rating,review_count,price_tag,parent_city,is_active', { count: 'exact' })

  if (active_only) q = q.or('is_active.is.null,is_active.eq.true') // treat null as active
  if (min_rating !== null) q = q.gte('avg_rating', min_rating)
  if (max_rating !== null) q = q.lte('avg_rating', max_rating)
  if (city) q = q.ilike('parent_city', `%${city}%`)
  if (Array.isArray(price_tags) && price_tags.length) q = q.in('price_tag', price_tags)

  if (random) {
    // NOTE: random() on big tables can be heavy; it's fine for testing
    q = q.order('id', { ascending: true }) // required before .order('random')
      // @ts-ignore – PostgREST supports `order=random()` syntax via query param; supabase-js uses `order('random')`
      .order('random()') 
  } else {
    q = q.order('avg_rating', { ascending: false }).order('review_count', { ascending: false })
  }

  q = q.range(offset, offset + limit - 1)

  const { data, error, count } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  return NextResponse.json({ items: data ?? [], count: count ?? null })
}