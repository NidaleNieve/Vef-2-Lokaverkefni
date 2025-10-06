// app/api/admin/restaurants/[id]/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { serverClient } from '@/utils/supabase/server'

async function verifyAdmin() {
  const supaUser = await serverClient()
  const { data: { user }, error: userError } = await supaUser.auth.getUser()
  
  if (userError || !user) {
    return { error: { message: 'Authentication required', code: 'UNAUTHORIZED', status: 401 } }
  }

  const { data: isAdmin, error: adminError } = await supaUser
    .from('admins')
    .select('user_id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (adminError) {
    console.error('Admin check error:', adminError)
    return { error: { message: 'Failed to verify admin status', code: 'ADMIN_CHECK_ERROR', status: 500 } }
  }

  if (!isAdmin) {
    return { error: { message: 'Admin privileges required', code: 'INSUFFICIENT_PERMISSIONS', status: 403 } }
  }

  return { user }
}

function getAdminClient() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Missing Supabase configuration')
  }

  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}

// GET /api/admin/restaurants/[id] - Get specific restaurant for admin
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    
    const adminCheck = await verifyAdmin()
    if (adminCheck.error) {
      return NextResponse.json(
        { error: adminCheck.error.message, code: adminCheck.error.code },
        { status: adminCheck.error.status }
      )
    }

    const admin = getAdminClient()
    const { data: restaurant, error } = await admin
      .from('restaurants')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') { // not found
        return NextResponse.json(
          { error: 'Restaurant not found', code: 'RESTAURANT_NOT_FOUND' },
          { status: 404 }
        )
      }
      
      return NextResponse.json(
        { error: error.message, code: 'FETCH_ERROR' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      data: restaurant
    })

  } catch (error: any) {
    console.error('Admin restaurant get error:', error)
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}

// PUT /api/admin/restaurants/[id] - Update restaurant (admin only)
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await req.json().catch(() => ({}))
    
    const adminCheck = await verifyAdmin()
    if (adminCheck.error) {
      return NextResponse.json(
        { error: adminCheck.error.message, code: adminCheck.error.code },
        { status: adminCheck.error.status }
      )
    }

    // Validate data if provided
    if (body.name !== undefined && (typeof body.name !== 'string' || body.name.trim().length < 2)) {
      return NextResponse.json(
        { error: 'Restaurant name must be at least 2 characters long', code: 'INVALID_RESTAURANT_NAME' },
        { status: 422 }
      )
    }

    if (body.avg_rating !== undefined && (typeof body.avg_rating !== 'number' || body.avg_rating < 0 || body.avg_rating > 5)) {
      return NextResponse.json(
        { error: 'Rating must be a number between 0 and 5', code: 'INVALID_RATING' },
        { status: 422 }
      )
    }

    if (body.review_count !== undefined && (typeof body.review_count !== 'number' || body.review_count < 0)) {
      return NextResponse.json(
        { error: 'Review count must be a non-negative number', code: 'INVALID_REVIEW_COUNT' },
        { status: 422 }
      )
    }

    if (body.cuisines !== undefined && !Array.isArray(body.cuisines)) {
      return NextResponse.json(
        { error: 'Cuisines must be an array', code: 'INVALID_CUISINES_FORMAT' },
        { status: 422 }
      )
    }

    if (body.is_active !== undefined && typeof body.is_active !== 'boolean') {
      return NextResponse.json(
        { error: 'is_active must be a boolean', code: 'INVALID_ACTIVE_STATUS' },
        { status: 422 }
      )
    }

    // Prepare update data (only include provided fields)
    const updateData: any = {
      updated_at: new Date().toISOString()
    }

    if (body.name !== undefined) updateData.name = body.name.trim()
    if (body.avg_rating !== undefined) updateData.avg_rating = body.avg_rating
    if (body.review_count !== undefined) updateData.review_count = body.review_count
    if (body.price_tag !== undefined) updateData.price_tag = body.price_tag?.trim() || null
    if (body.parent_city !== undefined) updateData.parent_city = body.parent_city?.trim() || null
    if (body.cuisines !== undefined) updateData.cuisines = body.cuisines
    if (body.is_active !== undefined) updateData.is_active = body.is_active
    if (body.address !== undefined) updateData.address = body.address?.trim() || null
    if (body.phone !== undefined) updateData.phone = body.phone?.trim() || null
    if (body.website !== undefined) updateData.website = body.website?.trim() || null
    if (body.description !== undefined) updateData.description = body.description?.trim() || null

    const admin = getAdminClient()
    const { data: restaurant, error } = await admin
      .from('restaurants')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') { // not found
        return NextResponse.json(
          { error: 'Restaurant not found', code: 'RESTAURANT_NOT_FOUND' },
          { status: 404 }
        )
      }

      if (error.code === '23505') { // unique violation
        return NextResponse.json(
          { error: 'Restaurant with this name already exists', code: 'DUPLICATE_RESTAURANT' },
          { status: 409 }
        )
      }
      
      return NextResponse.json(
        { error: error.message, code: 'UPDATE_FAILED' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      data: restaurant,
      message: 'Restaurant updated successfully'
    })

  } catch (error: any) {
    console.error('Admin restaurant update error:', error)
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}

// DELETE /api/admin/restaurants/[id] - Delete restaurant (admin only)
export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    
    const adminCheck = await verifyAdmin()
    if (adminCheck.error) {
      return NextResponse.json(
        { error: adminCheck.error.message, code: adminCheck.error.code },
        { status: adminCheck.error.status }
      )
    }

    const admin = getAdminClient()
    
    // First check if restaurant exists
    const { data: existingRestaurant, error: checkError } = await admin
      .from('restaurants')
      .select('id, name')
      .eq('id', id)
      .single()

    if (checkError) {
      if (checkError.code === 'PGRST116') { // not found
        return NextResponse.json(
          { error: 'Restaurant not found', code: 'RESTAURANT_NOT_FOUND' },
          { status: 404 }
        )
      }
      
      return NextResponse.json(
        { error: checkError.message, code: 'FETCH_ERROR' },
        { status: 400 }
      )
    }

    // Delete the restaurant
    const { error: deleteError } = await admin
      .from('restaurants')
      .delete()
      .eq('id', id)

    if (deleteError) {
      return NextResponse.json(
        { error: deleteError.message, code: 'DELETE_FAILED' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      message: `Restaurant "${existingRestaurant.name}" deleted successfully`,
      deletedId: id
    })

  } catch (error: any) {
    console.error('Admin restaurant delete error:', error)
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}