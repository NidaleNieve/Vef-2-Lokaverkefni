// app/api/admin/geo-upsert/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { serverClient } from '@/utils/supabase/server'

// POST /api/admin/geo-upsert - Geocode restaurant and update location data (admin only)
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const { restaurant_id, name, city, force = false } = body

    // Input validation
    if (!restaurant_id || !name || !city) {
      return NextResponse.json(
        { 
          error: 'restaurant_id, name, and city are required',
          code: 'MISSING_REQUIRED_FIELDS',
          missingFields: [
            ...(!restaurant_id ? ['restaurant_id'] : []),
            ...(!name ? ['name'] : []),
            ...(!city ? ['city'] : [])
          ]
        }, 
        { status: 422 }
      )
    }

    if (typeof restaurant_id !== 'string' || typeof name !== 'string' || typeof city !== 'string') {
      return NextResponse.json(
        { 
          error: 'restaurant_id, name, and city must be strings',
          code: 'INVALID_INPUT_TYPE' 
        }, 
        { status: 422 }
      )
    }

    if (force !== undefined && typeof force !== 'boolean') {
      return NextResponse.json(
        { 
          error: 'force must be a boolean',
          code: 'INVALID_FORCE_TYPE' 
        }, 
        { status: 422 }
      )
    }

    // 1) Require a signed-in user
    const userScoped = await serverClient()
    const { data: { user }, error: userError } = await userScoped.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json(
        { 
          error: 'Authentication required',
          code: 'UNAUTHORIZED' 
        }, 
        { status: 401 }
      )
    }

    // 2) Admin check
    const { data: adminRow, error: adminErr } = await userScoped
      .from('admins')
      .select('user_id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (adminErr) {
      console.error('Admin check error:', adminErr)
      return NextResponse.json(
        { 
          error: 'Failed to verify admin status',
          code: 'ADMIN_CHECK_ERROR' 
        }, 
        { status: 500 }
      )
    }

    if (!adminRow) {
      return NextResponse.json(
        { 
          error: 'Admin privileges required',
          code: 'INSUFFICIENT_PERMISSIONS' 
        }, 
        { status: 403 }
      )
    }

    // 3) Check server environment variables
    const GOOGLE_KEY = process.env.GOOGLE_MAPS_API_KEY
    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
    const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!GOOGLE_KEY) {
      return NextResponse.json(
        { 
          error: 'Google Maps API key not configured',
          code: 'MISSING_GOOGLE_API_KEY' 
        }, 
        { status: 500 }
      )
    }

    if (!SUPABASE_URL || !SERVICE_ROLE) {
      return NextResponse.json(
        { 
          error: 'Supabase configuration missing',
          code: 'MISSING_SUPABASE_CONFIG' 
        }, 
        { status: 500 }
      )
    }

    // 4) Create admin client with service role
    const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE)

    // 5) Check if restaurant exists
    const { data: restaurant, error: restaurantError } = await adminClient
      .from('restaurants')
      .select('id, name')
      .eq('id', restaurant_id)
      .single()

    if (restaurantError) {
      if (restaurantError.code === 'PGRST116') { // not found
        return NextResponse.json(
          { 
            error: 'Restaurant not found',
            code: 'RESTAURANT_NOT_FOUND' 
          }, 
          { status: 404 }
        )
      }
      
      return NextResponse.json(
        { 
          error: restaurantError.message,
          code: 'RESTAURANT_FETCH_ERROR' 
        }, 
        { status: 400 }
      )
    }

    // 6) Freshness check to avoid spamming Google (unless force = true)
    if (!force) {
      const { data: existing, error: geoError } = await adminClient
        .from('restaurant_geo')
        .select('updated_at, lat, lng, formatted_address')
        .eq('restaurant_id', restaurant_id)
        .maybeSingle()

      if (geoError && geoError.code !== 'PGRST116') {
        console.error('Geo fetch error:', geoError)
        return NextResponse.json(
          { 
            error: 'Failed to check existing geo data',
            code: 'GEO_CHECK_ERROR' 
          }, 
          { status: 500 }
        )
      }

      if (existing?.updated_at) {
        const ageDays = (Date.now() - new Date(existing.updated_at).getTime()) / (1000 * 60 * 60 * 24)
        if (ageDays < 30) {
          return NextResponse.json({
            data: {
              restaurant_id,
              lat: existing.lat,
              lng: existing.lng,
              formatted_address: existing.formatted_address,
              skipped: true,
              reason: 'Data is fresh (less than 30 days old)',
              age_days: Math.round(ageDays * 10) / 10
            },
            message: 'Skipped geocoding due to fresh data'
          })
        }
      }
    }

    // 7) Call Google Geocoding API
    const query = encodeURIComponent(`${name.trim()}, ${city.trim()}`)
    const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${query}&key=${GOOGLE_KEY}`
    
    let geocodeResponse
    try {
      geocodeResponse = await fetch(geocodeUrl)
    } catch (fetchError: any) {
      console.error('Google API fetch error:', fetchError)
      return NextResponse.json(
        { 
          error: 'Failed to connect to Google Maps API',
          code: 'GEOCODE_API_CONNECTION_ERROR' 
        }, 
        { status: 502 }
      )
    }

    let geocodeData
    try {
      geocodeData = await geocodeResponse.json()
    } catch (parseError: any) {
      console.error('Google API parse error:', parseError)
      return NextResponse.json(
        { 
          error: 'Invalid response from Google Maps API',
          code: 'GEOCODE_API_PARSE_ERROR' 
        }, 
        { status: 502 }
      )
    }

    if (geocodeData.status !== 'OK' || !geocodeData.results?.length) {
      const errorMessage = geocodeData.error_message || geocodeData.status || 'Unknown geocoding error'
      
      // Handle specific Google API errors
      let errorCode = 'GEOCODE_FAILED'
      if (geocodeData.status === 'ZERO_RESULTS') {
        errorCode = 'GEOCODE_NO_RESULTS'
      } else if (geocodeData.status === 'OVER_QUERY_LIMIT') {
        errorCode = 'GEOCODE_QUOTA_EXCEEDED'
      } else if (geocodeData.status === 'REQUEST_DENIED') {
        errorCode = 'GEOCODE_REQUEST_DENIED'
      }
      
      return NextResponse.json(
        { 
          error: `Geocoding failed: ${errorMessage}`,
          code: errorCode,
          geocode_status: geocodeData.status
        }, 
        { status: 400 }
      )
    }

    // 8) Extract location data from best result
    const bestResult = geocodeData.results[0]
    const location = bestResult?.geometry?.location
    const lat = location?.lat
    const lng = location?.lng

    if (typeof lat !== 'number' || typeof lng !== 'number') {
      return NextResponse.json(
        { 
          error: 'No valid coordinates in geocoding result',
          code: 'GEOCODE_NO_COORDINATES' 
        }, 
        { status: 400 }
      )
    }

    // Extract additional geocoding metadata
    const place_id = bestResult.place_id || null
    const formatted_address = bestResult.formatted_address || null
    const accuracy = bestResult.geometry?.location_type || null
    const partial_match = bestResult.partial_match || false

    // 9) Upsert into restaurant_geo table (service role bypasses RLS)
    const geoData = {
      restaurant_id,
      lat,
      lng,
      place_id,
      formatted_address,
      accuracy,
      partial_match,
      provider: 'google',
      query_used: `${name.trim()}, ${city.trim()}`,
      updated_at: new Date().toISOString(),
    }

    const { data: upsertedGeo, error: upsertError } = await adminClient
      .from('restaurant_geo')
      .upsert(geoData, { onConflict: 'restaurant_id' })
      .select()
      .single()

    if (upsertError) {
      console.error('Geo upsert error:', upsertError)
      return NextResponse.json(
        { 
          error: 'Failed to save geocoding data',
          code: 'GEO_UPSERT_ERROR',
          details: upsertError.message 
        }, 
        { status: 400 }
      )
    }

    return NextResponse.json({
      data: {
        restaurant_id,
        restaurant_name: restaurant.name,
        lat,
        lng,
        place_id,
        formatted_address,
        accuracy,
        partial_match,
        provider: 'google',
        query_used: geoData.query_used,
        updated_at: geoData.updated_at,
        forced: force
      },
      message: 'Restaurant location geocoded successfully'
    }, { status: 201 })

  } catch (error: any) {
    console.error('Admin geo-upsert error:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        code: 'INTERNAL_ERROR' 
      }, 
      { status: 500 }
    )
  }
}