import { NextResponse } from 'next/server'
import { serverClient } from '@/utils/supabase/server'

// Build a robust origin using X-Forwarded headers (Vercel) and avoid localhost.
function isLocalhostHost(hostname: string) {
  return /(^|\.)((localhost)|(127\.0\.0\.1))$/i.test(hostname)
}

function getRequestOrigin(req: Request): string {
  try {
    const h = req.headers
    const xfProto = h.get('x-forwarded-proto')?.split(',')[0]?.trim()
    const xfHost = h.get('x-forwarded-host')?.split(',')[0]?.trim()
    const host = xfHost || h.get('host') || ''
    const proto = xfProto || (host ? 'https' : '')
    let origin = host && proto ? `${proto}://${host}` : ''
    if (!origin) origin = new URL(req.url).origin
    const envBase = (process.env.AUTH_BASE_URL || process.env.NEXT_PUBLIC_SITE_URL || '').replace(/\/$/, '')
    try {
      const u = new URL(origin)
      if (isLocalhostHost(u.hostname)) return envBase
    } catch {
      // ignore
    }
    return origin || envBase
  } catch {
    return (process.env.AUTH_BASE_URL || process.env.NEXT_PUBLIC_SITE_URL || '').replace(/\/$/, '')
  }
}

export async function POST(req: Request) {
  try {
    const origin = (getRequestOrigin(req) || '').replace(/\/$/, '')
    const redirectTo = origin ? `${origin}/auth/reset` : undefined

    // Basic CSRF-style check (best-effort). If we can't determine an allowlist, don't block.
    const allowed = [origin, process.env.AUTH_BASE_URL, process.env.NEXT_PUBLIC_SITE_URL].filter(Boolean) as string[]
    let okOrigin = true
    if (allowed.length) {
      const hdrOrigin = req.headers.get('origin') || ''
      const referer = req.headers.get('referer') || ''
      okOrigin = allowed.some(o => hdrOrigin.startsWith(o) || referer.startsWith(o))
    }
    if (!okOrigin) return NextResponse.json({ ok: true })

    const { email } = await req.json().catch(() => ({ email: '' }))
    const clean = typeof email === 'string' ? email.trim() : ''

    // Always respond generically to avoid email enumeration
    if (!clean) return NextResponse.json({ ok: true })

    const supa = await serverClient()
    if (redirectTo) {
      await supa.auth.resetPasswordForEmail(clean, { redirectTo })
    } else {
      await supa.auth.resetPasswordForEmail(clean)
    }
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: true })
  }
}