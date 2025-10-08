import { NextResponse } from 'next/server'
import { serverClient } from '@/utils/supabase/server'
//nota crypto til þess að búa til random uuid fyrir session id
import { randomUUID } from 'crypto'

export async function GET(req, ctx) {
  //fæ groupid úr params og checka hvort að það sé til
  const { id: groupId } = await ctx.params
  if (!groupId) return NextResponse.json({ ok: false, error: 'Missing groupId' }, { status: 400 })
  
  //bý til server client og fetcha user, ef að user er ekki til þá hendi error
  const supa = await serverClient()
  const { data: { user } = {} } = await supa.auth.getUser().catch(() => ({}))
  if (!user) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })

  //fetcha group messages, vegna þess að game logicið er sent gegnum það
  const { data: msgs, error } = await supa
    .from('group_messages')
    .select('id,content,created_at')
    .eq('group_id', groupId)
    //.eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(300)

    //error handling fyrir message fetch
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })

  //leita í gegnum fetched messages til að finna nýjasta round_start message
  let session_id = null
  for (const m of msgs || []) {
    try {
      const j = JSON.parse(m.content || '{}')
      if (j && j.type === 'round_start' && j.session_id) {
        //einnig checka hvort að session_id sé í skilaboðunum til þess að nota það
        session_id = j.session_id
        break
      }
    } catch {}
  }
  //skila response með group id og session id (ef að allt gekk upp)
  return NextResponse.json({ ok: true, group_id: groupId, session_id })
}

//post functionið sem sendir round_start message í messages
export async function POST(req, ctx) {
  //fæ groupid úr params og checka hvort að það sé til
  const { id: groupId } = await ctx.params
  if (!groupId) return NextResponse.json({ ok: false, error: 'Missing groupId' }, { status: 400 })

  //bý til server client og fetcha user, ef að user er ekki til þá hendi error
  const supa = await serverClient()
  const { data: { user } = {} } = await supa.auth.getUser().catch(() => ({}))
  if (!user) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })

  //fetcha group messages, til þess að checka hvort að userinn sé member af grúbbunni
  const { data: membership, error: mErr } = await supa
    .from('group_members')
    .select('role')
    .eq('group_id', groupId)
    .eq('user_id', user.id)
    .limit(1)

  //error handling fyrir 'membership fetch'
  if (mErr) return NextResponse.json({ ok: false, error: mErr.message }, { status: 500 })
  if (!Array.isArray(membership) || membership.length === 0) {
    return NextResponse.json({ ok: false, error: 'Not a member of this group' }, { status: 403 })
  }

  //ef allt gekk upp, þá býr til session id og constructa skilaboðin sem verða send í messages
  const session_id = randomUUID()
  const payload = { type: 'round_start', session_id, started_by: user.id }

  //senda skilaboðin í messages
  const { error } = await supa
    .from('group_messages')
    .insert([{ group_id: groupId, user_id: user.id, content: JSON.stringify(payload) }])

  //error handling fyrir insert
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
    
  //skila response með group id og session id (ef að allt gekk upp)
  return NextResponse.json({ ok: true, group_id: groupId, session_id })
}