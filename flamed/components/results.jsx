import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import CongratulationCard from "./CongratulationCard";

export default function Results({ restaurants, acceptedIds, rejectedIds, groupId, sessionId, onRestart, isHost = false }) {
  // We no longer display personal picks; keep arrays for submission only
  const accepted = restaurants.filter(r => acceptedIds.includes(r.id));
  const rejected = restaurants.filter(r => rejectedIds.includes(r.id));

  //states fyrir submit, fetch, og errors
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [agg, setAgg] = useState(null);
  const [err, setErr] = useState('');
  const [autoLoop, setAutoLoop] = useState(true);
  const [forced, setForced] = useState(false);
  const didAutoSubmit = useRef(false);
  const lastStatusRef = useRef(null);

  useEffect(() => {
    lastStatusRef.current = null
  }, [sessionId])

  const postStatus = useCallback(async (status) => {
    if (!groupId || !sessionId) return
    const normalized = status === 'forced' ? 'forced' : status === 'completed' ? 'completed' : 'started'
    if (lastStatusRef.current === normalized) return
    try {
      const res = await fetch(`/api/groups/${groupId}/messages`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ content: JSON.stringify({ type: 'swipe_status', session_id: sessionId, status: normalized }) })
      })
      if (res.ok) lastStatusRef.current = normalized
    } catch (e) {
      console.error('postStatus status error', e)
    }
  }, [groupId, sessionId])

  //functions fyrir submit
  async function submitMyPicks() {
    //error handling fyrir groupId og sessionId
    if (!groupId || !sessionId) {
      setErr('Missing groupId or sessionId.'); //nota setErr til þess að geta svo byrt villu
      return;
    }
    setErr(''); //ef engin villa, þá set ég hana blank
    setSubmitting(true); //stilli set submitting til þess að láta vita að það sé verið að submitta asynchronously

    try {
      const info = {
        // Bý til json body fyrir post request sem inniheldur veitingastaðina og session id
        content: JSON.stringify({
          type: 'swipe_results',
          session_id: sessionId,
          accepted_ids: acceptedIds,
          rejected_ids: rejectedIds,
        }),
      };

      //sendi upplýsingar á api endpointið
      const res = await fetch(`/api/groups/${groupId}/messages`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(info),
        credentials: 'include',
      });

      //hef error handling fyrir respons
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error || `Submit failed (${res.status})`);
      }
      setSubmitted(true); //set submitted true til að láta vita að async sé búið successfully
      postStatus('completed');
    //hef error handling fyrir allt þetta, og set submitting false til að láta vita að async sé búið 
    } catch (e) {
      setErr(e.message || 'Failed to submit results.');
    } finally {
      setSubmitting(false);
    }
  }

  //function fyrir refresha og sækja niðurstöður, mun vera automatic
  async function refreshGroupResult() {
    //error handling fyrir groupId og sessionId
    if (!groupId || !sessionId) { 
      setErr('Missing groupId or sessionId.');//nota setErr til þess að geta svo byrt villu
      return;
    }
    setErr(''); //ef engin villa, þá set ég hana blank
    setFetching(true); //stilli set fetching til þess að láta vita að það sé verið að fetcha asynchronously

    try {
      //sæki niðurstöður frá api endpointinu
      const res = await fetch(`/api/groups/${groupId}/results?session_id=${encodeURIComponent(sessionId)}`, {
        method: 'GET',
        credentials: 'include',
      });

      //error handling fyrir response
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j?.error || `Fetch failed (${res.status})`);
      setAgg(j);
      return j;
    //hef error handling fyrir allt þetta
    } catch (e) {
      setErr(e.message || 'Failed to fetch results.');
    } finally {
      setFetching(false);
    }
  }


  // Detect host-forced end by scanning messages
  useEffect(() => {
    let cancelled = false
    if (!groupId || !sessionId) return
    const poll = async () => {
      try {
        const r = await fetch(`/api/groups/${groupId}/messages`, { credentials: 'include' })
        const j = await r.json().catch(() => ({}))
        if (!cancelled && r.ok && Array.isArray(j?.items)) {
          for (const m of j.items) {
            try {
              const c = JSON.parse(String(m?.content || ''))
              if (c?.type === 'force_results' && c?.session_id === sessionId) { setForced(true); setAutoLoop(false); break }
            } catch {}
          }
        }
      } catch {}
      if (!cancelled && !forced) setTimeout(poll, 2000)
    }
    poll()
    return () => { cancelled = true }
  }, [groupId, sessionId, forced])

  // Auto-submit once on mount if not submitted
  useEffect(() => {
    if (didAutoSubmit.current) return
    if (!groupId || !sessionId) return
    // Auto submit accepted/rejected results once
    didAutoSubmit.current = true
    submitMyPicks()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId, sessionId])

  useEffect(() => {
    if (!groupId || !sessionId) return
    const target = (forced || agg?.forced) ? 'forced' : 'completed'
    postStatus(target)
  }, [groupId, sessionId, forced, agg?.forced, postStatus])

  // Poll results until all members have submitted
  useEffect(() => {
    if (!autoLoop || !groupId || !sessionId) return
    let timer
    const tick = async () => {
      const data = await refreshGroupResult()
      // If fetch failed, stop autoloop to avoid infinite spinner and let user retry manually
      if (!data) {
        setAutoLoop(false)
        return
      }
      const participants = Number((data?.participants ?? agg?.participants) || 0)
      const submitCount = Number((data?.submitters ?? agg?.submitters) || 0)
      const forcedFlag = forced || !!(data?.forced ?? agg?.forced)
      if (forcedFlag || (participants > 0 && submitCount >= participants)) {
        setAutoLoop(false)
        return
      }
      timer = setTimeout(tick, 2000)
    }
    tick()
    return () => { if (timer) clearTimeout(timer) }
  }, [autoLoop, groupId, sessionId, forced, agg?.participants, agg?.submitters, agg?.forced])

  // Host action: force results for everyone (announce and rely on clients to auto-submit/show)
  async function hostForceResults() {
    try {
      if (!groupId || !sessionId) return
      // Post force message
      await fetch(`/api/groups/${groupId}/messages`, {
        method: 'POST', headers: { 'content-type': 'application/json' }, credentials: 'include',
        body: JSON.stringify({ content: JSON.stringify({ type: 'force_results', session_id: sessionId }) })
      })
      // Also submit my picks (idempotent)
      await submitMyPicks()
      setForced(true)
      postStatus('forced')
  setAutoLoop(false)
      // Fetch aggregation right away
      await refreshGroupResult()
    } catch (e) {
      setErr(e?.message || 'Failed to force results')
    }
  }

  //finn nöfn vetitingastaðan úr id
  // Map ids (string and numeric) to names safely
  const idToName = useMemo(() => {
    const m = new Map()
    for (const r of restaurants) {
      const keyStr = String(r.id)
      m.set(keyStr, r.name || 'Unknown')
    }
    return m
  }, [restaurants])
  //finn nöfn af consensus veitingastaðunum
  const consensusNames = (agg?.consensus_ids || [])
    .map(id => idToName.get(String(id)) || String(id))
    .filter(Boolean)

  // Sort top picks by percentage consensus
  const topPicks = agg?.percentages
    ? Object.entries(agg.percentages)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([id, pct]) => ({ id, name: idToName.get(String(id)) || String(id), pct }))
    : [];

  const forcedActive = forced || !!agg?.forced
  const participants = Number(agg?.participants ?? 0)
  const submitterCount = Number(agg?.submitters ?? 0)
  const waitingIds = forcedActive ? [] : (Array.isArray(agg?.waiting_for) ? agg.waiting_for : [])
  const waitingCount = forcedActive ? 0 : (waitingIds.length > 0 ? waitingIds.length : Math.max(participants - submitterCount, 0))
  const isComplete = forcedActive || (participants > 0 && submitterCount >= participants)
  const canReveal = isComplete

  useEffect(() => {
    if (canReveal) setAutoLoop(false)
  }, [canReveal])

  return (
    <div className="rounded-2xl p-6 border shadow-sm" style={{ background: 'var(--nav-item-bg)', borderColor: 'var(--nav-shadow)' }}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>Group Results</h2>
        {participants > 0 && (
          <span className="text-xs px-2 py-1 rounded-full" style={{ background: 'var(--background)', color: 'var(--muted)', border: '1px solid var(--nav-shadow)' }}>
            {submitterCount} / {participants} done
          </span>
        )}
      </div>

      {!!err && (
        <div className="rounded-lg p-4 mb-4 border" style={{ background: 'var(--background)', borderColor: 'var(--nav-shadow)' }}>
          <p className="text-red-600 mb-2">{err}</p>
          <button
            className="nav-item px-3 py-2 rounded-lg"
            onClick={async () => { setErr(''); setAutoLoop(true); await refreshGroupResult(); }}
            disabled={fetching}
          >
            {fetching ? 'Retrying…' : 'Retry'}
          </button>
        </div>
      )}

      {forcedActive && (
        <div className="mb-4 text-xs px-2 py-1 rounded-md" style={{ background: 'var(--nav-item-hover)', color: 'var(--muted)' }}>
          Host forced the round to end. Any unfinished swipes were submitted automatically.
        </div>
      )}

      {/* Controls */}
      <div className="flex gap-2 flex-wrap mb-4">
        {groupId && sessionId ? (
          <>
            <button
              className="nav-item px-3 py-2 rounded-lg"
              onClick={submitMyPicks}
              disabled={submitting || submitted}
              title="Send your picks for this round"
            >
              {submitted ? 'Submitted' : (submitting ? 'Submitting…' : 'Submit my picks')}
            </button>
            <button
              className="nav-item px-3 py-2 rounded-lg"
              onClick={refreshGroupResult}
              disabled={fetching}
              title="Refresh aggregation"
            >
              {fetching ? 'Refreshing…' : 'Refresh'}
            </button>
            {isHost && (
              <button
                className="px-3 py-2 rounded-lg"
                style={{ background: 'var(--accent)', color: 'var(--nav-text)' }}
                onClick={hostForceResults}
                title="Force everyone to end and reveal results"
              >
                Force results
              </button>
            )}
          </>
        ) : (
          <p className="text-sm" style={{ color: 'var(--muted)' }}>Not in a group/round.</p>
        )}
        {onRestart && (
          <button className="px-3 py-2 rounded-lg" style={{ background: 'var(--accent)', color: 'var(--nav-text)' }} onClick={onRestart}>
            Start over
          </button>
        )}
      </div>

      {/* Waiting state */}
      {!canReveal && !err && (
        <div className="rounded-xl p-5 mb-4 border" style={{ background: 'var(--background)', borderColor: 'var(--nav-shadow)' }}>
          <div className="flex items-center gap-3">
            <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" style={{ color: 'var(--muted)' }}>
              <circle cx="12" cy="12" r="10" strokeWidth="3" className="opacity-30" />
              <path d="M12 2a10 10 0 0 1 10 10" strokeWidth="3" className="opacity-70" />
            </svg>
            <div>
              <p className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>Waiting for others…</p>
              <p className="text-xs" style={{ color: 'var(--muted)' }}>
                {waitingCount > 0
                  ? `We’re waiting on ${waitingCount} more ${waitingCount === 1 ? 'player' : 'players'} to finish.`
                  : `We’ll reveal the final pick when everyone is done${isHost ? ' or you force results' : ''}.`}
              </p>
            </div>
          </div>
          {waitingIds.length > 0 && (
            <div className="mt-3 text-xs" style={{ color: 'var(--muted)' }}>
              Waiting on: {waitingIds.join(', ')}
            </div>
          )}
        </div>
      )}

      {/* Final reveal: show only consensus; if none, show next best by percentage */}
      {canReveal && (
        <CongratulationCard restaurantNames={consensusNames.length ? consensusNames : topPicks.map(p => p.name)} isVisible={true} />
      )}

      {/* Top picks preview (context only; not personal picks) */}
      {canReveal && agg && topPicks.length > 0 && (
        <div className="mt-4">
          <h3 className="font-semibold mb-2" style={{ color: 'var(--foreground)' }}>Group favorites</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {topPicks.map((p, idx) => (
              <div key={p.id} className="rounded-lg p-3 border" style={{ background: 'var(--background)', borderColor: 'var(--nav-shadow)' }}>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium" style={{ color: 'var(--foreground)' }}>
                    {idx === 0 ? '🏆 ' : ''}{p.name}
                  </span>
                  <span className="text-xs font-mono" style={{ color: 'var(--muted)' }}>{(p.pct * 100).toFixed(0)}%</span>
                </div>
                <div className="h-2 rounded bg-[var(--nav-item-hover)] overflow-hidden">
                  <div className="h-full rounded" style={{ width: `${Math.min(100, Math.max(0, p.pct * 100))}%`, background: 'var(--accent)' }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

/*
export default function Results({ restaurants, acceptedIds, rejectedIds, onRestart }) {
  const accepted = restaurants.filter(r => acceptedIds.includes(r.id));
  const rejected = restaurants.filter(r => rejectedIds.includes(r.id));

  return (
    <div className="bg-white rounded-lg p-6 dark:bg-black 
                    shadow-[0_4px_15px_rgba(0,0,0,0.1)] dark:shadow-[0_4px_5px_rgba(128,128,128,0.2)]">
      <h2 className="text-2xl font-bold mb-4">Results</h2>
      <div>
        <h3 className="font-semibold mb-2">Accepted:</h3>
        <ul>
          {accepted.map(r => (
            <li key={r.id}>{r.name}</li>
          ))}
        </ul>
      </div>
      <div className="mt-4">
        <h3 className="font-semibold mb-2">Rejected:</h3>
        <ul>
          {rejected.map(r => (
            <li key={r.id}>{r.name}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
  */