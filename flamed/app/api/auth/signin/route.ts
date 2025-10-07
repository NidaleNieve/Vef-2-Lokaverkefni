import { NextResponse } from 'next/server'
import { serverClient } from '@/utils/supabase/server'

export async function POST(req: Request) {
  const { email, password } = await req.json()
  const supa = await serverClient()
  const { error } = await supa.auth.signInWithPassword({ email, password })
  if (error) return NextResponse.json({ ok:false, error: error.message }, { status: 400 })
  return NextResponse.json({ ok:true })
}
