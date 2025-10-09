//ChatGPT generated kóði sem finnur niðurstöðurnar, og reiknar út consensus

import { NextResponse } from 'next/server'
import { serverClient } from '@/utils/supabase/server'


export async function GET(req, { params }) {
  // Await params as required by Next.js 15+ dynamic API routes
  const { id: groupId } = await params;
  const sessionId = req.nextUrl.searchParams.get('session_id') || ''

  //checka hvort að groupId og sessionId sé til
  if (!groupId) {
    return NextResponse.json({ ok: false, error: 'Missing groupId' }, { status: 400 })
  }
  if (!sessionId) {
    return NextResponse.json({ ok: false, error: 'Missing session_id' }, { status: 400 })
  }

  //bý til server client og fetcha user, ef að user er ekki til þá hendi error
  const supa = await serverClient()
  const { data: { user } = {} } = await supa.auth.getUser().catch(() => ({}))
  if (!user) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })

  //fetcha group messages, vegna þess að game logicið er sent gegnum það
  const { data: msgs, error } = await supa
    .from('group_messages')
    .select('id,user_id,content,created_at')
    .eq('group_id', groupId)
    .order('created_at', { ascending: true })
    .limit(1000)
  
    //error handling fyrir message fetch
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })

  // Leita í gegnum fetched messages til að finna nýjasta swipe_results message
  // og hvort að host hafi "publish"-að niðurstöður fyrir þetta session
  let published = false
  const parsed = (msgs || [])
    .map(m => {
      try {
        //parsa message
        const j = JSON.parse(m.content || '{}')
        if (j && j.type === 'swipe_results' && j.session_id === sessionId) {
          return { user_id: m.user_id, created_at: m.created_at, payload: j }
        }
        if (j && j.type === 'publish_results' && j.session_id === sessionId) {
          published = true
        }
      } catch (e) {
        // ignore parse errors
      }
      return null
    })
    .filter(Boolean)

  //nota map til að geyma nýjasta swipe_results message frá hverjum user
  //þannig að ef user sendir fleiri en eitt message, þá er bara nýjasta talið með
  const byUser = new Map()
  for (const row of parsed) {
    byUser.set(row.user_id, row.payload)
  }

  //tel hversu mörgn submissions eru til
  const submitters = Array.from(byUser.keys())
  const submitterCount = submitters.length

  //LOGIC

  // fer í gegnum submissions og tel hversu mörg samþykktu hverja id
  const counts = {}
  for (const payload of byUser.values()) {
    const accepted = Array.isArray(payload.accepted_ids) ? payload.accepted_ids : []
    for (const rid of accepted) {
      const key = String(rid)
      counts[key] = (counts[key] || 0) + 1
    }
  }

  if (!published) {
    // Ekki búið að birta niðurstöður ennþá – skila bara stöðuupplýsingum
    return NextResponse.json({
      ok: true,
      published: false,
      group_id: groupId,
      session_id: sessionId,
      submitters: submitterCount,
      messages_considered: parsed.length,
      is_host: await isHost(supa, groupId, user.id),
    })
  }

  // Reikna út prósentur fyrir hvert id (eftir að hefur verið birt)
  const top_agreement = Object.entries(counts)
    .filter(([rid]) => rid && rid !== 'null' && rid !== 'undefined')
    .map(([rid, c]) => ({ id: rid, pct: submitterCount > 0 ? c / submitterCount : 0 }))
    .sort((a, b) => {
      if (b.pct !== a.pct) return b.pct - a.pct
      return String(a.id).localeCompare(String(b.id))
    })
    .slice(0, 5)

  //skila niðurstöðum ef að allt gekk vel
  return NextResponse.json({
    ok: true,
    published: true,
    group_id: groupId,
    session_id: sessionId,
    submitters: submitterCount,
    messages_considered: parsed.length,
    top_agreement,
    is_host: await isHost(supa, groupId, user.id),
  })
}

async function isHost(supa, groupId, userId) {
  const { data, error } = await supa
    .from('group_members')
    .select('role')
    .eq('group_id', groupId)
    .eq('user_id', userId)
    .limit(1)
  if (error) return false
  if (!Array.isArray(data) || data.length === 0) return false
  const role = data[0]?.role
  return role === 'host' || role === 'owner'
}