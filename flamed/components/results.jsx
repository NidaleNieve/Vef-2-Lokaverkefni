import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabaseBrowser } from '@/utils/supabase/browser';

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
            {!published && (
              <button
                className={`nav-item rounded-lg px-4 py-3 font-medium text-sm transition-all duration-200 ${fetching ? 'animate-pulse-shrink' : ''}`}
                onClick={refreshGroupResult}
                disabled={fetching}
                title="Fetch latest status"
              >
                {fetching ? '🔄 Refreshing…' : '🔄 Refresh status'}
              </button>
            )}
            {!published && isHost && (
              <button
                className={`nav-item rounded-lg px-4 py-3 font-medium text-sm transition-all duration-200 ${publishing ? 'animate-pulse-shrink' : ''}`}
                onClick={publishNow}
                disabled={publishing}
                title="Publish results now (host only)"
              >
                {publishing ? '📣 Publishing…' : '📣 Publish results'}
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
            <div className="animate-fade-in-up-delayed w-full">
              <p className="font-semibold mb-3" style={{ color: 'var(--foreground)' }}>
                📊 Top Agreement (IDs only):
              </p>
              <div className="space-y-2">
                {topPicks.map((p, index) => (
                  <div key={p.id} className="glass-card rounded-lg p-3 flex justify-between items-center animate-fade-in" style={{ animationDelay: `${index * 0.08}s` }}>
                    <span className="font-mono text-sm" style={{ color: 'var(--foreground)' }}>
                      {p.id}
                    </span>
                    <div className="chip text-xs">{(p.pct * 100).toFixed(0)}%</div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="mb-3 text-sm" style={{ color: 'var(--muted)' }}>No agreement data yet.</p>
          )}
        </div>
      )}

      <div className="space-y-6">
        <div className="glass-card rounded-lg p-5 animate-fade-in-up">
          <h3 className="font-semibold text-lg mb-4 text-green-600 dark:text-green-400">✅ Accepted ({accepted.length})</h3>
          {accepted.length > 0 ? (
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
          )}
        </div>

        <div className="glass-card rounded-lg p-5 animate-fade-in-up-delayed">
          <h3 className="font-semibold text-lg mb-4 text-red-600 dark:text-red-400">❌ Rejected ({rejected.length})</h3>
          {rejected.length > 0 ? (
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