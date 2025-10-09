import { NextResponse } from 'next/server'
import { serverClient } from '@/utils/supabase/server'

// Note: Build redirect URLs dynamically from the request origin to avoid localhost in production emails.
// Keep env as a fallback only.
const FALLBACK_SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://gastroswipe.app'

export async function POST(req: Request) {
  try {
    const url = new URL(req.url)
    const origin = url.origin || FALLBACK_SITE_URL
    const REDIRECT_TO = `${origin}/auth/update-password`
    const ALLOWED_ORIGINS = [origin, FALLBACK_SITE_URL]
    // Basic CSRF-style check
    const hdrOrigin = req.headers.get('origin') || ''
    const referer = req.headers.get('referer') || ''
    const okOrigin = ALLOWED_ORIGINS.some(o => hdrOrigin.startsWith(o) || referer.startsWith(o))
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