import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  // Enrichment state for top picks
  const [topDetails, setTopDetails] = useState({}); // id -> restaurant record
  const [geoMap, setGeoMap] = useState({});        // id -> { lat, lng, formatted_address }
  const [origin, setOrigin] = useState(null);      // { lat, lng }
  const [distances, setDistances] = useState({});  // id -> { distance_text, duration_text, ... }
  const [locError, setLocError] = useState(null);
  const requestedGeoRef = useRef(false);
  const distanceRequestedRef = useRef(false);
  const geocodeAttemptedRef = useRef(false);

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
      // Continue polling (less frequently after publish) to keep submitter count live
      timer = setTimeout(tick, isPub ? 12000 : 8000);
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

  // Merge: prefer detail from enriched map, fall back to provided restaurants list
  const selectedRestaurant = useMemo(() => {
    if (!selectedTopId) return null;
    const enriched = topDetails[selectedTopId];
    if (enriched) return enriched;
    return restaurants.find(r => String(r.id) === String(selectedTopId)) || null;
  }, [restaurants, selectedTopId, topDetails]);

  // Collapse states
  const [showAccepted, setShowAccepted] = useState(false);
  const [showRejected, setShowRejected] = useState(false);

  // Mark results viewed for navbar logic
  useEffect(() => {
    try { if (groupId) localStorage.setItem('activeGameResultsWatched', String(groupId)); } catch {}
  }, [groupId]);

  // Fetch enrichment (restaurant + geo) for top picks once published
  useEffect(() => {
    if (!published || topPicks.length === 0) return;
    let cancelled = false;
    (async () => {
      const missingIds = topPicks
        .map(p => p.id)
        .filter(id => !topDetails[id]);
      if (missingIds.length === 0) return;
      try {
        const supa = supabaseBrowser();
        // Fetch restaurant details
        const { data: restData, error: rErr } = await supa
          .from('restaurants')
          .select('id,name,avg_rating,price_tag,cuisines,parent_city,hero_img_url,square_img_url,review_count')
          .in('id', missingIds);
        if (rErr) throw new Error(rErr.message);
        // Fetch geo rows
        const { data: geoData, error: gErr } = await supa
          .from('restaurant_geo')
          .select('restaurant_id,lat,lng,formatted_address')
          .in('restaurant_id', missingIds);
        if (gErr) throw new Error(gErr.message);
        if (cancelled) return;
        const newDetails = { ...topDetails };
        restData?.forEach(r => { if (r?.id) newDetails[r.id] = { ...newDetails[r.id], ...r }; });
        const newGeo = { ...geoMap };
        geoData?.forEach(g => { if (g?.restaurant_id) newGeo[g.restaurant_id] = { lat: g.lat, lng: g.lng, formatted_address: g.formatted_address }; });
        setTopDetails(newDetails);
        setGeoMap(newGeo);
      } catch (e) {
        // Silent fail; enrichment is best-effort
        console.warn('Top pick enrichment failed', e);
      }
    })();
    return () => { cancelled = true; };
  }, [published, topPicks, topDetails, geoMap]);

  // Attempt geolocation once we have published results & at least one top pick
  useEffect(() => {
    if (!published || topPicks.length === 0) return;
    if (origin || locError) return; // already have or failed
    if (!navigator?.geolocation) { setLocError('Geolocation unsupported'); return; }
    navigator.geolocation.getCurrentPosition(
      pos => {
        setOrigin({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      err => {
        setLocError(err?.message || 'Location denied');
      },
      { enableHighAccuracy: false, timeout: 8000 }
    );
  }, [published, topPicks, origin, locError]);

  // Driving distance lookup using /api/distance (required method). No alternative fallback.
  useEffect(() => {
    if (!published) return;
    if (!origin) return; // need user location
    if (topPicks.length === 0) return;
    // Only proceed if we have geo for at least one ID without distance yet
    const need = topPicks.filter(p => geoMap[p.id] && !distances[p.id]);
    if (need.length === 0) return;
    // Avoid re-issuing too frequently
    if (distanceRequestedRef.current) return;
    distanceRequestedRef.current = true;
    (async () => {
      try {
        const destinations = need.map(n => ({ id: n.id, ...geoMap[n.id] })).filter(d => typeof d.lat === 'number' && typeof d.lng === 'number');
        if (destinations.length === 0) return;
        const res = await fetch('/api/distance', {
          method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ origin, destinations, mode: 'driving', useTraffic: true }),
          });
        if (!res.ok) {
          console.warn('Distance API error status, suppressing distances');
          return; // per requirement: on error, do not display driving distance
        }
        const j = await res.json().catch(() => ({}));
        if (!j?.results) return;
        const map = { ...distances };
        j.results.forEach(r => { if (r?.id) map[r.id] = r; });
        setDistances(map);
      } catch (e) {
        console.warn('Distance fetch failed', e);
      }
    })();
  }, [published, origin, topPicks, geoMap, distances]);

  // Podium: convenience winner reselect
  const winnerId = topPicks[0]?.id;
  const winnerDistance = winnerId ? distances[winnerId] : null;
  const selectedDistance = selectedTopId ? distances[selectedTopId] : null;
  const selectedGeo = selectedTopId ? geoMap[selectedTopId] : null;

  // Attempt to geocode any top picks missing geo using /api/admin/geo-upsert (bypass attempt)
  useEffect(() => {
    if (!published) return;
    if (geocodeAttemptedRef.current) return;
    const needGeo = topPicks.map(p => p.id).filter(id => !geoMap[id]);
    if (needGeo.length === 0) return;
    geocodeAttemptedRef.current = true;
    (async () => {
      for (const id of needGeo) {
        try {
          const rest = topDetails[id] || restaurants.find(r => String(r.id) === id);
          if (!rest?.name || !rest?.parent_city) continue;
          const res = await fetch('/api/admin/geo-upsert', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ restaurant_id: id, name: rest.name, city: rest.parent_city, force: false })
          });
          if (!res.ok) continue; // on error we just skip per requirement
          const j = await res.json().catch(() => ({}));
          const data = j?.data;
          if (data?.lat && data?.lng) {
            setGeoMap(g => ({ ...g, [id]: { lat: data.lat, lng: data.lng, formatted_address: data.formatted_address } }));
          }
        } catch (e) {
          // ignore errors intentionally
        }
      }
      // Allow a second pass if new IDs appear later
      geocodeAttemptedRef.current = false;
    })();
  }, [published, topPicks, geoMap, topDetails, restaurants]);

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

      {/* Hide entire section after submission and during published results */}
      {!(submitted && !published) && !published && (
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
            {published && typeof memberCount === 'number' && (
              <div className="chip self-center animate-fade-in text-xs">
                👥 {status?.submitters ?? agg?.submitters ?? 0} / {memberCount} submitted
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
      )}

      {/* Non-host waiting section - centered with better border */}
      {!published && !isHost && groupId && sessionId && (
        <div className="glass-card rounded-lg p-6 mb-6 animate-fade-in-grow border-2 border-dashed" 
             style={{ borderColor: 'var(--accent)', background: 'var(--nav-item-bg)' }}>
          <div className="flex flex-col items-center justify-center text-center space-y-4">
            <div className="relative">
              <div className="animate-spin rounded-full h-10 w-10 border-2 border-[var(--accent)] border-t-transparent opacity-80"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-lg">⌛</span>
              </div>
            </div>
            
            <div className="space-y-2">
              <h3 className="text-lg font-semibold" style={{ color: 'var(--foreground)' }}>
                Waiting for Host to Publish Results
              </h3>
              <div className="flex items-center justify-center gap-2 px-4 py-2 rounded-full" 
                   style={{ background: 'var(--nav-item-hover)', border: '1px solid var(--accent)' }}>
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>
                  You submitted: {submitted ? '✅ Yes' : '📤 Submitting...'}
                </span>
              </div>
              
              {typeof memberCount === 'number' && (
                <p className="text-sm opacity-75 mt-2" style={{ color: 'var(--muted)' }}>
                  👥 {status?.submitters ?? agg?.submitters ?? 0} / {memberCount} players have submitted
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Host submission counter and publish button - centered */}
      {!published && isHost && groupId && sessionId && (
        <div className="glass-card rounded-lg p-8 mb-6 animate-fade-in-grow border-2 border-solid" 
             style={{ borderColor: 'var(--accent)', background: 'var(--nav-item-bg)' }}>
          <div className="flex flex-col items-center justify-center text-center space-y-6">
            
            {/* Submission Progress Circle */}
            <div className="relative w-28 h-28 flex items-center justify-center">
              <svg className="w-28 h-28 transform -rotate-90" viewBox="0 0 120 120">
                <circle
                  cx="60"
                  cy="60"
                  r="50"
                  stroke="var(--nav-item-hover)"
                  strokeWidth="6"
                  fill="none"
                  opacity="0.3"
                />
                <circle
                  cx="60"
                  cy="60"
                  r="50"
                  stroke="var(--accent)"
                  strokeWidth="6"
                  fill="none"
                  strokeDasharray={`${2 * Math.PI * 50}`}
                  strokeDashoffset={`${2 * Math.PI * 50 * (1 - ((status?.submitters ?? agg?.submitters ?? 0) / (memberCount ?? 1)))}`}
                  className="transition-all duration-500 ease-out"
                  strokeLinecap="round"
                />
              </svg>
              
              {/* Center content */}
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold" style={{ color: 'var(--accent)' }}>
                    {status?.submitters ?? agg?.submitters ?? 0}
                  </span>
                  <span className="text-lg opacity-60">/</span>
                  <span className="text-2xl font-semibold opacity-80" style={{ color: 'var(--foreground)' }}>
                    {memberCount ?? '?'}
                  </span>
                </div>
                <span className="text-xs font-medium mt-1" style={{ color: 'var(--muted)' }}>
                  Players
                </span>
              </div>
            </div>
            
            {/* Status Text */}
            <div className="space-y-2">
              <h3 className="text-xl font-semibold" style={{ color: 'var(--foreground)' }}>
                🎯 Waiting for Players to Submit
              </h3>
              <div className="flex items-center justify-center gap-2 px-4 py-2 rounded-full" 
                   style={{ background: 'var(--nav-item-hover)', border: '1px solid var(--accent)' }}>
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>
                  Updates every {published ? '12' : '8'} seconds
                </span>
              </div>
            </div>
            
            {/* Publish Button */}
            <button
              className={`nav-item rounded-lg px-8 py-4 font-semibold text-base transition-all duration-200 shadow-lg border-2 ${publishing ? 'animate-pulse' : 'hover:scale-105 hover:shadow-xl'}`}
              onClick={publishNow}
              disabled={publishing}
              title="Publish results now (host only)"
              style={{ minWidth: '280px', borderColor: 'var(--accent)' }}
            >
              {publishing ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-current border-t-transparent"></div>
                  📣 Publishing Results…
                </span>
              ) : (
                '📣 Publish Results & End Game'
              )}
            </button>
          </div>
        </div>
      )}

      {agg && (
        <div className="glass-card rounded-lg p-5 mb-3 animate-fade-in-grow">
          <h3 className="font-semibold text-lg mb-4 animate-text-pulse" style={{ color: 'var(--accent)' }}>
            🤝 Group Aggregation
          </h3>
          <div className="flex gap-2 mb-4 flex-wrap">
            <div className="chip">👥 {agg.submitters}{memberCount ? ` / ${memberCount}` : ''}</div>
            <div className="chip">📨 {agg.messages_considered / 2 /* Það eru alltaf sent tvö skilaboð, deili með tveimum*/} messages</div>
            {locError && <div className="chip" title={locError}>📍 Location off</div>}
          </div>
          {topPicks.length > 0 ? (
            <div className="w-full space-y-5 animate-fade-in-up-delayed">
              {/* Podium layout */}
              <div className="flex justify-center items-end gap-3 md:gap-6">
                {topPicks.slice(0,3).map((p, idx) => {
                  const rank = idx + 1;
                  const r = topDetails[p.id] || restaurants.find(rr => String(rr.id) === p.id);
                  const baseHeight = rank === 1 ? 140 : rank === 2 ? 110 : 95; // winner tallest
                  const dist = distances[p.id];
                  return (
                    <button
                      key={p.id}
                      onClick={() => setSelectedTopId(p.id)}
                      className={`relative flex flex-col items-center justify-end rounded-lg transition-all duration-200 overflow-hidden group border ${selectedTopId === p.id ? 'border-[var(--accent)] shadow-lg scale-[1.03]' : 'border-transparent hover:scale-[1.04]'}`}
                      style={{ height: baseHeight, width: 130, background: 'var(--nav-item-bg)' }}
                    >
                      <div className="absolute top-1 left-1 chip text-[10px] px-2 py-1" style={{ backgroundColor: 'rgba(0, 0, 0, 0.8)', border: '1px solid rgba(0, 0, 0, 0.9)' }}>#{rank}</div>
                      <div className="absolute top-1 right-1 chip text-[10px] px-2 py-1" style={{ backgroundColor: 'rgba(0, 0, 0, 0.8)', border: '1px solid rgba(0, 0, 0, 0.9)' }}>{(p.pct * 100).toFixed(0)}%</div>
                      {r?.square_img_url || r?.hero_img_url ? (
                        <Image
                          src={r.square_img_url || r.hero_img_url}
                          alt={r?.name || 'Restaurant'}
                          fill
                          className="object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                        />
                      ) : (
                        <span className="text-[10px] text-[var(--muted)]">No img</span>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
                      <div className="relative z-10 p-2 w-full text-center">
                        <p className="text-[11px] font-semibold truncate" style={{ color: 'white' }}>{r?.name || p.id}</p>
                        {dist && dist.distance_text && dist.duration_text && (
                          <p className="text-[10px] opacity-80 truncate" style={{ color: 'white' }}>{dist.distance_text} • {dist.duration_text}</p>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
              {winnerId && selectedTopId !== winnerId && (
                <div className="flex justify-center">
                  <button onClick={() => setSelectedTopId(winnerId)} className="chip text-xs hover:brightness-110">
                    🏆 Back to Winner
                  </button>
                </div>
              )}
              {/* Detailed selected card */}
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
                      <div className="chip text-xs">{(topPicks.find(p => p.id === selectedTopId)?.pct * 100 || 0).toFixed(0)}%</div>
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs text-[var(--muted)]">
                      {selectedRestaurant?.parent_city && <span className="chip">📍 {selectedRestaurant.parent_city}</span>}
                      {selectedGeo?.formatted_address && <span className="chip" title={selectedGeo.formatted_address}>🗺️ Addr</span>}
                      {selectedDistance?.distance_text && selectedDistance?.duration_text && (
                        <span className="chip" title="Driving distance (Google)">🚗 {selectedDistance.distance_text} • {selectedDistance.duration_text}</span>
                      )}
                      {selectedRestaurant?.price_tag && <span className="chip">💲 {selectedRestaurant.price_tag}</span>}
                      {selectedRestaurant?.avg_rating != null && <span className="chip">⭐ {Number(selectedRestaurant.avg_rating).toFixed(1)}</span>}
                      {Array.isArray(selectedRestaurant?.cuisines) && selectedRestaurant.cuisines.slice(0,4).map(c => (
                        <span key={c} className="chip">{c}</span>
                      ))}
                      {selectedRestaurant?.review_count != null && <span className="chip">💬 {selectedRestaurant.review_count}</span>}
                    </div>
                    <p className="text-sm text-[var(--muted)]">ID: <span className="font-mono">{selectedTopId}</span></p>
                  </div>
                </div>
              </div>
              {/* Remaining runner ups beyond top3 */}
              {topPicks.length > 3 && (
                <div className="space-y-2">
                  <p className="font-semibold text-sm" style={{ color: 'var(--foreground)' }}>More picks:</p>
                  <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-2">
                    {topPicks.slice(3,5).map((p, idx) => {
                      const r = topDetails[p.id] || restaurants.find(rr => String(rr.id) === p.id);
                      const dist = distances[p.id];
                      return (
                        <button
                          key={p.id}
                          onClick={() => setSelectedTopId(p.id)}
                          className={`relative rounded-lg overflow-hidden group border transition-all duration-200 ${selectedTopId === p.id ? 'border-[var(--accent)] shadow-lg scale-[1.02]' : 'border-transparent hover:scale-[1.02]'} bg-[var(--nav-item-bg)]`}
                          style={{ animationDelay: `${idx * 0.05}s`, minHeight: 130 }}
                        >
                          {r?.square_img_url || r?.hero_img_url ? (
                            <Image
                              src={r.square_img_url || r.hero_img_url}
                              alt={r?.name || 'Restaurant'}
                              fill
                              className="object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                            />
                          ) : (
                            <div className="absolute inset-0 flex items-center justify-center text-[10px] text-[var(--muted)]">No img</div>
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/25 to-transparent" />
                          <div className="absolute top-1 left-1 chip text-[10px] px-2 py-1" style={{ backgroundColor: 'rgba(0, 0, 0, 0.8)', border: '1px solid rgba(0, 0, 0, 0.9)' }}>#{3 + idx + 1}</div>
                          <div className="absolute top-1 right-1 chip text-[10px] px-2 py-1" style={{ backgroundColor: 'rgba(0, 0, 0, 0.8)', border: '1px solid rgba(0, 0, 0, 0.9)' }}>{(p.pct * 100).toFixed(0)}%</div>
                          <div className="relative z-10 p-2 text-left">
                            <p className="text-[11px] font-semibold truncate" style={{ color: 'var(--foreground)' }}>{r?.name || p.id}</p>
                            {dist?.distance_text && dist?.duration_text && (
                              <p className="text-[10px] opacity-80 truncate">{dist.distance_text} • {dist.duration_text}</p>
                            )}
                            <p className="text-[10px] opacity-60 font-mono truncate mt-1">{p.id}</p>
                          </div>
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