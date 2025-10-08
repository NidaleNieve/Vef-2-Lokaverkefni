import { NextResponse } from 'next/server'
import { serverClient } from '@/utils/supabase/server'

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supa = await serverClient()
  const { data: { user } } = await supa.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // RLS should restrict to only members of this group
  const { data, error } = await supa
    .from('group_members')
    .select('user_id, role, joined_at')
    .eq('group_id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ items: data, count: Array.isArray(data) ? data.length : 0 })
}
