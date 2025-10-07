import { NextResponse } from 'next/server'
import { serverClient } from '@/utils/supabase/server'

// POST /api/groups/redeem { code }
export async function POST(req: Request) {
  const { code } = await req.json()
  const supa = await serverClient()
  const { data, error } = await supa.rpc('redeem_group_invite', { p_code: code })
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ group_id: data })
}