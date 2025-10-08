//ChatGPT generated kóði sem finnur niðurstöðurnar, og reiknar út consensus

import { NextResponse } from 'next/server'
import { serverClient } from '@/utils/supabase/server'

export async function GET(req, ctx) {
  //fæ groupid og sessionid úr params 
  const { id: groupId } = await ctx.params
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

  //leita í gegnum fetched messages til að finna nýjasta swipe_results message
  const parsed = (msgs || [])
    .map(m => {
      try {
        //parsa message
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

  // Track swipe status per user for this session (started/completed/forced)
  const statusByUser = new Map()
  const participantSet = new Set()
  let forced = false
  for (const m of msgs || []) {
    try {
      const payload = JSON.parse(m.content || '{}')
      if (payload?.type === 'swipe_status' && payload.session_id === sessionId) {
        const rawUid = payload.user_id || m.user_id
        const uid = rawUid ? String(rawUid) : null
        if (uid) {
          participantSet.add(uid)
          const normalized = payload.status === 'forced' ? 'forced' : (payload.status === 'completed' ? 'completed' : 'started')
          statusByUser.set(uid, normalized)
        }
      } else if (payload?.type === 'player_join' && payload.user_id) {
        participantSet.add(String(payload.user_id))
      } else if (payload?.type === 'force_results' && payload.session_id === sessionId) {
        forced = true
      }
    } catch {}
  }

  //nota map til að geyma nýjasta swipe_results message frá hverjum user
  //þannig að ef user sendir fleiri en eitt message, þá er bara nýjasta talið með
  const byUser = new Map()
  for (const row of parsed) {
    byUser.set(row.user_id, row.payload)
  }

  // Ensure participants include anyone who has submitted picks
  for (const uidRaw of byUser.keys()) {
    if (!uidRaw) continue
    const uid = String(uidRaw)
    participantSet.add(uid)
    if (!statusByUser.has(uid)) statusByUser.set(uid, 'completed')
  }

  //tel hversu mörgn submissions eru til
  const resultSubmitters = Array.from(byUser.keys())
  const resultSubmitterCount = resultSubmitters.length

  // Status summaries
  const statusCounts = { started: 0, completed: 0, forced: 0 }
  for (const status of statusByUser.values()) {
    if (status === 'completed') statusCounts.completed += 1
    else if (status === 'forced') statusCounts.forced += 1
    else statusCounts.started += 1
  }
  const completedUsers = Array.from(statusByUser.entries()).filter(([, status]) => status === 'completed' || status === 'forced').map(([uid]) => uid)
  const participants = participantSet.size || statusByUser.size || resultSubmitterCount
  const completedCount = completedUsers.length
  const waitingFor = []
  if (!forced) {
    for (const uid of participantSet) {
      const status = statusByUser.get(uid)
      if (!status || (status !== 'completed' && status !== 'forced')) waitingFor.push(uid)
    }
  }
  const isComplete = forced || (participants > 0 && completedCount >= participants)

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

  // Reikna út prósentur fyrir hvert id
  const percentages = {}
  if (resultSubmitterCount > 0) {
    for (const [rid, c] of Object.entries(counts)) {
      percentages[rid] = c / resultSubmitterCount
    }
  }

  //finn út hvaða veitingastaðir eru 'consensus' þ.e. samþykktir af öllum
  const consensus_ids = Object.entries(counts)
    .filter(([, c]) => c === resultSubmitterCount && resultSubmitterCount > 0)
    .map(([rid]) => String(rid))

  //skila niðurstöðum ef að allt gekk vel
  return NextResponse.json({
    ok: true,
    group_id: groupId,
    session_id: sessionId,
    submitters: completedCount,
    result_submitters: resultSubmitterCount,
    participants,
    status_counts: statusCounts,
    completed_user_ids: completedUsers,
    waiting_for: waitingFor,
    forced,
    is_complete: isComplete,
    messages_considered: parsed.length,
    consensus_ids,
    counts,
    percentages,
  })
}