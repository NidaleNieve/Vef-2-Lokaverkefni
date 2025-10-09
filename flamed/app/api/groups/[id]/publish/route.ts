import { NextResponse } from 'next/server'
import { serverClient } from '@/utils/supabase/server'

// Helper: find latest round_start session_id
async function getLatestSessionId(supa: any, groupId: string): Promise<string | null> {
  const { data, error } = await supa
    .from('group_messages')
    .select('content,created_at')
    .eq('group_id', groupId)
    .order('created_at', { ascending: false })
    .limit(200)
  if (error) return null
  for (const m of data || []) {
    try {
      const j = JSON.parse((m as any).content || '{}')
      if (j && j.type === 'round_start' && j.session_id) return j.session_id
    } catch {}
  }
  return null
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supa = await serverClient()
  const { data: { user } } = await supa.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: membership, error: mErr } = await supa
    .from('group_members')
    .select('role')
    .eq('group_id', id)
    .eq('user_id', user.id)
    .limit(1)
  if (mErr) return NextResponse.json({ error: mErr.message }, { status: 400 })
  if (!Array.isArray(membership) || membership.length === 0) {
    return NextResponse.json({ error: 'Not a member of this group' }, { status: 403 })
  }
  const role = membership[0]?.role
  if (role !== 'host' && role !== 'owner') {
    return NextResponse.json({ error: 'Only host can publish' }, { status: 403 })
  }

  const sessionId = await getLatestSessionId(supa, id)
  if (!sessionId) return NextResponse.json({ error: 'No active round/session' }, { status: 400 })

  const payload = { type: 'publish_results', session_id: sessionId, published_by: user.id, created_at: new Date().toISOString() }
  const { error } = await supa
    .from('group_messages')
    .insert([{ group_id: id, user_id: user.id, content: JSON.stringify(payload) }])
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  return NextResponse.json({ ok: true, group_id: id, session_id: sessionId })
}
