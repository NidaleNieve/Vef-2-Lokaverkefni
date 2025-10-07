// app/api/auth/signup/route.ts
import { NextResponse } from 'next/server'
import { serverClient } from '@/utils/supabase/server'

export async function POST(req: Request) {
  const { email, password, full_name } = await req.json()
  const supa = await serverClient()
  const { data, error } = await supa.auth.signUp({
    email,
    password,
    options: { data: { full_name } }   // ← store default name here
  })
  if (error) return NextResponse.json({ ok:false, error:error.message }, { status:400 })
  return NextResponse.json({ ok:true, user: data.user })
}
