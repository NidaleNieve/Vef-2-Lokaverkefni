import { NextResponse } from 'next/server'
import { serverClient } from '@/utils/supabase/server'

// GET /api/groups - List user's groups
export async function GET() {
  try {
    const supa = await serverClient()
    const { data: { user } } = await supa.auth.getUser()
    
    if (!user) {
      return NextResponse.json(
        { 
          error: 'Authentication required',
          code: 'UNAUTHORIZED' 
        }, 
        { status: 401 }
      )
    }

    // Get groups where user is a member
    const { data, error } = await supa
      .from('group_members')
      .select(`
        groups (
          id,
          name,
          created_at,
          created_by
        )
      `)
      .eq('user_id', user.id)

    if (error) {
      return NextResponse.json(
        { 
          error: error.message,
          code: 'DATABASE_ERROR' 
        }, 
        { status: 400 }
      )
    }

    const groups = data?.map(item => item.groups).filter(Boolean) || []

    return NextResponse.json({
      data: groups,
      meta: {
        total: groups.length
      }
    })

  } catch (error: any) {
    console.error('Groups list error:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        code: 'INTERNAL_ERROR' 
      }, 
      { status: 500 }
    )
  }
}

// POST /api/groups - Create a new group
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const { name } = body

    if (!name?.trim()) {
      return NextResponse.json(
        { 
          error: 'Group name is required',
          code: 'MISSING_GROUP_NAME' 
        }, 
        { status: 422 }
      )
    }

    if (typeof name !== 'string' || name.trim().length < 2) {
      return NextResponse.json(
        { 
          error: 'Group name must be at least 2 characters long',
          code: 'INVALID_GROUP_NAME' 
        }, 
        { status: 422 }
      )
    }

    const supa = await serverClient()
    const { data: { user } } = await supa.auth.getUser()
    
    if (!user) {
      return NextResponse.json(
        { 
          error: 'Authentication required',
          code: 'UNAUTHORIZED' 
        }, 
        { status: 401 }
      )
    }

    const { data: groupId, error } = await supa.rpc('create_group', { 
      p_name: name.trim() 
    })

    if (error) {
      return NextResponse.json(
        { 
          error: error.message,
          code: 'GROUP_CREATION_FAILED' 
        }, 
        { status: 400 }
      )
    }

    return NextResponse.json({
      data: {
        id: groupId,
        name: name.trim(),
        created_by: user.id,
        created_at: new Date().toISOString()
      },
      message: 'Group created successfully'
    }, { status: 201 })

  } catch (error: any) {
    console.error('Group creation error:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        code: 'INTERNAL_ERROR' 
      }, 
      { status: 500 }
    )
  }
}
