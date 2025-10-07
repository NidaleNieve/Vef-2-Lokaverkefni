// app/api/groups/[id]/invite/route.ts
import { NextResponse } from 'next/server'
import { serverClient } from '@/utils/supabase/server'

// GET latest invite code for a group (if any). In real world, may need proper access rules.
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supa = await serverClient()
  const { data: { user } } = await supa.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Assuming a table group_invites with group_id, code, created_at, revoked/expired markers, etc.
  const { data, error } = await supa
    .from('group_invites')
    .select('code,created_at,expires_at,max_uses,uses')
    .eq('group_id', id)
    .order('created_at', { ascending: false })
    .limit(1)

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  const invite = Array.isArray(data) && data.length ? data[0] : null
  return NextResponse.json({ invite })
}
