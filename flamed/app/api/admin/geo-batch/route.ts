// app/api/admin/geo-batch/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { serverClient } from '@/utils/supabase/server'

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

const where = (w: string, err?: unknown) =>
  NextResponse.json({ error: 'fail', where: w, details: (err as any)?.message ?? err }, { status: 500 })

// POST /api/admin/geo-batch - Batch geocode restaurants (admin only)
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const { 
      limit = 100, 
      maxAgeDays = 30, 
      concurrency = 2, 
      force = false,
      delayMs = 120 
    } = body

    // Input validation
    const lim = Math.max(1, Math.min(1000, Number(limit)))
    const maxAge = Math.max(0, Number(maxAgeDays))
    const conc = Math.max(1, Math.min(10, Number(concurrency)))
    const delay = Math.max(50, Math.min(5000, Number(delayMs)))

    if (typeof force !== 'boolean') {
      return NextResponse.json(
        { 
          error: 'force must be a boolean',
          code: 'INVALID_FORCE_TYPE' 
        }, 
        { status: 422 }
      )
    }

        // auth
    const userScoped = await serverClient()
    const { data: { user } } = await userScoped.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // admin check
    const { data: adminRow, error: adminErr } = await userScoped
      .from('admins').select('user_id').eq('user_id', user.id).maybeSingle()
    if (adminErr) return where('adminCheck', adminErr)
    if (!adminRow) return NextResponse.json({ error: 'Admins only' }, { status: 403 })

    // env
    const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL
    const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY
    const GOOGLE_KEY = process.env.GOOGLE_MAPS_API_KEY
    if (!SUPABASE_URL) return where('env:SUPABASE_URL')
    if (!SERVICE_ROLE) return where('env:SUPABASE_SERVICE_ROLE_KEY')
    if (!GOOGLE_KEY) return where('env:GOOGLE_MAPS_API_KEY')

    // create admin client (service role; bypasses RLS)
    const admin = createClient(SUPABASE_URL!, SERVICE_ROLE!, {
      auth: { persistSession: false }
    })

    // pull candidates
    const { data: candidates, error: listErr } = await admin.rpc('list_restaurants_needing_geo', {
      p_limit: lim, 
      p_max_age_days: maxAge
    })
    if (listErr) return where('rpc:list_restaurants_needing_geo', listErr)

    const items: Array<{ id: string; name: string; parent_city: string }> = candidates ?? []
    
    if (!items.length) {
      return NextResponse.json({
        data: {
          requested: lim,
          processed: 0,
          skipped: 0,
          failed: 0,
          errors: [],
          candidates_found: 0
        },
        message: 'No candidate restaurants found for geocoding'
      })
    }

    // 6) Batch processing with concurrency control
    let idx = 0
    let processed = 0
    let skipped = 0
    const errors: Array<{ id: string; name: string; error: string; error_code: string }> = []
    const successful: Array<{ id: string; name: string; lat: number; lng: number }> = []

    async function worker(workerId: number) {
      while (idx < items.length) {
        const myIndex = idx++
        const item = items[myIndex]
        if (!item) break

        try {
          // Optional freshness check unless force = true
          if (!force) {
            const { data: existing, error: existingError } = await admin
              .from('restaurant_geo')
              .select('updated_at')
              .eq('restaurant_id', item.id)
              .maybeSingle()

            if (existingError && existingError.code !== 'PGRST116') {
              console.error(`Worker ${workerId}: Freshness check error for ${item.id}:`, existingError)
              // Continue processing despite freshness check error
            }

            if (existing?.updated_at) {
              const ageDays = (Date.now() - new Date(existing.updated_at).getTime()) / (1000 * 60 * 60 * 24)
              if (ageDays < maxAge) {
                skipped++
                continue
              }
            }
          }

          // Geocode with Google Maps API
          const query = encodeURIComponent(`${item.name}, ${item.parent_city ?? ''}`)
          const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${query}&key=${GOOGLE_KEY}`
          
          let geocodeResponse
          try {
            geocodeResponse = await fetch(geocodeUrl)
          } catch (fetchError: any) {
            console.error(`Worker ${workerId}: Google API fetch error for ${item.id}:`, fetchError)
            errors.push({ 
              id: item.id, 
              name: item.name, 
              error: 'Failed to connect to Google Maps API',
              error_code: 'GEOCODE_API_CONNECTION_ERROR'
            })
            continue
          }

          let geocodeData
          try {
            geocodeData = await geocodeResponse.json()
          } catch (parseError: any) {
            console.error(`Worker ${workerId}: Google API parse error for ${item.id}:`, parseError)
            errors.push({ 
              id: item.id, 
              name: item.name, 
              error: 'Invalid response from Google Maps API',
              error_code: 'GEOCODE_API_PARSE_ERROR'
            })
            continue
          }

          if (geocodeData.status !== 'OK' || !geocodeData.results?.length) {
            const errorMessage = geocodeData.error_message || geocodeData.status || 'Unknown geocoding error'
            let errorCode = 'GEOCODE_FAILED'
            
            if (geocodeData.status === 'ZERO_RESULTS') {
              errorCode = 'GEOCODE_NO_RESULTS'
            } else if (geocodeData.status === 'OVER_QUERY_LIMIT') {
              errorCode = 'GEOCODE_QUOTA_EXCEEDED'
            } else if (geocodeData.status === 'REQUEST_DENIED') {
              errorCode = 'GEOCODE_REQUEST_DENIED'
            }
            
            errors.push({ 
              id: item.id, 
              name: item.name, 
              error: `Geocoding failed: ${errorMessage}`,
              error_code: errorCode
            })
            continue
          }

          const best = geocodeData.results[0]
          const location = best?.geometry?.location
          const lat = location?.lat
          const lng = location?.lng

          if (typeof lat !== 'number' || typeof lng !== 'number') {
            errors.push({ 
              id: item.id, 
              name: item.name, 
              error: 'No valid coordinates in geocoding result',
              error_code: 'GEOCODE_NO_COORDINATES'
            })
            continue
          }

          // Upsert geo data
          const geoData = {
            restaurant_id: item.id,
            lat,
            lng,
            place_id: best.place_id || null,
            formatted_address: best.formatted_address || null,
            accuracy: best.geometry?.location_type || null,
            provider: 'google',
            updated_at: new Date().toISOString(),
          }

          const { error: upsertErr } = await admin
            .from('restaurant_geo')
            .upsert(geoData, { onConflict: 'restaurant_id' })

          if (upsertErr) {
            console.error(`Worker ${workerId}: Upsert error for ${item.id}:`, upsertErr)
            errors.push({ 
              id: item.id, 
              name: item.name, 
              error: `Failed to save geo data: ${upsertErr.message}`,
              error_code: 'GEO_UPSERT_ERROR'
            })
            continue
          }

          successful.push({ 
            id: item.id, 
            name: item.name, 
            lat, 
            lng 
          })
          processed++

          // Rate limiting delay to be kind to Google API
          await sleep(delay)

        } catch (e: any) {
          console.error(`Worker ${workerId}: Unexpected error for ${item.id}:`, e)
          errors.push({ 
            id: item.id, 
            name: item.name, 
            error: e?.message ?? 'Unknown error',
            error_code: 'UNEXPECTED_ERROR'
          })
        }
      }
    }

    // Run workers in parallel
    const startTime = Date.now()
    await Promise.all(Array.from({ length: conc }, (_, i) => worker(i)))
    const endTime = Date.now()
    const durationSeconds = Math.round((endTime - startTime) / 1000)

    return NextResponse.json({
      data: {
        requested: lim,
        candidates_found: items.length,
        processed,
        skipped,
        failed: errors.length,
        successful_geocodes: successful.slice(0, 10), // Sample of successful results
        errors: errors.slice(0, 25), // Cap error payload size
        processing_time_seconds: durationSeconds,
        concurrency: conc,
        delay_ms: delay,
        force_mode: force
      },
      message: `Batch geocoding completed: ${processed} processed, ${skipped} skipped, ${errors.length} failed`
    })

  } catch (error: any) {
    console.error('Admin geo-batch error:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        code: 'INTERNAL_ERROR' 
      }, 
      { status: 500 }
    )
  }
}