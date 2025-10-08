import { useState } from "react";
import { useEffect } from "react";

export default function Results({ restaurants, acceptedIds, rejectedIds, groupId, sessionId, onRestart }) {
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
        .map(([id, pct]) => ({ id, name: idToName.get(Number(id)) || String(id), pct }))
    : [];

  //Temp html
  // mark results as watched so navbar can hide the active-game pill
  useEffect(() => {
    try {
      if (groupId) {
        // store the groupId that had results watched
        localStorage.setItem('activeGameResultsWatched', String(groupId));
      }
    } catch {}
  }, [groupId]);
  return (
    <div className="bg-white rounded-lg p-6 dark:bg-black 
                    shadow-[0_4px_15px_rgba(0,0,0,0.1)] dark:shadow-[0_4px_5px_rgba(128,128,128,0.2)]">
      <h2 className="text-2xl font-bold mb-4">Results</h2>

      {/*Byrti villurnar ef það eru*/}
      {!!err && <p className="text-red-600 mb-3">{err}</p>}

      <div className="flex gap-2 flex-wrap mb-4">
        {groupId && sessionId ? (
          <>
            <button
              className="border rounded px-3 py-2"
              onClick={submitMyPicks}
              disabled={submitting || submitted}
              title="Send your picks to the server for this round"
            >
              {submitted ? 'Submitted' : (submitting ? 'Submitting…' : 'Submit my picks')}
            </button>

            <button
              className="border rounded px-3 py-2"
              onClick={refreshGroupResult}
              disabled={fetching}
              title="Fetch aggregated picks for this round"
            >
              {fetching ? 'Fetching…' : 'Refresh group result'}
            </button>
          </>
        ) : (
          <p className="text-sm text-gray-600">
            Not in a group/round. Submit/aggregate disabled.
          </p>
        )}

        {onRestart && (
          <button className="border rounded px-3 py-2" onClick={onRestart}>
            Start over
          </button>
        )}
      </div>

      {agg && (
        <div className="mb-6">
          <h3 className="font-semibold mb-2">Group aggregation</h3>
          <p className="text-sm text-gray-600 mb-2">
            Submitters: {agg.submitters} • Messages considered: {agg.messages_considered}
          </p>

          {consensusNames.length > 0 ? (
            <div className="mb-3">
              <p className="font-semibold">Consensus pick(s):</p>
              <ul className="list-disc ml-5">
                {consensusNames.map((n, i) => <li key={i}>{n}</li>)}
              </ul>
            </div>
          ) : (
            <p className="mb-3">No unanimous pick yet.</p>
          )}

          {topPicks.length > 0 && (
            <div>
              <p className="font-semibold mb-1">Top agreement (percent):</p>
              <ul className="list-disc ml-5">
                {topPicks.map(p => (
                  <li key={p.id}>
                    {p.name}: {(p.pct * 100).toFixed(0)}%
                  </li>
                ))}
              </ul>
            </div>
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