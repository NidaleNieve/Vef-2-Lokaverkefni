// app/api/restaurants/filter/price/route.ts
import { NextResponse } from 'next/server'
import { serverClient } from '@/utils/supabase/server'

const clamp = (n:number, lo:number, hi:number)=>Math.min(hi, Math.max(lo, n))

// Build a PostgREST array literal like {"$", "$$ - $$$"}
function toPostgrestArray(values: string[]) {
  // Escape double-quotes inside values if any (rare here)
  const escaped = values.map(v => `"${v.replace(/"/g, '\\"')}"`)
  return `{${escaped.join(',')}}`
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)

  // multiple tags can be provided via repeated ?tag= param or a single comma string
  const rawTags = searchParams.getAll('tag')
  const splitComma = (searchParams.get('tags') || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)
  const tags = [...rawTags, ...splitComma]

  const limit = clamp(Number(searchParams.get('limit') ?? 50), 1, 100)
  const offset = Math.max(0, Number(searchParams.get('offset') ?? 0))
  const activeOnly = searchParams.get('activeOnly') !== 'false'

  // Known price tags in your dataset
  const KNOWN = new Set(['$', '$$ - $$$', '$$$$'])
  const includeUnknown = tags.some(t => t === '(Unknown)')
  const knownTags = tags.filter(t => KNOWN.has(t))

  const supa = await serverClient()
  let q = supa
    .from('restaurants')
    .select('id,name,avg_rating,review_count,parent_city,price_tag,cuisines,is_active', { count: 'exact' })

  if (activeOnly) q = q.eq('is_active', true)

  // Apply price filters
  if (includeUnknown && knownTags.length > 0) {
    // price_tag IS NULL OR price_tag = '' OR price_tag IN (knownTags)
    const pgArray = toPostgrestArray(knownTags)
    q = q.or(`price_tag.is.null,price_tag.eq.,price_tag.in.${pgArray}`)
  } else if (includeUnknown && knownTags.length === 0) {
    // Only unknown
    q = q.or('price_tag.is.null,price_tag.eq.')
  } else if (!includeUnknown && knownTags.length > 0) {
    q = q.in('price_tag', knownTags)
  }
  // else: no price filter applied

  // Sort: you can choose any ordering; here's a sensible one
  q = q
    .order('avg_rating', { ascending: false, nullsFirst: false })
    .order('review_count', { ascending: false, nullsFirst: false })
    .order('name', { ascending: true })
    .range(offset, offset + limit - 1)

  const { data, error, count } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(
    { items: data ?? [], count, limit, offset, tags },
    { headers: { 'Cache-Control': 'no-store' } }
  )
}