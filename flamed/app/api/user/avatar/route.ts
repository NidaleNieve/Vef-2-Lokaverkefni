import { NextResponse } from 'next/server'
import { serverClient } from '@/utils/supabase/server'

// GET /api/user/avatar - Get user's avatar
export async function GET() {
  const supa = await serverClient()
  
  // Get the authenticated user
  const { data: { user }, error: authError } = await supa.auth.getUser()
  
  if (authError || !user) {
    return NextResponse.json({ ok: false, error: 'Not authenticated' }, { status: 401 })
  }

  try {
    // Get user avatar from user_avatars table
    const { data: avatar, error: avatarError } = await supa
      .from('user_avatars')
      .select('avatar_seed, created_at, updated_at')
      .eq('user_id', user.id)
      .single()

    if (avatarError) {
      // If avatar doesn't exist, create a default one
      if (avatarError.code === 'PGRST116') {
        const { data: newAvatar, error: createError } = await supa
          .from('user_avatars')
          .insert({
            user_id: user.id,
            avatar_seed: 'John'
          })
          .select('avatar_seed, created_at, updated_at')
          .single()

        if (createError) {
          console.error('Failed to create avatar:', createError)
          return NextResponse.json({ ok: false, error: 'Failed to create avatar' }, { status: 500 })
        }

        return NextResponse.json({ 
          ok: true, 
          avatar: {
            avatarSeed: newAvatar.avatar_seed,
            createdAt: newAvatar.created_at,
            updatedAt: newAvatar.updated_at
          }
        })
      }
      
      console.error('Avatar fetch error:', avatarError)
      return NextResponse.json({ ok: false, error: 'Failed to fetch avatar' }, { status: 500 })
    }

    return NextResponse.json({ 
      ok: true, 
      avatar: {
        avatarSeed: avatar.avatar_seed,
        createdAt: avatar.created_at,
        updatedAt: avatar.updated_at
      }
    })

  } catch (error) {
    console.error('Avatar fetch error:', error)
    return NextResponse.json({ ok: false, error: 'Server error' }, { status: 500 })
  }
}

// PUT /api/user/avatar - Update user's avatar
export async function PUT(req: Request) {
  const supa = await serverClient()
  
  // Get the authenticated user
  const { data: { user }, error: authError } = await supa.auth.getUser()
  
  if (authError || !user) {
    return NextResponse.json({ ok: false, error: 'Not authenticated' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { avatarSeed } = body

    // Validate avatarSeed
    if (!avatarSeed || typeof avatarSeed !== 'string') {
      return NextResponse.json({ ok: false, error: 'Invalid avatar seed' }, { status: 400 })
    }

    // Update user avatar
    const { data: updatedAvatar, error: updateError } = await supa
      .from('user_avatars')
      .update({
        avatar_seed: avatarSeed,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user.id)
      .select('avatar_seed, updated_at')
      .single()

    if (updateError) {
      console.error('Avatar update error:', updateError)
      return NextResponse.json({ ok: false, error: 'Failed to update avatar' }, { status: 500 })
    }

    return NextResponse.json({ 
      ok: true, 
      message: 'Avatar updated successfully',
      avatar: {
        avatarSeed: updatedAvatar.avatar_seed,
        updatedAt: updatedAvatar.updated_at
      }
    })

  } catch (error) {
    console.error('Avatar update error:', error)
    return NextResponse.json({ ok: false, error: 'Server error' }, { status: 500 })
  }
}
