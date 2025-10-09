// app/api/auth/signup/route.ts
import { NextResponse } from 'next/server'
import { serverClient } from '@/utils/supabase/server'

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
  const { email, password, full_name } = await req.json()
  const supa = await serverClient()
  const origin = (getRequestOrigin(req) || '').replace(/\/$/, '')
  const payload: any = {
    email,
    password,
    options: { data: { full_name } }
  }
  if (origin) payload.options.emailRedirectTo = `${origin}/auth/signin?welcome=1`
  const { data, error } = await supa.auth.signUp(payload)
  if (error) return NextResponse.json({ ok:false, error:error.message }, { status:400 })
  return NextResponse.json({ ok:true, user: data.user })
}
