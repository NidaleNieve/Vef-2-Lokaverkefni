// app/api/auth/users/route.ts - RESTful user management
import { NextResponse } from 'next/server'
import { serverClient } from '@/utils/supabase/server'

// POST /api/auth/users - Create a new user (sign up)
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const { email, password, full_name } = body

    // Input validation
    if (!email || !password) {
      return NextResponse.json(
        { 
          error: 'Email and password are required',
          code: 'MISSING_REQUIRED_FIELDS' 
        },
        { status: 422 }
      )
    }

    if (typeof email !== 'string' || typeof password !== 'string') {
      return NextResponse.json(
        { 
          error: 'Email and password must be strings',
          code: 'INVALID_INPUT_TYPE' 
        },
        { status: 422 }
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
        { 
          error: 'Password must be at least 6 characters long',
          code: 'PASSWORD_TOO_SHORT' 
        },
        { status: 422 }
      )
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { 
          error: 'Invalid email format',
          code: 'INVALID_EMAIL_FORMAT' 
        },
        { status: 422 }
      )
    }

    const supa = await serverClient()
    const { data, error } = await supa.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: { 
        data: { 
          full_name: typeof full_name === 'string' ? full_name.trim() : null 
        } 
      }
    })

    if (error) {
      let statusCode = 400
      let errorCode = 'SIGNUP_ERROR'
      
      if (error.message.includes('already registered')) {
        statusCode = 409
        errorCode = 'EMAIL_ALREADY_EXISTS'
      } else if (error.message.includes('invalid')) {
        statusCode = 422
        errorCode = 'INVALID_INPUT'
      }
      
      return NextResponse.json(
        { 
          error: error.message,
          code: errorCode 
        },
        { status: statusCode }
      )
    }

    return NextResponse.json({
      user: {
        id: data.user?.id,
        email: data.user?.email,
        full_name: data.user?.user_metadata?.full_name,
        created_at: data.user?.created_at,
        email_confirmed: data.user?.email_confirmed_at ? true : false
      },
      message: data.user?.email_confirmed_at 
        ? 'User created and verified' 
        : 'User created, please check email for verification'
    }, { status: 201 })

  } catch (error: any) {
    console.error('User creation error:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        code: 'INTERNAL_ERROR' 
      },
      { status: 500 }
    )
  }
}