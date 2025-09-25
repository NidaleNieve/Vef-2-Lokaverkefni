import { NextResponse } from 'next/server'
import { serverClient } from '@/utils/supabase/server'
import { randomUUID } from 'crypto'

export async function GET(req, { params }) {
  const groupId = params?.id
  if (!groupId) return NextResponse.json({ ok: false, error: 'Missing groupId' }, { status: 400 })

  const supa = await serverClient()
  const { data: { user } = {} } = await supa.auth.getUser().catch(() => ({}))
  if (!user) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })

  // Find the latest "round_start" control message
  const { data: msgs, error } = await supa
    .from('group_messages')
    .select('id,content,created_at')
    .eq('group_id', groupId)
    //.eq('user_id', user.id)
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

  const supa = await serverClient()
  const { data: { user } = {} } = await supa.auth.getUser().catch(() => ({}))
  if (!user) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })

  const { data: membership, error: mErr } = await supa
    .from('group_members')
    .select('role')
    .eq('group_id', groupId)
    .eq('user_id', user.id)
    .limit(1)

  if (mErr) return NextResponse.json({ ok: false, error: mErr.message }, { status: 500 })
  if (!Array.isArray(membership) || membership.length === 0) {
    return NextResponse.json({ ok: false, error: 'Not a member of this group' }, { status: 403 })
  }

  const session_id = randomUUID()
  const payload = { type: 'round_start', session_id, started_by: user.id }

  // Include user_id to satisfy RLS
  const { error } = await supa
    .from('group_messages')
    .insert([{ group_id: groupId, user_id: user.id, content: JSON.stringify(payload) }])

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true, group_id: groupId, session_id })
}