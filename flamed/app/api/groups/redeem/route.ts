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
    const payload = {
      type: 'player_join',
      user_id: user.id,
      joined_at: new Date().toISOString(),
    }
    // Don't fail the main request if this insert fails
    try {
      await supa.from('group_messages').insert({
        group_id: groupId,
        user_id: user.id,
        content: JSON.stringify(payload),
      })
    } catch {}
  }

  return NextResponse.json({ group_id: data })
}