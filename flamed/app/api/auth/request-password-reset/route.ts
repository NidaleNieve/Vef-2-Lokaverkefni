import { NextResponse } from 'next/server'
import { serverClient } from '@/utils/supabase/server'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
const REDIRECT_TO = `${SITE_URL}/auth/update-password`
const ALLOWED_ORIGINS = [SITE_URL] // add your prod domain(s) too

export async function POST(req: Request) {
  try {
    // Basic CSRF-style check
    const origin = req.headers.get('origin') || ''
    const referer = req.headers.get('referer') || ''
    const okOrigin = ALLOWED_ORIGINS.some(o => origin.startsWith(o) || referer.startsWith(o))
    if (!okOrigin) return NextResponse.json({ ok: true })

    const { email } = await req.json().catch(() => ({ email: '' }))
    const clean = typeof email === 'string' ? email.trim() : ''

    // Always respond generically to avoid email enumeration
    if (!clean) return NextResponse.json({ ok: true })

    const supa = await serverClient()
    await supa.auth.resetPasswordForEmail(clean, { redirectTo: REDIRECT_TO })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: true })
  }
}