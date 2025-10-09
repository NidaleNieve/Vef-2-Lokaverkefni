// app/api/auth/signup/route.ts
import { NextResponse } from 'next/server'
import { serverClient } from '@/utils/supabase/server'

export async function POST(req: Request) {
  const { email, password, full_name } = await req.json()
  const supa = await serverClient()
  const url = new URL(req.url)
  const origin = url.origin || (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000')
  const emailRedirectTo = `${origin}/auth/signin?welcome=1`
  const { data, error } = await supa.auth.signUp({
    email,
    password,
    options: { data: { full_name }, emailRedirectTo }
  })
  if (error) return NextResponse.json({ ok:false, error:error.message }, { status:400 })
  return NextResponse.json({ ok:true, user: data.user })
}
