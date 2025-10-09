import { useCallback, useEffect, useMemo, useState } from "react";
import { supabaseBrowser } from '@/utils/supabase/browser';

export default function Results({ restaurants, acceptedIds, rejectedIds, groupId, sessionId, onRestart }) {
  //fæ array af accepted rejected veitingastöðum
  const accepted = restaurants.filter(r => acceptedIds.includes(r.id));
  const rejected = restaurants.filter(r => rejectedIds.includes(r.id));

  // State
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [agg, setAgg] = useState(null);
  const [status, setStatus] = useState(null);
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

  // Fetch results status (published or not) and aggregation once published
  const refreshGroupResult = useCallback(async () => {
    if (!groupId || !sessionId) {
      setErr('Missing groupId or sessionId.');
      return false;
    }
    setErr('');
    setFetching(true);

    try {
      const res = await fetch(`/api/groups/${groupId}/results?session_id=${encodeURIComponent(sessionId)}`, {
        method: 'GET',
        credentials: 'include',
      });
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

  // Host control: publish results for the current session immediately
  async function publishNow() {
    if (!groupId || !isHost) return;
    setErr('');
    setPublishing(true);
    try {
      const res = await fetch(`/api/groups/${groupId}/publish`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        credentials: 'include',
      });
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

  // Auto-submit picks on mount (once) and poll status until published
  useEffect(() => {
    let cancelled = false;

    async function autoSubmitIfNeeded() {
      if (!groupId || !sessionId) return;
      if (submitted) return;
      try {
        setSubmitting(true);
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
        if (!cancelled) setSubmitted(true);
      } catch (e) {
        if (!cancelled) setErr(e.message || 'Failed to submit results.');
      } finally {
        if (!cancelled) setSubmitting(false);
      }
    }

    autoSubmitIfNeeded();

    // Poll server every 8s until published
  let timer = null;
    async function tick() {
      if (cancelled) return;
      const isPublished = await refreshGroupResult();
      if (!isPublished) timer = setTimeout(tick, 8000);
    }
    tick();

    return () => { cancelled = true; if (timer) clearTimeout(timer); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId, sessionId, refreshGroupResult, submitted]);

  // Listen for new submissions or publish messages to refresh immediately
  useEffect(() => {
    if (!groupId || !sessionId) return;
    const supa = supabaseBrowser();
    const channel = supa
      .channel(`results:${groupId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'group_messages', filter: `group_id=eq.${groupId}` }, (payload) => {
        try {
          const j = JSON.parse(payload?.new?.content || '{}');
          if (!j || j.session_id !== sessionId) return;
          if (j.type === 'swipe_results' || j.type === 'publish_results') {
            refreshGroupResult();
          }
        } catch {}
      })
      .subscribe();

    return () => {
      try { supa.removeChannel(channel); } catch {}
    };
  }, [groupId, sessionId, refreshGroupResult]);

  // Prepare top picks (ID + percentage only)
  const topPicks = useMemo(() => {
    if (!Array.isArray(agg?.top_agreement)) return [];
    return agg.top_agreement
      .filter(item => item && item.id != null)
      .slice(0, 5)
      .map(item => ({
        id: String(item.id),
        pct: typeof item.pct === 'number' ? item.pct : 0,
      }));
  }, [agg?.top_agreement]);

  //Temp html
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

      <div className="flex gap-2 flex-wrap mb-4 items-center">
        {!groupId || !sessionId ? (
          <p className="text-sm text-gray-600">Not in a group/round.</p>
        ) : (
          <>
            <p className="text-sm text-gray-600">
              {published ? 'Results have been published.' : 'Waiting for host to publish results…'}
              {status?.submitters != null ? ` • submissions received: ${status.submitters}` : ''}
              {` `}
              {`(`}you submitted: {submitted ? 'yes' : 'no'}{`)`}
            </p>
            {!published && (
              <>
                <button
                  className="border rounded px-3 py-2"
                  onClick={refreshGroupResult}
                  disabled={fetching}
                  title="Fetch latest status"
                >
                  {fetching ? 'Refreshing…' : 'Refresh now'}
                </button>
                {isHost && (
                  <button
                    className="border rounded px-3 py-2"
                    onClick={publishNow}
                    disabled={publishing}
                    title="Publish results now"
                  >
                    {publishing ? 'Publishing…' : 'Publish results now'}
                  </button>
                )}
              </>
            )}
          </>
        )}
        {onRestart && (
          <button className="border rounded px-3 py-2" onClick={onRestart}>Start over</button>
        )}
      </div>

      {agg && (
        <div className="mb-6">
          <h3 className="font-semibold mb-2">Group aggregation</h3>
          <p className="text-sm text-gray-600 mb-2">
            Submitters: {agg.submitters} • Messages considered: {agg.messages_considered}
          </p>

          {topPicks.length > 0 && (
            <div>
              <p className="font-semibold mb-1">Top agreement (percent):</p>
              <ul className="list-disc ml-5">
                {topPicks.map(p => (
                  <li key={p.id}>
                    ID {p.id}: {(p.pct * 100).toFixed(0)}%
                  </li>
                ))}
              </div>
            </div>
          ) : (
            <p className="mb-3 text-sm" style={{ color: 'var(--muted)' }}>No agreement data yet.</p>
          )}
          {topPicks.length === 0 && (
            <p className="mb-3">No agreement data yet.</p>
          )}
        </div>
      )}

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