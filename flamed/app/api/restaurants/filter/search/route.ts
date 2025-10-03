// app/api/restaurants/filter/search/route.ts
import { NextResponse } from 'next/server'
import { serverClient } from '@/utils/supabase/server'

type Filters = {
  min_rating?: number | null
  max_rating?: number | null
  city?: string | null
  cuisines_any?: string[] | null     // match ANY cuisine
  cuisines_all?: string[] | null     // require ALL cuisines
  price_tags?: string[] | null       // e.g. ['$', '$$']
  active_only?: boolean | null
  name_ilike?: string | null
  random?: boolean | null
}

const clamp = (n:number, lo:number, hi:number)=>Math.min(hi, Math.max(lo, n))

export async function POST(req: Request) {
  try {
    const { filters = {}, limit = 50, offset = 0 } = await req.json().catch(() => ({}))
    const supa = await serverClient()

    const lim = clamp(Number(limit) || 50, 1, 100)
    const off = Math.max(0, Number(offset) || 0)
    const f: Filters = {
      min_rating: filters.min_rating ?? null,
      max_rating: filters.max_rating ?? null,
      city: filters.city?.trim() || null,
      cuisines_any: Array.isArray(filters.cuisines_any) ? filters.cuisines_any : null,
      cuisines_all: Array.isArray(filters.cuisines_all) ? filters.cuisines_all : null,
      price_tags: Array.isArray(filters.price_tags) ? filters.price_tags : null,
      active_only: filters.active_only ?? true,
      name_ilike: filters.name_ilike?.trim() || null,
      random: !!filters.random,
    }

    // clamp ratings to [0,5]
    if (f.min_rating != null) f.min_rating = clamp(+f.min_rating || 0, 0, 5)
    if (f.max_rating != null) f.max_rating = clamp(+f.max_rating || 5, 0, 5)
    if (f.min_rating != null && f.max_rating != null && f.min_rating > f.max_rating) {
      const t = f.min_rating; f.min_rating = f.max_rating; f.max_rating = t
    }

    // Debug logging
    console.log('🔍 Search filters:', JSON.stringify(f, null, 2))

    let q = supa
      .from('restaurants')
      .select('id,name,avg_rating,review_count,price_tag,parent_city,cuisines,is_active', { count: 'exact' })

    if (f.active_only) q = q.eq('is_active', true)
    if (f.min_rating != null) q = q.gte('avg_rating', f.min_rating)
    if (f.max_rating != null) q = q.lte('avg_rating', f.max_rating)
    if (f.min_rating != null || f.max_rating != null) q = q.not('avg_rating', 'is', null)

    if (f.city) q = q.ilike('parent_city', f.city) // or `%${f.city}%` if you want contains

    // Cuisine filtering - PostgREST array operations
    if (f.cuisines_any?.length) {
      // For "any" cuisine matching, use overlaps (array && array)
      // Alternative approach: use cs (contains) with individual OR conditions
      console.log('🍽️ Filtering by cuisines_any:', f.cuisines_any)
      q = q.overlaps('cuisines', f.cuisines_any)
    }
    if (f.cuisines_all?.length) {
      // For "all" cuisines required, use contains (array @> array)  
      console.log('🍽️ Filtering by cuisines_all:', f.cuisines_all)
      q = q.contains('cuisines', f.cuisines_all)
    }

    if (f.price_tags?.length) q = q.in('price_tag', f.price_tags)

    if (f.name_ilike) q = q.ilike('name', `%${f.name_ilike}%`)

    if (!f.random) {
      q = q
        .order('avg_rating', { ascending: false, nullsFirst: false })
        .order('review_count', { ascending: false, nullsFirst: false })
        .order('name', { ascending: true })
    }

    const poolSize = f.random ? Math.min(lim * 4, 400) : lim
    q = q.range(off, off + poolSize - 1)

    const { data, error, count } = await q
    console.log('🎯 Query result:', { 
      itemCount: data?.length, 
      totalCount: count, 
      error: error?.message,
      sampleItem: data?.[0] 
    })
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    let items = data ?? []
    if (f.random) {
      for (let i = items.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[items[i], items[j]] = [items[j], items[i]]
      }
      items = items.slice(0, lim)
    }

    return NextResponse.json(
      { items, count, limit: lim, offset: off, filters: f },
      { headers: { 'Cache-Control': 'no-store' } }
    )
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Unexpected error' }, { status: 500 })
  }
}