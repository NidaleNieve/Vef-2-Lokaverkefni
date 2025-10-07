import { NextResponse } from 'next/server'
import { serverClient } from '@/utils/supabase/server'

export async function POST() {
  const supa = await serverClient()
  await supa.auth.signOut()
  return NextResponse.json({ ok:true })
}
