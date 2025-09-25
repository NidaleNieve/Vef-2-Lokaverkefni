//ChatGPT generated kóði sem finnur niðurstöðurnar, og reiknar út consensus

import { NextResponse } from 'next/server'
import { serverClient } from '@/utils/supabase/server'

export async function GET(req, { params }) {
  const groupId = params?.id
  const sessionId = req.nextUrl.searchParams.get('session_id') || ''

  if (!groupId) {
    return NextResponse.json({ ok: false, error: 'Missing groupId' }, { status: 400 })
  }
  if (!sessionId) {
    return NextResponse.json({ ok: false, error: 'Missing session_id' }, { status: 400 })
  }

  const supa = await serverClient()

  // Ensure user is signed in so RLS returns the right rows
  const { data: { user } = {} } = await supa.auth.getUser().catch(() => ({}))
  if (!user) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  const { data: msgs, error } = await supa
    .from('group_messages')
    .select('id,user_id,content,created_at')
    .eq('group_id', groupId)
    .order('created_at', { ascending: true })
    .limit(1000)

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }

  // Parse messages containing swipe_results for this session
  const parsed = (msgs || [])
    .map(m => {
      try {
        const j = JSON.parse(m.content || '{}')
        if (j && j.type === 'swipe_results' && j.session_id === sessionId) {
          return { user_id: m.user_id, created_at: m.created_at, payload: j }
        }
      } catch (e) {
        // ignore parse errors
      }
      return null
    })
    .filter(Boolean)

  // Keep last submission per user (Map will overwrite earlier with later)
  const byUser = new Map()
  for (const row of parsed) {
    byUser.set(row.user_id, row.payload)
  }

  const submitters = Array.from(byUser.keys())
  const submitterCount = submitters.length

  // Count accepts per restaurant
  const counts = {}
  for (const payload of byUser.values()) {
    const accepted = Array.isArray(payload.accepted_ids) ? payload.accepted_ids : []
    for (const rid of accepted) {
      const key = String(rid)
      counts[key] = (counts[key] || 0) + 1
    }
  }

  // Percent agreement among submitters
  const percentages = {}
  if (submitterCount > 0) {
    for (const [rid, c] of Object.entries(counts)) {
      percentages[rid] = c / submitterCount
    }
  }

  // Consensus = accepted by ALL submitters
  const consensus_ids = Object.entries(counts)
    .filter(([, c]) => c === submitterCount && submitterCount > 0)
    .map(([rid]) => Number(rid))

  return NextResponse.json({
    ok: true,
    group_id: groupId,
    session_id: sessionId,
    submitters: submitterCount,
    messages_considered: parsed.length,
    consensus_ids,
    counts,
    percentages,
  })
}