import { NextResponse } from 'next/server'
import { serverClient } from '@/utils/supabase/server'

// POST /api/groups/[id]/invites -> create invite code
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { max_uses = 1, expires_at = null } = await req.json().catch(() => ({}))
  const supa = await serverClient()
  const { data, error } = await supa.rpc('create_group_invite', {
    p_group_id: id, p_max_uses: max_uses, p_expires_at: expires_at
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ code: data }) // raw shareable code
}
