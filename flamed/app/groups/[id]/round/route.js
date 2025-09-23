import { NextResponse } from 'next/server'
import { supabaseServer } from '@/utils/supabase/server'
import { randomUUID } from 'crypto'

export async function GET(req, { params }) {
  const groupId = params?.id
  if (!groupId) return NextResponse.json({ ok: false, error: 'Missing groupId' }, { status: 400 })

  const supa = supabaseServer()
  const { data: { user } = {} } = await supa.auth.getUser().catch(() => ({}))
  if (!user) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })

  // Find the latest "round_start" control message
  const { data: msgs, error } = await supa
    .from('group_messages')
    .select('id,content,created_at')
    .eq('group_id', groupId)
    .order('created_at', { ascending: false })
    .limit(300)

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })

  let session_id = null
  for (const m of msgs || []) {
    try {
      const j = JSON.parse(m.content || '{}')
      if (j && j.type === 'round_start' && j.session_id) {
        session_id = j.session_id
        break
      }
    } catch {}
  }

  return NextResponse.json({ ok: true, group_id: groupId, session_id })
}

export async function POST(req, { params }) {
  const groupId = params?.id
  if (!groupId) return NextResponse.json({ ok: false, error: 'Missing groupId' }, { status: 400 })

  const supa = supabaseServer()
  const { data: { user } = {} } = await supa.auth.getUser().catch(() => ({}))
  if (!user) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })

  // Only group admins/owners can start a round
  const { data: membership, error: mErr } = await supa
    .from('group_members')
    .select('role')
    .eq('group_id', groupId)
    .limit(1)

  if (mErr) return NextResponse.json({ ok: false, error: mErr.message }, { status: 500 })
  const role = Array.isArray(membership) && membership[0]?.role
  if (!role || !['owner', 'admin'].includes(role)) {
    return NextResponse.json({ ok: false, error: 'Forbidden (admin/owner only)' }, { status: 403 })
  }

  const session_id = randomUUID()
  const payload = { type: 'round_start', session_id, started_by: user.id }

  const { error } = await supa
    .from('group_messages')
    .insert([{ group_id: groupId, content: JSON.stringify(payload) }])

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true, group_id: groupId, session_id })
}