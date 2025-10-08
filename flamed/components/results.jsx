import { useEffect, useRef, useState } from "react";
import CongratulationCard from "./CongratulationCard";

export default function Results({ restaurants, acceptedIds, rejectedIds, groupId, sessionId, onRestart, memberCount }) {
  //fæ array af accepted rejected veitingastöðum
  const accepted = restaurants.filter(r => acceptedIds.includes(r.id));
  const rejected = restaurants.filter(r => rejectedIds.includes(r.id));

  //states fyrir submit, fetch, og errors
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [agg, setAgg] = useState(null);
  const [err, setErr] = useState('');

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
    //hef error handling fyrir allt þetta
    } catch (e) {
      setErr(e.message || 'Failed to fetch results.');
    } finally {
      setFetching(false);
    }
  }

  //finn nöfn vetitingastaðan úr id
  const idToName = new Map(restaurants.map(r => [r.id, r.name]));
  //finn nöfn af consensus veitingastaðunum
  const consensusNames = (agg?.consensus_ids || []).map(id => idToName.get(id) || String(id));

  // Sort top picks by percentage consensus
  const topPicks = agg?.percentages
    ? Object.entries(agg.percentages)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([id, pct]) => {
          // Try both string and number versions of the id to find the restaurant name
          const restaurantName = idToName.get(Number(id)) || idToName.get(String(id)) || idToName.get(parseInt(id, 10));
          return { id, name: restaurantName || `Restaurant #${id}`, pct };
        })
    : [];

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

      <div className="flex gap-3 flex-wrap mb-6">
        {groupId && sessionId ? (
          <>
            <button
              className={`nav-item rounded-lg px-4 py-3 font-medium text-sm transition-all duration-200 ${
                submitted ? 'animate-subtle-ping' : ''
              } ${submitting ? 'animate-pulse-shrink' : ''}`}
              onClick={submitMyPicks}
              disabled={submitting || submitted}
              title="Send your picks to the server for this round"
            >
              {submitted ? '✅ Submitted' : (submitting ? '⏳ Submitting…' : '📤 Submit my picks')}
            </button>

            <button
              className={`nav-item rounded-lg px-4 py-3 font-medium text-sm transition-all duration-200 ${
                fetching ? 'animate-pulse-shrink' : ''
              }`}
              onClick={refreshGroupResult}
              disabled={fetching}
              title="Fetch aggregated picks for this round"
            >
              {fetching ? '🔄 Fetching…' : '🔄 Refresh group result'}
            </button>

            {typeof memberCount === 'number' && (
              <div className="chip self-center animate-fade-in">
                👥 Submitters: {agg?.submitters ?? 0} / {memberCount}
              </div>
            )}
          </>
        ) : (
          <div className="glass-card rounded-lg p-4" style={{ color: 'var(--muted)' }}>
            <p className="text-sm">
              🚫 Not in a group/round. Submit/aggregate disabled.
            </p>
          </div>
        )}

        {onRestart && (
          <button className="nav-item rounded-lg px-4 py-3 font-medium text-sm animate-bounce-side" 
                  onClick={onRestart}>
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

          {consensusNames.length > 0 ? (
            <CongratulationCard 
              restaurantNames={consensusNames} 
              isVisible={true} 
            />
          ) : (
            <div className="glass-card rounded-lg p-4 mb-4" 
                 style={{ background: 'var(--nav-item-bg)', color: 'var(--muted)' }}>
              <p className="text-sm animate-text-pulse">⏳ No unanimous pick yet...</p>
            </div>
          )}

          {topPicks.length > 0 && (
            <div className="animate-fade-in-up-delayed">
              <p className="font-semibold mb-3" style={{ color: 'var(--foreground)' }}>
                📊 Top Agreement:
              </p>
              <div className="space-y-2">
                {topPicks.map((p, index) => (
                  <div key={p.id} 
                       className="glass-card rounded-lg p-3 flex justify-between items-center animate-fade-in" 
                       style={{ animationDelay: `${index * 0.1}s` }}>
                    <span className="font-medium" style={{ color: 'var(--foreground)' }}>
                      {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '📍'} {p.name}
                    </span>
                    <div className="chip">
                      {(p.pct * 100).toFixed(0)}%
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="space-y-6">
        <div className="glass-card rounded-lg p-5 animate-fade-in-up">
          <h3 className="font-semibold text-lg mb-4 text-green-600 dark:text-green-400">
            ✅ Accepted ({accepted.length})
          </h3>
          {accepted.length > 0 ? (
            <div className="space-y-2">
              {accepted.map((r, index) => (
                <div key={r.id} 
                     className="glass-card rounded-lg p-3 animate-fade-in hover:scale-105 transition-transform duration-200" 
                     style={{ 
                       animationDelay: `${index * 0.1}s`,
                       background: 'var(--nav-item-hover)' 
                     }}>
                  <span className="font-medium animate-float" style={{ color: 'var(--foreground)' }}>
                    🍽️ {r.name}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="glass-card rounded-lg p-4" 
                 style={{ background: 'var(--nav-item-bg)', color: 'var(--muted)' }}>
              <p className="text-sm animate-text-pulse">No restaurants accepted yet...</p>
            </div>
          )}
        </div>
        
        <div className="glass-card rounded-lg p-5 animate-fade-in-up-delayed">
          <h3 className="font-semibold text-lg mb-4 text-red-600 dark:text-red-400">
            ❌ Rejected ({rejected.length})
          </h3>
          {rejected.length > 0 ? (
            <div className="space-y-2">
              {rejected.map((r, index) => (
                <div key={r.id} 
                     className="glass-card rounded-lg p-3 animate-fade-in opacity-70 hover:opacity-90 transition-opacity duration-200" 
                     style={{ 
                       animationDelay: `${index * 0.1}s`,
                       background: 'var(--nav-item-bg)' 
                     }}>
                  <span className="font-medium" style={{ color: 'var(--muted)' }}>
                    🚫 {r.name}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="glass-card rounded-lg p-4" 
                 style={{ background: 'var(--nav-item-bg)', color: 'var(--muted)' }}>
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