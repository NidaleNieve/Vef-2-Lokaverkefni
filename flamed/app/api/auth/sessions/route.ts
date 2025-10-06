// app/api/auth/sessions/route.ts - RESTful session management
import { NextResponse } from 'next/server'
import { serverClient } from '@/utils/supabase/server'

// POST /api/auth/sessions - Create a new session (sign in)
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const { email, password } = body

    // Input validation
    if (!email || !password) {
      return NextResponse.json(
        { 
          error: 'Email and password are required',
          code: 'MISSING_CREDENTIALS' 
        },
        { status: 422 }
      )
    }

    if (typeof email !== 'string' || typeof password !== 'string') {
      return NextResponse.json(
        { 
          error: 'Email and password must be strings',
          code: 'INVALID_CREDENTIALS_FORMAT' 
        },
        { status: 422 }
      )
    }

    const supa = await serverClient()
    const { data, error } = await supa.auth.signInWithPassword({ 
      email: email.trim().toLowerCase(), 
      password 
    })

    if (error) {
      return NextResponse.json(
        { 
          error: error.message,
          code: error.message.includes('Invalid login') ? 'INVALID_CREDENTIALS' : 'AUTH_ERROR'
        },
        { status: 401 }
      )
    }

    return NextResponse.json({
      user: {
        id: data.user?.id,
        email: data.user?.email,
        created_at: data.user?.created_at
      },
      session: {
        access_token: data.session?.access_token ? '[REDACTED]' : null,
        expires_at: data.session?.expires_at
      }
    })

  } catch (error: any) {
    console.error('Session creation error:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        code: 'INTERNAL_ERROR' 
      },
      { status: 500 }
    )
  }
}

// DELETE /api/auth/sessions - Destroy current session (sign out)
export async function DELETE() {
  try {
    const supa = await serverClient()
    const { error } = await supa.auth.signOut()

    if (error) {
      return NextResponse.json(
        { 
          error: error.message,
          code: 'SIGNOUT_ERROR' 
        },
        { status: 400 }
      )
    }

    return NextResponse.json({
      message: 'Session terminated successfully'
    })

  } catch (error: any) {
    console.error('Session deletion error:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        code: 'INTERNAL_ERROR' 
      },
      { status: 500 }
    )
  }
}

// GET /api/auth/sessions - Get current session info
export async function GET() {
  try {
    const supa = await serverClient()
    const { data: { user }, error } = await supa.auth.getUser()

    if (error) {
      return NextResponse.json(
        { 
          error: error.message,
          code: 'SESSION_ERROR' 
        },
        { status: 401 }
      )
    }

    if (!user) {
      return NextResponse.json(
        { 
          error: 'No active session',
          code: 'NO_SESSION' 
        },
        { status: 401 }
      )
    }

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        created_at: user.created_at,
        last_sign_in_at: user.last_sign_in_at
      },
      authenticated: true
    })

  } catch (error: any) {
    console.error('Session retrieval error:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        code: 'INTERNAL_ERROR' 
      },
      { status: 500 }
    )
  }
}