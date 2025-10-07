import { NextResponse } from 'next/server'
import { serverClient } from '@/utils/supabase/server'

// POST /api/groups/redeem { code }
export async function POST(req: Request) {
  const { code } = await req.json()
  const supa = await serverClient()
  const { data: { user } } = await supa.auth.getUser()
  const { data, error } = await supa.rpc('redeem_group_invite', { p_code: code })
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  // Fire-and-forget: announce that the player has joined this group
  const groupId = data as string | null
  if (groupId && user?.id) {
    // Debounce: if a player_join by this user exists within last 5 seconds, skip
    try {
      const since = new Date(Date.now() - 5000).toISOString()
      const { data: recent } = await supa
        .from('group_messages')
        .select('id,content,created_at')
        .eq('group_id', groupId)
        .eq('user_id', user.id)
        .gte('created_at', since)
        .order('created_at', { ascending: false })
        .limit(5)
      const already = (recent || []).some(m => {
        try { const j = JSON.parse((m as any).content || '{}'); return j?.type === 'player_join' } catch { return false }
      })
      if (!already) {
        const payload = { type: 'player_join', user_id: user.id, joined_at: new Date().toISOString() }
        await supa.from('group_messages').insert({
          group_id: groupId,
          user_id: user.id,
          content: JSON.stringify(payload),
        })
      }
    } catch {}
  }

  return NextResponse.json({ group_id: data })
}