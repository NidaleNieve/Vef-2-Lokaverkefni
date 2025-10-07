// app/api/restaurants/filter/search/route.ts
import { NextResponse } from 'next/server'
import { serverClient } from '@/utils/supabase/server'

export async function POST(req: Request) {
  const supa = await serverClient()
  const { filters = {}, limit = 12, offset = 0 } = await req.json().catch(() => ({}))

  const {
    min_rating = null,
    max_rating = null,
    city = null,
    price_tags = null,
    active_only = true,
    random = false,

    // NEW cuisines from the client:
    cuisines_any = null,   // string[]
    cuisines_all = null,   // string[]

    // radius
    center_lat = null,
    center_lng = null,
    radius_km = null,
  } = filters || {}

  const hasRadius =
    typeof center_lat === 'number' &&
    typeof center_lng === 'number' &&
    typeof radius_km === 'number' &&
    radius_km > 0

  // --- Radius path via RPC (pass cuisines too!) ---
  if (hasRadius) {
    const { data, error } = await supa.rpc('search_restaurants_by_radius', {
      p_lat: center_lat,
      p_lng: center_lng,
      p_radius_km: radius_km,
      p_min_rating: min_rating,
      p_max_rating: max_rating,
      p_city: city,
      p_price_tags: price_tags,
      p_cuisines_any: cuisines_any,   // << pass through
      p_cuisines_all: cuisines_all,   // << pass through
      p_active_only: active_only,
      p_random: random,
      p_limit: limit,
      p_offset: offset,
    })
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ items: data ?? [], count: null })
  }

  // --- Non-radius path (regular PostgREST filters) ---
  let q = supa
    .from('restaurants')
    .select(`
      id,name,avg_rating,review_count,price_tag,parent_city,is_active,
      cuisines,                                   
      geo:restaurant_geo(lat,lng,formatted_address)
    `, { count: 'exact' })

  if (active_only) q = q.or('is_active.is.null,is_active.eq.true')
  if (min_rating !== null) q = q.gte('avg_rating', min_rating)
  if (max_rating !== null) q = q.lte('avg_rating', max_rating)
  if (city) q = q.ilike('parent_city', `%${city}%`)

  // price tags, including optional "(Unknown)" handling
  if (Array.isArray(price_tags) && price_tags.length) {
    const wantUnknown = price_tags.includes('(Unknown)')
    const actual = price_tags.filter((t: string) => t !== '(Unknown)')
    if (actual.length && wantUnknown) {
      q = q.or(
        `price_tag.in.(${actual.map(s => `"${s}"`).join(',')}),price_tag.is.null`
      )
    } else if (actual.length) {
      q = q.in('price_tag', actual)
    } else if (wantUnknown) {
      q = q.is('price_tag', null)
    }
  }

  // cuisines:
  if (Array.isArray(cuisines_any) && cuisines_any.length) {
    // overlap (ANY-of) → Postgres operator && → supabase-js .overlaps
    q = q.overlaps('cuisines', cuisines_any)
  }
  if (Array.isArray(cuisines_all) && cuisines_all.length) {
    // contains (ALL-of) → Postgres operator @> → supabase-js .contains
    q = q.contains('cuisines', cuisines_all)
  }

  // safe ordering (no random() in order!)
  q = q.order('avg_rating', { ascending: false }).order('review_count', { ascending: false })

  // fetch (range uses inclusive end index)
  const end = offset + Number(limit) - 1
  const { data, error, count } = await q.range(offset, end)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  // optional randomization: shuffle in Node
  let items = data ?? []
  if (random && items.length > 1) {
    for (let i = items.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[items[i], items[j]] = [items[j], items[i]]
    }
  }

  return NextResponse.json({ items, count: count ?? null })
}