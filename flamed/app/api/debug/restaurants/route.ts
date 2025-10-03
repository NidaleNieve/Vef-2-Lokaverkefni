// app/api/debug/restaurants/route.ts
import { NextResponse } from 'next/server'
import { serverClient } from '@/utils/supabase/server'

export async function GET() {
  try {
    const supa = await serverClient()
    
    // Get a sample of restaurants with their cuisines
    const { data: restaurants, error } = await supa
      .from('restaurants')
      .select('id,name,cuisines,is_active')
      .limit(10)
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    // Also get cuisine metadata
    const { data: cuisinesMeta, error: cuisinesError } = await supa.rpc('list_cuisines')
    
    return NextResponse.json({
      sampleRestaurants: restaurants,
      cuisinesMeta: cuisinesMeta,
      cuisinesError: cuisinesError?.message
    })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Unexpected error' }, { status: 500 })
  }
}