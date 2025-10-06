// app/api/admin/restaurants/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { serverClient } from '@/utils/supabase/server'

// POST /api/admin/restaurants - Create a new restaurant (admin only)
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))

    // Require a signed-in user
    const supaUser = await serverClient()
    const { data: { user }, error: userError } = await supaUser.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json(
        { 
          error: 'Authentication required',
          code: 'UNAUTHORIZED' 
        }, 
        { status: 401 }
      )
    }

    // Verify user is admin
    const { data: isAdmin, error: adminError } = await supaUser
      .from('admins')
      .select('user_id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (adminError) {
      console.error('Admin check error:', adminError)
      return NextResponse.json(
        { 
          error: 'Failed to verify admin status',
          code: 'ADMIN_CHECK_ERROR' 
        }, 
        { status: 500 }
      )
    }

    if (!isAdmin) {
      return NextResponse.json(
        { 
          error: 'Admin privileges required',
          code: 'INSUFFICIENT_PERMISSIONS' 
        }, 
        { status: 403 }
      )
    }

    // Validate required fields
    const requiredFields = ['name']
    const missingFields = requiredFields.filter(field => !body[field]?.trim())
    
    if (missingFields.length > 0) {
      return NextResponse.json(
        { 
          error: `Missing required fields: ${missingFields.join(', ')}`,
          code: 'MISSING_REQUIRED_FIELDS',
          missingFields 
        }, 
        { status: 422 }
      )
    }

    // Validate data types and constraints
    if (typeof body.name !== 'string' || body.name.trim().length < 2) {
      return NextResponse.json(
        { 
          error: 'Restaurant name must be at least 2 characters long',
          code: 'INVALID_RESTAURANT_NAME' 
        }, 
        { status: 422 }
      )
    }

    if (body.avg_rating !== undefined && (typeof body.avg_rating !== 'number' || body.avg_rating < 0 || body.avg_rating > 5)) {
      return NextResponse.json(
        { 
          error: 'Rating must be a number between 0 and 5',
          code: 'INVALID_RATING' 
        }, 
        { status: 422 }
      )
    }

    if (body.review_count !== undefined && (typeof body.review_count !== 'number' || body.review_count < 0)) {
      return NextResponse.json(
        { 
          error: 'Review count must be a non-negative number',
          code: 'INVALID_REVIEW_COUNT' 
        }, 
        { status: 422 }
      )
    }

    if (body.cuisines !== undefined && !Array.isArray(body.cuisines)) {
      return NextResponse.json(
        { 
          error: 'Cuisines must be an array',
          code: 'INVALID_CUISINES_FORMAT' 
        }, 
        { status: 422 }
      )
    }

    if (body.is_active !== undefined && typeof body.is_active !== 'boolean') {
      return NextResponse.json(
        { 
          error: 'is_active must be a boolean',
          code: 'INVALID_ACTIVE_STATUS' 
        }, 
        { status: 422 }
      )
    }

    // Prepare restaurant data with defaults
    const restaurantData = {
      name: body.name.trim(),
      avg_rating: body.avg_rating || null,
      review_count: body.review_count || null,
      price_tag: body.price_tag?.trim() || null,
      parent_city: body.parent_city?.trim() || null,
      cuisines: body.cuisines || null,
      is_active: body.is_active !== undefined ? body.is_active : true,
      // Add any other fields your restaurant table has
      ...(body.address && { address: body.address.trim() }),
      ...(body.phone && { phone: body.phone.trim() }),
      ...(body.website && { website: body.website.trim() }),
      ...(body.description && { description: body.description.trim() }),
    }

    // Use service role to bypass RLS for the insert
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { 
          error: 'Server configuration error',
          code: 'MISSING_CONFIG' 
        }, 
        { status: 500 }
      )
    }

    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    const { data: restaurant, error: insertError } = await admin
      .from('restaurants')
      .insert(restaurantData)
      .select()
      .single()

    if (insertError) {
      console.error('Restaurant creation error:', insertError)
      
      // Handle specific database errors
      if (insertError.code === '23505') { // unique violation
        return NextResponse.json(
          { 
            error: 'Restaurant with this name already exists',
            code: 'DUPLICATE_RESTAURANT' 
          }, 
          { status: 409 }
        )
      }
      
      return NextResponse.json(
        { 
          error: insertError.message || 'Failed to create restaurant',
          code: 'CREATION_FAILED' 
        }, 
        { status: 400 }
      )
    }

    return NextResponse.json({
      data: restaurant,
      message: 'Restaurant created successfully'
    }, { status: 201 })

  } catch (error: any) {
    console.error('Admin restaurant creation error:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        code: 'INTERNAL_ERROR' 
      }, 
      { status: 500 }
    )
  }
}

// GET /api/admin/restaurants - List all restaurants for admin management
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    
    // Require a signed-in user
    const supaUser = await serverClient()
    const { data: { user }, error: userError } = await supaUser.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json(
        { 
          error: 'Authentication required',
          code: 'UNAUTHORIZED' 
        }, 
        { status: 401 }
      )
    }

    // Verify user is admin
    const { data: isAdmin, error: adminError } = await supaUser
      .from('admins')
      .select('user_id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (adminError) {
      console.error('Admin check error:', adminError)
      return NextResponse.json(
        { 
          error: 'Failed to verify admin status',
          code: 'ADMIN_CHECK_ERROR' 
        }, 
        { status: 500 }
      )
    }

    if (!isAdmin) {
      return NextResponse.json(
        { 
          error: 'Admin privileges required',
          code: 'INSUFFICIENT_PERMISSIONS' 
        }, 
        { status: 403 }
      )
    }

    // Parse pagination and filters
    const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit')) || 50))
    const offset = Math.max(0, Number(searchParams.get('offset')) || 0)
    const includeInactive = searchParams.get('includeInactive') === 'true'
    const searchTerm = searchParams.get('search')?.trim()

    // Use service role to bypass RLS
    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    let query = admin
      .from('restaurants')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })

    // Apply filters
    if (!includeInactive) {
      query = query.eq('is_active', true)
    }

    if (searchTerm) {
      query = query.ilike('name', `%${searchTerm}%`)
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1)

    const { data: restaurants, error: fetchError, count } = await query

    if (fetchError) {
      console.error('Restaurant fetch error:', fetchError)
      return NextResponse.json(
        { 
          error: 'Failed to fetch restaurants',
          code: 'FETCH_ERROR' 
        }, 
        { status: 400 }
      )
    }

    return NextResponse.json({
      data: restaurants || [],
      meta: {
        total: count || 0,
        limit,
        offset,
        hasMore: (offset + (restaurants?.length || 0)) < (count || 0),
        includeInactive,
        searchTerm: searchTerm || null
      }
    })

  } catch (error: any) {
    console.error('Admin restaurant list error:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        code: 'INTERNAL_ERROR' 
      }, 
      { status: 500 }
    )
  }
}