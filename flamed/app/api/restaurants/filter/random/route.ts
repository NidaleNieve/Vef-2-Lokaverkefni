// app/api/restaurants/filter/random/route.ts
import { NextResponse } from 'next/server'
import { getRandomRestaurants } from '@/lib/services/restaurants'

// optional: clamp helper
const clamp = (n: number, min: number, max: number) =>
  Math.min(max, Math.max(min, n))

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const rawLimit = Number(searchParams.get('limit') ?? 10)
    const limit = clamp(Number.isFinite(rawLimit) ? rawLimit : 12, 1, 100)

    console.log('Calling getRandomRestaurants with limit:', limit)
    const items = await getRandomRestaurants(limit)
    console.log('getRandomRestaurants returned:', items)
    
    // no-store: random results shouldn't be cached
    return NextResponse.json(
      { items, limit },
      { headers: { 'Cache-Control': 'no-store' } }
    )
  } catch (e: any) {
    console.error('Error in route:', e)
    return NextResponse.json(
      { error: e?.message || 'Unexpected error' },
      { status: 400 }
    )
  }
}