import { NextResponse } from 'next/server'
import { serverClient } from '@/utils/supabase/server'

// POST /api/groups -> create group via Supabase RPC
export async function POST(req: Request) {
  const { name } = await req.json()
  const supa = await serverClient()
  const { data: { user } } = await supa.auth.getUser()
  if (!user) return NextResponse.json({ error:'Unauthorized' }, { status: 401 })
  const { data, error } = await supa.rpc('create_group', { p_name: name })
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ group_id: data })
}
