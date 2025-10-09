import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabaseBrowser } from '@/utils/supabase/browser';
import Image from 'next/image';

export default function Results({
  restaurants = [],
  acceptedIds = [],
  rejectedIds = [],
  groupId,
  sessionId,
  onRestart,
  memberCount
}) {
  // Derived arrays
  const accepted = useMemo(() => restaurants.filter(r => acceptedIds.includes(r.id)), [restaurants, acceptedIds]);
  const rejected = useMemo(() => restaurants.filter(r => rejectedIds.includes(r.id)), [restaurants, rejectedIds]);

  // State
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [agg, setAgg] = useState(null);           // aggregation after publish
  const [status, setStatus] = useState(null);     // status (pre + post publish)
  const [isHost, setIsHost] = useState(false);
  const [err, setErr] = useState('');
  const [published, setPublished] = useState(false);
  const [publishing, setPublishing] = useState(false);

  // Submit picks (manual button)
  async function submitMyPicks() {
    if (!groupId || !sessionId) {
      setErr('Missing groupId or sessionId.');
      return;
    }
    if (submitted) return;
    setErr('');
    setSubmitting(true);
    try {
      const info = {
        content: JSON.stringify({
          type: 'swipe_results',
          session_id: sessionId,
          accepted_ids: acceptedIds,
          rejected_ids: rejectedIds,
        }),
      };
      const res = await fetch(`/api/groups/${groupId}/messages`, {
        method: 'POST', headers: { 'content-type': 'application/json' }, credentials: 'include',
        body: JSON.stringify(info),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error || `Submit failed (${res.status})`);
      }
      setSubmitted(true);
    } catch (e) {
      setErr(e.message || 'Failed to submit results.');
    } finally {
      setSubmitting(false);
    }
  }

  // Fetch current status / results
  const refreshGroupResult = useCallback(async () => {
    if (!groupId || !sessionId) {
      setErr('Missing groupId or sessionId.');
      return false;
    }
    setErr('');
    setFetching(true);
    try {
      const res = await fetch(`/api/groups/${groupId}/results?session_id=${encodeURIComponent(sessionId)}`, { credentials: 'include' });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j?.error || `Fetch failed (${res.status})`);
      const publishedFlag = !!j?.published;
      setPublished(publishedFlag);
      setStatus(j);
      setIsHost(!!j?.is_host);
      if (publishedFlag) setAgg(j);
      return publishedFlag;
    } catch (e) {
      setErr(e.message || 'Failed to fetch results.');
      return false;
    } finally {
      setFetching(false);
    }
  }, [groupId, sessionId]);

  // Publish now (host only)
  async function publishNow() {
    if (!groupId || !isHost) return;
    setErr('');
    setPublishing(true);
    try {
      const res = await fetch(`/api/groups/${groupId}/publish`, { method: 'POST', headers: { 'content-type': 'application/json' }, credentials: 'include' });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j?.error || `Publish failed (${res.status})`);
      setPublished(true);
      await refreshGroupResult();
    } catch (e) {
      setErr(e.message || 'Failed to publish results.');
    } finally {
      setPublishing(false);
    }
  }

  // Auto-submit on mount (once) & poll until published
  useEffect(() => {
    let cancelled = false;
    async function autoSubmitIfNeeded() {
      if (!groupId || !sessionId) return;
      if (submitted) return;
      try {
        setSubmitting(true);
        const info = { content: JSON.stringify({ type: 'swipe_results', session_id: sessionId, accepted_ids: acceptedIds, rejected_ids: rejectedIds }) };
        const res = await fetch(`/api/groups/${groupId}/messages`, { method: 'POST', headers: { 'content-type': 'application/json' }, credentials: 'include', body: JSON.stringify(info) });
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          throw new Error(j?.error || `Submit failed (${res.status})`);
        }
        if (!cancelled) setSubmitted(true);
      } catch (e) {
        if (!cancelled) setErr(e.message || 'Failed to submit results.');
      } finally {
        if (!cancelled) setSubmitting(false);
      }
    }
    autoSubmitIfNeeded();
  let timer = null;
    async function tick() {
      if (cancelled) return;
      const isPub = await refreshGroupResult();
      if (!isPub) timer = setTimeout(tick, 8000);
    }
    tick();
    return () => { cancelled = true; if (timer) clearTimeout(timer); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId, sessionId, refreshGroupResult, submitted]);

  // Realtime refresh on new messages
  useEffect(() => {
    if (!groupId || !sessionId) return;
    const supa = supabaseBrowser();
    const channel = supa
      .channel(`results:${groupId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'group_messages', filter: `group_id=eq.${groupId}` }, (payload) => {
        try {
          const j = JSON.parse(payload?.new?.content || '{}');
          if (!j || j.session_id !== sessionId) return;
          if (j.type === 'swipe_results' || j.type === 'publish_results') refreshGroupResult();
        } catch {}
      })
      .subscribe();
    return () => { try { supa.removeChannel(channel); } catch {} };
  }, [groupId, sessionId, refreshGroupResult]);

  // Top picks (IDs only)
  const topPicks = useMemo(() => {
    if (!Array.isArray(agg?.top_agreement)) return [];
    return agg.top_agreement
      .filter(it => it && it.id != null)
      .slice(0, 5)
      .map(it => ({ id: String(it.id), pct: typeof it.pct === 'number' ? it.pct : 0 }));
  }, [agg?.top_agreement]);

  // Selected top pick (default first)
  const [selectedTopId, setSelectedTopId] = useState(null);
  useEffect(() => {
    if (topPicks.length > 0 && !selectedTopId) setSelectedTopId(topPicks[0].id);
  }, [topPicks, selectedTopId]);

  const selectedRestaurant = useMemo(() => {
    if (!selectedTopId) return null;
    return restaurants.find(r => String(r.id) === String(selectedTopId)) || null;
  }, [restaurants, selectedTopId]);

  // Collapse states
  const [showAccepted, setShowAccepted] = useState(false);
  const [showRejected, setShowRejected] = useState(false);

  // Mark results viewed for navbar logic
  useEffect(() => {
    try { if (groupId) localStorage.setItem('activeGameResultsWatched', String(groupId)); } catch {}
  }, [groupId]);

  return (
    <div className="glass-card rounded-lg p-6 animate-fade-in-up max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-6 animate-fade-in-up-delayed" 
          style={{ color: 'var(--foreground)' }}>
        🎯 Results
      </h2>

      {/*Byrti villurnar ef það eru*/}
      {!!err && (
        <div className="glass-card rounded-lg p-4 mb-4 border-l-4 animate-fade-in-grow" 
             style={{ borderLeftColor: 'var(--accent)', color: 'var(--foreground)' }}>
          <p className="text-sm">⚠️ {err}</p>
        </div>
      )}

      <div className="flex gap-3 flex-wrap mb-6 items-center">
        {groupId && sessionId ? (
          <>
            <button
              className={`nav-item rounded-lg px-4 py-3 font-medium text-sm transition-all duration-200 ${submitted ? 'animate-subtle-ping' : ''} ${submitting ? 'animate-pulse-shrink' : ''}`}
              onClick={submitMyPicks}
              disabled={submitting || submitted}
              title="Send your picks to the server for this round"
            >
              {submitted ? '✅ Submitted' : (submitting ? '⏳ Submitting…' : '📤 Submit picks')}
            </button>
            {/* Manual refresh removed – auto polling handles updates */}
            {!published && isHost && (
              <button
                className={`nav-item rounded-lg px-4 py-3 font-medium text-sm transition-all duration-200 ${publishing ? 'animate-pulse-shrink' : ''}`}
                onClick={publishNow}
                disabled={publishing}
                title="Publish results now (host only)"
              >
                {publishing ? '📣 Publishing…' : '📣 View results and End Game'}
              </button>
            )}
            <div className="chip self-center animate-fade-in text-xs">
              {published ? '✅ Published' : '⌛ Waiting for publish'} • You submitted: {submitted ? 'yes' : 'no'}
            </div>
            {typeof memberCount === 'number' && (
              <div className="chip self-center animate-fade-in text-xs">
                👥 {status?.submitters ?? agg?.submitters ?? 0} / {memberCount}
              </div>
            )}
          </>
        ) : (
          <div className="glass-card rounded-lg p-4" style={{ color: 'var(--muted)' }}>
            <p className="text-sm">🚫 Not in a group/round.</p>
          </div>
        )}
        {onRestart && (
          <button className="nav-item rounded-lg px-4 py-3 font-medium text-sm animate-bounce-side" onClick={onRestart}>
            🔄 Start over
          </button>
        )}
      </div>

      {agg && (
        <div className="glass-card rounded-lg p-5 mb-6 animate-fade-in-grow">
          <h3 className="font-semibold text-lg mb-4 animate-text-pulse" 
              style={{ color: 'var(--accent)' }}>
            🤝 Group Aggregation
          </h3>
          
          <div className="flex gap-2 mb-4 flex-wrap">
            <div className="chip">
              👥 {agg.submitters}{memberCount ? ` / ${memberCount}` : ''}
            </div>
            <div className="chip">
              📨 {agg.messages_considered} messages
            </div>
          </div>

          {topPicks.length > 0 ? (
            <div className="w-full space-y-4 animate-fade-in-up-delayed">
              {/* Detailed primary selection */}
              <div className="glass-card rounded-lg p-4 border border-[var(--accent)]">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="relative w-full md:w-56 h-40 md:h-40 rounded overflow-hidden bg-[var(--nav-item-bg)] flex items-center justify-center">
                    {selectedRestaurant?.square_img_url || selectedRestaurant?.hero_img_url ? (
                      <Image
                        src={selectedRestaurant.square_img_url || selectedRestaurant.hero_img_url}
                        alt={selectedRestaurant?.name || 'Restaurant'}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <span className="text-xs text-[var(--muted)]">No image</span>
                    )}
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-semibold text-lg" style={{ color: 'var(--foreground)' }}>
                        {selectedRestaurant?.name || 'Top Pick'}
                      </h4>
                      <div className="chip text-xs">
                        {(topPicks.find(p => p.id === selectedTopId)?.pct * 100 || 0).toFixed(0)}%
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs text-[var(--muted)]">
                      {selectedRestaurant?.parent_city && <span className="chip">📍 {selectedRestaurant.parent_city}</span>}
                      {selectedRestaurant?.price_tag && <span className="chip">� {selectedRestaurant.price_tag}</span>}
                      {selectedRestaurant?.avg_rating != null && <span className="chip">⭐ {selectedRestaurant.avg_rating?.toFixed(1)}</span>}
                      {Array.isArray(selectedRestaurant?.cuisines) && selectedRestaurant.cuisines.slice(0,4).map(c => (
                        <span key={c} className="chip">{c}</span>
                      ))}
                    </div>
                    <p className="text-sm text-[var(--muted)]">
                      ID: <span className="font-mono">{selectedTopId}</span>
                    </p>
                  </div>
                </div>
              </div>
              {/* Runner ups */}
              {topPicks.length > 1 && (
                <div className="space-y-2">
                  <p className="font-semibold text-sm" style={{ color: 'var(--foreground)' }}>Runner ups:</p>
                  <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
                    {topPicks.slice(1).map((p, idx) => {
                      const r = restaurants.find(r => String(r.id) === p.id);
                      return (
                        <button
                          key={p.id}
                          onClick={() => setSelectedTopId(p.id)}
                          className={`glass-card rounded-lg p-3 text-left border transition-all duration-150 hover:scale-[1.02] ${selectedTopId === p.id ? 'border-[var(--accent)]' : 'border-transparent'}`}
                          style={{ animationDelay: `${idx * 0.05}s` }}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-mono text-xs truncate" style={{ color: 'var(--foreground)' }}>{p.id}</span>
                            <span className="chip text-[10px]">{(p.pct * 100).toFixed(0)}%</span>
                          </div>
                          <p className="text-xs text-[var(--muted)] truncate">{r?.name || 'Unknown'}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="mb-3 text-sm" style={{ color: 'var(--muted)' }}>No agreement data yet.</p>
          )}
        </div>
      )}

      <div className="space-y-6">
        <div className="glass-card rounded-lg p-4 animate-fade-in-up">
          <button
            onClick={() => setShowAccepted(s => !s)}
            className="w-full flex justify-between items-center font-semibold text-green-600 dark:text-green-400 mb-2"
          >
            <span>✅ Accepted ({accepted.length})</span>
            <span className="text-xs chip">{showAccepted ? 'Hide' : 'Show'}</span>
          </button>
          {showAccepted && (
            accepted.length > 0 ? (
              <div className="space-y-2">
                {accepted.map((r, i) => (
                  <div key={r.id} className="glass-card rounded-lg p-3 animate-fade-in hover:scale-105 transition-transform duration-200" style={{ animationDelay: `${i * 0.1}s`, background: 'var(--nav-item-hover)' }}>
                    <span className="font-medium animate-float" style={{ color: 'var(--foreground)' }}>🍽️ {r.name}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="glass-card rounded-lg p-4" style={{ background: 'var(--nav-item-bg)', color: 'var(--muted)' }}>
                <p className="text-sm animate-text-pulse">No restaurants accepted yet...</p>
              </div>
            )
          )}
        </div>

        <div className="glass-card rounded-lg p-4 animate-fade-in-up-delayed">
          <button
            onClick={() => setShowRejected(s => !s)}
            className="w-full flex justify-between items-center font-semibold text-red-600 dark:text-red-400 mb-2"
          >
            <span>❌ Rejected ({rejected.length})</span>
            <span className="text-xs chip">{showRejected ? 'Hide' : 'Show'}</span>
          </button>
          {showRejected && (
            rejected.length > 0 ? (
              <div className="space-y-2">
                {rejected.map((r, i) => (
                  <div key={r.id} className="glass-card rounded-lg p-3 animate-fade-in opacity-70 hover:opacity-90 transition-opacity duration-200" style={{ animationDelay: `${i * 0.1}s`, background: 'var(--nav-item-bg)' }}>
                    <span className="font-medium" style={{ color: 'var(--muted)' }}>🚫 {r.name}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="glass-card rounded-lg p-4" style={{ background: 'var(--nav-item-bg)', color: 'var(--muted)' }}>
                <p className="text-sm animate-text-pulse">No restaurants rejected yet...</p>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
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