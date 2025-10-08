'use client';

import { useEffect, useMemo, useState, useRef, useCallback, forwardRef, useImperativeHandle } from "react"; //bætti við useRef, forwardRef, useImperativeHandle til þess að geta notað takkana sem swipe
import { supabase } from "../lib/supabaseClient";
import Results from "./results";

//Next image renderer fyrir myndir
import Image from "next/image";

//framer motion fyrir swiping cards
import { motion, useMotionValue, useTransform, animate, AnimatePresence } from "framer-motion";
import { createPortal } from "react-dom"; //fyrir edge glow like/dislike

//finnur vindow width og height, með gott error handling
//const vw = window?.innerWidth || 1000;
const vw = typeof window !== 'undefined' ? window.innerWidth : 1000;
const vh = typeof window !== 'undefined' ? window.innerHeight : 1000;

//Main functioninið, sem renderar veitingastaðina
export default function Swiper({ groupId, hostPreferences = {}, playerPreferences = {}, isHost = false }) {
    /*Fæ session id, sem er random uuid
    const [sessionId] = useState(() =>
        typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : String(Date.now())
    );
    */

    //Stilli session með error handling og loading
    const [sessionId, setSessionId] = useState(null);
    const [roundLoading, setRoundLoading] = useState(false);
    const [roundError, setRoundError] = useState('');

    // preference summaries, 
    const hostSummary = useMemo(() => {
        const summary = []
        if (hostPreferences?.requireKidFriendly) summary.push('Kid friendly required')
        if (hostPreferences?.maxRadius) summary.push(`Radius ≤ ${hostPreferences.maxRadius} km`)
        if (Array.isArray(hostPreferences?.blockedCategories) && hostPreferences.blockedCategories.length > 0) {
            summary.push(`Blocked categories: ${hostPreferences.blockedCategories.join(', ')}`)
        }
        return summary
    }, [hostPreferences])

    const playerSummary = useMemo(() => {
        const summary = []
        if (playerPreferences?.radius) summary.push(`Radius ≤ ${playerPreferences.radius} km`)
        if (playerPreferences?.rating) summary.push(`Min rating ${playerPreferences.rating}+`)
        if (playerPreferences?.price) summary.push(`Price up to ${playerPreferences.price}`)
        if (playerPreferences?.kidFriendly) summary.push('Prefers kid friendly venues')
        if (Array.isArray(playerPreferences?.categories) && playerPreferences.categories.length > 0) {
            summary.push(`Categories: ${playerPreferences.categories.join(', ')}`)
        }
        if (playerPreferences?.allergies) summary.push(`Allergies noted: ${playerPreferences.allergies}`)
        return summary
    }, [playerPreferences])


    //Fæ session id
    useEffect(() => {
        //error handling ef ekki í group
        if (!groupId) {
            setSessionId(null);
            return;
        }

        let cancelled = false;
        async function loadRound() {
            //loada leikinn 
            setRoundLoading(true);
            setRoundError(''); //núllstilli error
            try {
                //fetcha info um leikinn með 'round' endpointinu
                const res = await fetch(`/api/groups/${groupId}/round`, { credentials: 'include' });
                const j = await res.json().catch(() => ({}));
                if (!res.ok) throw new Error(j?.error || `Failed to load round (${res.status})`);
                //set session id ef ekki cancelled
                if (!cancelled) setSessionId(j?.session_id ?? null);
            //error handling fyrir allt þetta
            } catch (e) {
                if (!cancelled) setRoundError(e.message || 'Failed to load round');
            } finally {
                if (!cancelled) setRoundLoading(false);
            }
        }
        loadRound();
        return () => { cancelled = true; }
    }, [groupId]);

    //bý til breytur sem halda utan um veitingastaðina og hvað er valið
    const [restaurants, setRestaurants] = useState([]); // restaurants state
    const [loading, setLoading] = useState(true);//breyta til þess að geta byrt loading
    const [error, setError] = useState(null); //error state, segir sig sjálft

    const [current, setCurrent] = useState(0); //current staðurinn, geymir listann, byrjar á 0
    const [accepted, setAccepted] = useState([]); //array sem geymir veitingastaðin sem eru samþykktir
    const [rejected, setRejected] = useState([]);
    const [action, setAction] = useState(null); //action state til þess að geta triggerað swipe með tökkum
    const [showEndPrompt, setShowEndPrompt] = useState(false);
    const [memberCount, setMemberCount] = useState(null);
    const [submitters, setSubmitters] = useState(0);
    const [participantsCount, setParticipantsCount] = useState(0);
    const [showResultsView, setShowResultsView] = useState(false);
    const [wasForced, setWasForced] = useState(false);

    //læsir UI þegar verið er að swipa með tökkum
    const [uiLocked, setUiLocked] = useState(false);

    //passa að takkarnir triggeri ekki sama cardið oftar en einu sinni. Unlocka þegar næsta card er komið
    useEffect(() => {
        setUiLocked(false);
    }, [current]);

    // Track swipe status messaging
    const lastStatusRef = useRef(null);
    useEffect(() => {
        lastStatusRef.current = null;
        setWasForced(false);
    }, [sessionId]);

    const postStatus = useCallback(async (status) => {
        if (!groupId || !sessionId) return;
        const normalized = status === 'forced' ? 'forced' : (status === 'completed' ? 'completed' : 'started');
        if (lastStatusRef.current === normalized) return;
        try {
            const res = await fetch(`/api/groups/${groupId}/messages`, {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ content: JSON.stringify({ type: 'swipe_status', session_id: sessionId, status: normalized }) })
            });
            if (res.ok) {
                lastStatusRef.current = normalized;
            }
        } catch (e) {
            console.error('postStatus error', e);
        }
    }, [groupId, sessionId]);

    useEffect(() => {
        if (!groupId || !sessionId) return;
        postStatus('started');
    }, [groupId, sessionId, postStatus]);

        /*
        Example: Fetch via Supabase RPC with filters (to enable when backend is ready)

        useEffect(() => {
            async function fetchRestaurants() {
                setLoading(true)
                setError(null)
                try {
                    const filters = {
                        // host constraints
                        require_kid_friendly: !!hostPreferences?.requireKidFriendly,
                        max_radius_km: hostPreferences?.maxRadius ? Number(hostPreferences.maxRadius) : null,
                        blocked_categories: Array.isArray(hostPreferences?.blockedCategories) ? hostPreferences.blockedCategories : [],

                        // player preferences
                        radius_km: playerPreferences?.radius ? Number(playerPreferences.radius) : null,
                        min_rating: playerPreferences?.rating ? Number(playerPreferences.rating) : null,
                        price_ceiling: playerPreferences?.price || null, // '$' | '$$' | '$$$' | '$$$$'
                        kid_friendly: !!playerPreferences?.kidFriendly,
                        allergies: playerPreferences?.allergies || '',
                        categories: Array.isArray(playerPreferences?.categories) ? playerPreferences.categories : [],
                    }

                    // Option A: call Supabase RPC directly (browser client)
                    // const { data, error } = await supabase.rpc('get_random_restaurants', {
                    //   p_limit: 30,
                    //   p_filters: filters,
                    // })
                    // if (error) throw error
                    // setRestaurants(data ?? [])

                    // Option B: via API route that proxies to RPC
                    // const res = await fetch('/api/restaurants/search', {
                    //   method: 'POST',
                    //   headers: { 'content-type': 'application/json' },
                    //   body: JSON.stringify({ fn: 'get_random_restaurants', args: { p_limit: 30, p_filters: filters } }),
                    //   credentials: 'include',
                    // })
                    // const j = await res.json()
                    // if (!res.ok) throw new Error(j?.error || `Failed (${res.status})`)
                    // setRestaurants(Array.isArray(j.items) ? j.items : [])
                } catch (e) {
                    setError(e.message || 'Failed to fetch restaurants')
                    setRestaurants([])
                } finally {
                    setLoading(false)
                }
            }
            // fetchRestaurants()
        }, [hostPreferences, playerPreferences])
        */

    // Fetch restaurants using backend filter builder for this group
    useEffect(() => {
        let cancelled = false
        async function load() {
            setLoading(true)
            setError(null)
            try {
                if (!groupId) throw new Error('Missing groupId')
                // Build the player filter payload similar to restaurants/search POST
                const player = {
                    query: '',
                    minRating: playerPreferences?.rating ? Number(playerPreferences.rating) : undefined,
                    categories: Array.isArray(playerPreferences?.categories) ? playerPreferences.categories : [],
                    price: Array.isArray(playerPreferences?.price) ? playerPreferences.price : (playerPreferences?.price ? [playerPreferences.price] : []),
                }
                const res = await fetch(`/api/groups/${groupId}/restaurants`, {
                    method: 'POST',
                    headers: { 'content-type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ player, sortBy: 'random', limit: 15 })
                })
                const j = await res.json().catch(() => ({}))
                if (!res.ok) throw new Error(j?.error || `Failed to load restaurants (${res.status})`)
                if (!cancelled) setRestaurants(Array.isArray(j?.data) ? j.data : [])
            } catch (e) {
                if (!cancelled) { setError(e.message || 'Failed to fetch restaurants'); setRestaurants([]) }
            } finally {
                if (!cancelled) setLoading(false)
            }
        }
        load()
        return () => { cancelled = true }
    }, [groupId, JSON.stringify(playerPreferences)])

    async function loadMoreRestaurants() {
        try {
            if (!groupId) return
            const player = {
                query: '',
                minRating: playerPreferences?.rating ? Number(playerPreferences.rating) : undefined,
                categories: Array.isArray(playerPreferences?.categories) ? playerPreferences.categories : [],
                price: Array.isArray(playerPreferences?.price) ? playerPreferences.price : (playerPreferences?.price ? [playerPreferences.price] : []),
            }
            const seenIds = restaurants.map(r => String(r.id))
            const res = await fetch(`/api/groups/${groupId}/restaurants`, {
                method: 'POST', headers: { 'content-type': 'application/json' }, credentials: 'include',
                body: JSON.stringify({ player, sortBy: 'random', limit: 15, excludeIds: seenIds })
            })
            const j = await res.json().catch(() => ({}))
            if (!res.ok) throw new Error(j?.error || `Failed to load more (${res.status})`)
            const incoming = (Array.isArray(j?.data) ? j.data : []).map(r => ({ ...r, id: String(r.id) }))
            // If nothing new returned, allow reshuffle by clearing seenIds (fallback)
            let next = incoming
            if (incoming.length === 0) {
                const res2 = await fetch(`/api/groups/${groupId}/restaurants`, {
                    method: 'POST', headers: { 'content-type': 'application/json' }, credentials: 'include',
                    body: JSON.stringify({ player, sortBy: 'random', limit: 15 })
                })
                const j2 = await res2.json().catch(() => ({}))
                if (res2.ok) next = (Array.isArray(j2?.data) ? j2.data : []).map(r => ({ ...r, id: String(r.id) }))
            }
            // reset end prompt and append, with fallback if nothing new
            setShowEndPrompt(false)
            let added = 0
            setRestaurants(prev => {
                const existing = new Set(prev.map(r => String(r.id)))
                const merged = [...prev]
                for (const r of next) {
                    const key = String(r.id)
                    if (!existing.has(key)) { merged.push(r); existing.add(key); added++ }
                }
                return merged
            })
            // If we couldn't add anything new, reshuffle by replacing list entirely
            if (added === 0 && next.length > 0) {
                setRestaurants(next)
                setCurrent(0)
            }
            // Keep current where it is so user continues swiping seamlessly when items were added
        } catch (e) {
            console.error('loadMoreRestaurants error', e)
        }
    }

    // Show end prompt at 15 swipes (must be declared before any early return)
    useEffect(() => {
        try {
            if (current >= 15 && !showEndPrompt) setShowEndPrompt(true)
        } catch {}
    }, [current, showEndPrompt])

    // Track members (for completion threshold) (must be declared before any early return)
    useEffect(() => {
        let cancelled = false
        if (!groupId) return
        ;(async () => {
            try {
                const m = await fetch(`/api/groups/${groupId}/members`, { credentials: 'include' })
                const mj = await m.json().catch(() => ({}))
                if (!cancelled && m.ok && Array.isArray(mj?.items)) setMemberCount(mj.items.length)
            } catch {}
        })()
        return () => { cancelled = true }
    }, [groupId])

    // Track current submitter count (must be declared before any early return)
    useEffect(() => {
        let cancelled = false
        if (!groupId || !sessionId) return
        let timer
        const tick = async () => {
            try {
                const r = await fetch(`/api/groups/${groupId}/results?session_id=${encodeURIComponent(sessionId)}`, { credentials: 'include' })
                const j = await r.json().catch(() => ({}))
                if (!cancelled && r.ok) {
                    setSubmitters(Number(j?.submitters || 0))
                    setParticipantsCount(Number(j?.participants || 0))
                }
            } catch {}
            if (!cancelled) timer = setTimeout(tick, 2000)
        }
        tick()
        return () => { cancelled = true; if (timer) clearTimeout(timer) }
    }, [groupId, sessionId])

    // Listen for host force-results and auto-finish swiping (must be before any early return)
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
                            if (c?.type === 'force_results' && c?.session_id === sessionId) {
                                setWasForced(true)
                                setCurrent(restaurants.length)
                                setShowResultsView(true)
                                return
                            }
                        } catch {}
                    }
                }
            } catch {}
            if (!cancelled) setTimeout(poll, 2000)
        }
        poll()
        return () => { cancelled = true }
    }, [groupId, sessionId, restaurants.length])

    useEffect(() => {
        if (!showResultsView) return
        if (wasForced) {
            postStatus('forced')
        } else {
            postStatus('completed')
        }
    }, [showResultsView, wasForced, postStatus])

    //sýnir loading
    if (loading) {
        return <div className="text-gray-600">Loading...</div>;
    }

    //error handling, ef enginn veitingastaður fundinn
    if (restaurants.length === 0) {
        return <div className="text-red-600">No restaurants found.</div>;
    }

    //sýnir generic error 
    if (error) {
        return <div className="text-red-600">Error: {error}</div>;
    }

    const t = restaurants[current];

    const acceptedItem = () => {
        setAccepted((prev) => [...prev, t.id]);
        setCurrent((prev) => prev + 1);
    };

    const rejectedItem = () => {
        setRejected((prev) => [...prev, t.id]);
        setCurrent((prev) => prev + 1);
    };

    const ignoreItem = () => {
        setCurrent((prev) => prev + 1);
    };

    //byrti loading eða error ef í group ef round er ekki byrjað
    if (groupId && roundLoading) {
        return <div className="text-gray-600">Loading game…</div>;
    }
    if (groupId && sessionId === null) {
        return (
            <div className="text-gray-700 dark:text-gray-300">
                <p>No active game in this group. Ask the host to start a round.</p>
                {roundError && <p className="text-red-600 mt-2">{roundError}</p>}
            </div>
        );
    }

    // When end of the loaded stack is reached, offer choices inline instead of switching UI
    const outOfCards = current >= restaurants.length
    const everyoneDone = (participantsCount > 0 && submitters >= participantsCount) || (memberCount && submitters >= memberCount)

    if (outOfCards && showResultsView) {
        return (
            <Results
                restaurants={restaurants}
                acceptedIds={accepted}
                rejectedIds={rejected}
                groupId={groupId}
                sessionId={sessionId}
                isHost={isHost}
            />
        );
    }

    const visibleCards = restaurants.slice(current, current + 3);

    //top level function sem triggerar action útfrá tökkum á rétta cardið
    const triggerAction = (type) => {
        if (uiLocked) return; //Þetta er lásinn fyrir takkana
        const top = restaurants[current];
        if (!top) return;
        setUiLocked(true); //Locka cardið þegar það er verið að swipa
        setAction({ type, id: top.id });
    };


    async function forceResultsNow() {
        // Send current picks as a message and post a host notice, then rely on Results auto-fetching
        try {
            if (!groupId || !sessionId) return
            const payload = {
                type: 'swipe_results',
                session_id: sessionId,
                accepted_ids: accepted,
                rejected_ids: rejected,
            }
            await fetch(`/api/groups/${groupId}/messages`, {
                method: 'POST', headers: { 'content-type': 'application/json' }, credentials: 'include',
                body: JSON.stringify({ content: JSON.stringify(payload) })
            })
            // announce force
            await fetch(`/api/groups/${groupId}/messages`, {
                method: 'POST', headers: { 'content-type': 'application/json' }, credentials: 'include',
                body: JSON.stringify({ content: JSON.stringify({ type: 'force_results', session_id: sessionId }) })
            })
            // move to results view by jumping to end
            setWasForced(true)
            setShowResultsView(true)
            setCurrent(restaurants.length)
        } catch (e) {
            console.error('forceResults error', e)
        }
    }

    

    return (
        <div className="min-h-[28rem] flex flex-col items-center justify-center">

            {/* Filters summary removed for a cleaner, more game-like experience */}

            <div className="relative w-72 h-96">
                {/*Animate Presence leyfir exit animation að virka vel og hverfa*/}
                <AnimatePresence initial={false} mode="popLayout">
                    {!outOfCards && visibleCards.map((restaurant, index) => {
                        const isTop = index === 0;
                        const stackIndex = index;
                        {/*Card component sem sér um hvert card, action prop sem triggerar swipe með tökkum*/}
                        return (
                        <Card
                            key={restaurant.id}
                            restaurant={restaurant}
                            isTop={isTop}
                            stackIndex={stackIndex}
                            acceptedItem={acceptedItem}
                            rejectedItem={rejectedItem}
                            ignoreItem={ignoreItem}
                            action={action}
                            onActionConsumed={() => setAction(null)}
                        />
                        );
                    })}
                </AnimatePresence>
                {outOfCards && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center rounded-2xl p-6 border" style={{ background: 'var(--nav-item-bg)', borderColor: 'var(--nav-shadow)', zIndex: 200 }}>
                        <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--foreground)' }}>You’re out of cards</h3>
                        <p className="text-sm mb-4" style={{ color: 'var(--muted)' }}>
                            {everyoneDone ? 'Everyone is finished. You can view results now.' : 'Load more to keep swiping or wait for results.'}
                        </p>
                        <div className="flex gap-2">
                            <button className="nav-item px-3 py-2 rounded-lg" onClick={loadMoreRestaurants}>Continue swiping</button>
                            <button className="px-3 py-2 rounded-lg" style={{ background: 'var(--accent)', color: 'white' }} onClick={() => { setWasForced(false); setCurrent(restaurants.length); setShowResultsView(true); }}>
                                {everyoneDone ? 'View results' : 'Wait for results'}
                            </button>
                        </div>
                        {isHost && (
                            <div className="mt-3 pt-3 border-t border-[color:var(--nav-shadow)] flex justify-between items-center w-full">
                                <span className="text-xs" style={{ color: 'var(--muted)' }}>Host can end now</span>
                                <button className="px-3 py-1 rounded text-xs" style={{ background: 'var(--accent)', color: 'white' }} onClick={forceResultsNow}>
                                    Force results
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            <div className="mt-8 pt-2 px-2 sm:px-0 flex items-center gap-3">
                
                <button onClick={() => triggerAction('reject')}
                    aria-label="Reject" 
                    className="group inline-flex items-center gap-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white/90 dark:bg-black/80 px-3 md:px-4 py-2 font-medium text-red-600 dark:text-red-400 shadow-sm transition-all duration-150 ease-out hover:-translate-y-0.5 hover:shadow-md hover:border-red-300 dark:hover:border-red-700 hover:bg-red-50/60 dark:hover:bg-red-950/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400/60 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-black active:scale-95 active:-translate-y-0.5 active:shadow-inner">
                    
                    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    <span className="hidden md:inline">Reject</span>
                </button>

                <button onClick={() => triggerAction('skip')}
                    aria-label="Skip"
                    className="group inline-flex items-center gap-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white/90 dark:bg-black/80 px-3 md:px-4 py-2 font-medium text-gray-700 dark:text-gray-300 shadow-sm transition-all duration-150 ease-out hover:-translate-y-0.5 hover:shadow-md hover:border-gray-400 dark:hover:border-gray-600 hover:bg-gray-50/60 dark:hover:bg-white/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400/60 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-black active:scale-98 active:-translate-y-0.5 active:shadow-inner">
                    
                    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="9" />
                        <path strokeLinecap="round" d="M8 12h8" />
                    </svg>
                    <span className="hidden md:inline">Skip</span>
                </button>

                <button onClick={() => triggerAction('accept')}
                    aria-label="Accept"
                    className="group inline-flex items-center gap-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white/90 dark:bg-black/80 px-3 md:px-4 py-2 font-medium text-green-600 dark:text-green-400 shadow-sm transition-all duration-150 ease-out hover:-translate-y-0.5 hover:shadow-md hover:border-green-300 dark:hover:border-green-700 hover:bg-green-50/60 dark:hover:bg-green-950/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-400/60 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-black active:scale-98 active:-translate-y-0.5 active:shadow-inner">
                    
                    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="hidden md:inline">Accept</span>
                </button>
                
            </div>

            {/* End prompt modal */}
            {showEndPrompt && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="rounded-2xl p-5 shadow-lg border max-w-sm w-full" style={{ background: 'var(--nav-item-bg)', borderColor: 'var(--nav-shadow)' }}>
                        <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--foreground)' }}>You reached 15 swipes</h3>
                        <p className="text-sm mb-4" style={{ color: 'var(--muted)' }}>
                            {everyoneDone
                                ? 'Everyone is done. See results?'
                                : 'Continue swiping or wait for results.'}
                        </p>
                        <div className="flex gap-2 justify-end">
                            <button className="nav-item px-3 py-2 rounded-lg" onClick={() => setShowEndPrompt(false)}>Continue swiping</button>
                            <button className="px-3 py-2 rounded-lg" style={{ background: 'var(--accent)', color: 'white' }} onClick={() => setCurrent(restaurants.length)}>
                                {everyoneDone ? 'See results' : 'Wait for results'}
                            </button>
                        </div>
                        {isHost && (
                            <div className="mt-3 pt-3 border-t border-[color:var(--nav-shadow)] flex justify-between items-center">
                                <span className="text-xs" style={{ color: 'var(--muted)' }}>Host can end now</span>
                                <button className="px-3 py-1 rounded text-xs" style={{ background: 'var(--accent)', color: 'white' }} onClick={forceResultsNow}>
                                    Force results
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
            <div className="text-sm text-gray-500 mt-4">
                {current + 1} / {restaurants.length}
            </div>
        </div>
    );
    /* gömlu takkarnir, til örrygis
        <button
            //onClick={rejectedItem}
            //triggerar reject action sem lætur cardið fljúga til vinstri sem triggerar rejectedItem
            onClick={() => triggerAction('reject')}
            className="bg-red-500 hover:bg-red-600 text-white font-semibold py-2 px-4 rounded">
            Reject
        </button>
        <button
            //onClick={ignoreItem}
            //triggerar skip action sem lætur cardið fljúga upp og triggerar svo ignoreItem
            onClick={() => triggerAction('skip')}
            className="bg-gray-500 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded">
            Skip
        </button>
        <button
            //onClick={acceptedItem}
            //triggerar accept action sem lætur cardið fljúga til hægri sem triggerar acceptedItem
            onClick={() => triggerAction('accept')}
            className="bg-green-500 hover:bg-green-600 text-white font-semibold py-2 px-4 rounded">
            Accept
        </button>
    </div>
    */
}

function Card({ restaurant, isTop, stackIndex, acceptedItem, rejectedItem, ignoreItem, action, onActionConsumed }) {
    const x = useMotionValue(0);
    const y = useMotionValue(0);
    const rotate = useTransform(x, [-200, 200], [-15, 15]);
    const likeOpacity = useTransform(x, [0, 200, vw], [0, 1, 0]);
    const dislikeOpacity = useTransform(x, [-vw, -200, 0], [0, 1, 0]);

    //Þetta function lætur cardsin fljúga út úr skjánum þegar þau eru swiped
    const handleDragEnd = (_, info) => {
        //breytur sem halda uta um window width til þess að láta cards fljúga út responsively
        const target = vw + 200; //target aðeins lengra en window width þannig cardið hverfi alveg
        const duration = Math.min(0.3, 0.14 + vw / 8000); //dynamic animation duration eftir skjástærð
        //const duration = Math.max(0.18, Math.min(0.5, 0.14 + vw / 3000));
        if (info.offset.x > 120) {
            animate(x, target, {
                type: 'tween',
                ease: 'easeOut',
                duration, //nota dynamic duration
                onComplete: () => {
                    acceptedItem();
                }
            });
        } else if (info.offset.x < -120) {
            animate(x, -target, {
                type: 'tween',
                ease: 'easeOut',
                duration,
                onComplete: () => {
                    rejectedItem();
                }
            });
        //færir cardið aftur í miðjuna ef það er ekki swipað nógu langt
        } else {
            animate(x, 0, {
                type: 'tween',
                ease: 'easeOut',
                duration: 0.20,
            });
            animate(y, 0, {
                type: 'tween',
                ease: 'easeOut',
                duration: 0.20,
            });
        }
    };


    //myndir með error handling, ef hero image er ekki til, þá nota ég square image
    const [imageSrc, setImageSrc] = useState(restaurant.hero_img_url || restaurant.square_img_url);
    const handleImageError = () => {
        setImageSrc(restaurant.square_img_url);
    };

    // Triggerinn fyrir cardið næst í röðinni
    const targetScale = 1 - stackIndex * 0.02;
    const targetY = stackIndex * 10;

    //function sem lætur cardið fljúga upp þegar skip takkinn er ýttur
    const swipeSkip = () => {
        //notar vh í stað vw til þess að láta cardið fljúga lóðrétt upp
        const target = (vh + 200) * -1;
        const duration = Math.max(0.4, 0.14 + vh / 8000); //dynamic animation duration eftir skjástærð
        animate(y, target, {
            type: 'tween',
            ease: 'easeOut',
            duration,
            onComplete: () => {
                ignoreItem();
            }
        });
    };
    
    //function sem lætur cardið fljúga til hægri eða vinstri útfrá tökkunum
    const swipe = (direction) => {
        const target = (vw + 200) * (direction === 'right' ? 1 : -1); //target aðeins lengra en window width þannig cardið hverfi alveg
        const duration = Math.max(0.4, 0.14 + vw / 8000); //dynamic animation duration eftir skjástærð
        animate(x, target, {
            type: 'tween',
            ease: 'easeOut',
            duration,
            onComplete: () => {
                if (direction === 'right') acceptedItem();
                else rejectedItem();
            }
        });
    };

    //useEffect sem hlustar á action state og triggerar swipe function ef allt er rétt
    useEffect(() => {
        if (!isTop || !action) return;
        if (action.id !== restaurant.id) return;
        if (action.type === 'accept') swipe('right');
        else if (action.type === 'reject') swipe('left');
        else if (action.type === 'skip') swipeSkip();
        onActionConsumed && onActionConsumed();
    }, [action, isTop, restaurant.id]);

    return (
        <motion.div
            //animations fyrir card næst í röðinni
            style={{
                position: 'absolute',
                width: '100%',
                height: '100%',
                zIndex: isTop ? 100 : 10 - stackIndex,
            }}
            initial={false}
            animate={{ scale: targetScale, y: targetY }}
            //exit={{ opacity: 0, transition: { delay: 0.16, duration: 0.02 } }}
            transition={{ type: 'spring', stiffness: 260, damping: 22 }}
        >
            <motion.div
                //nota tailwind fyrir sum style til þess að stylea fyrir dark mode létllega
                className="bg-white dark:bg-black 
                            shadow-[0_4px_15px_rgba(0,0,0,0.1)] dark:shadow-[0_4px_5px_rgba(128,128,128,0.2)] 
                            border border-gray-300 dark:border-gray-700
                            [--drag-shadow:0_8px_25px_rgba(0,0,0,0.35)] 
                            dark:[--drag-shadow:0_8px_15px_rgba(128,128,128,0.25)]"
                    style={{
                    x,
                    y,
                    rotate,
                    width: '100%',
                    height: '100%',
                    borderRadius: '16px',
                    //backgroundColor: '#fff',
                    overflow: 'hidden',
                    //boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
                    position: 'absolute',
                    cursor: isTop ? 'grab' : 'auto',
                    scale: 1 - stackIndex * 0.02,
                    translateY: stackIndex * 10,
                    zIndex: isTop ? 100 : 10 - stackIndex,
                }}
                drag={isTop ? true : false}
                dragConstraints={false}
                dragElastic={0.2}
                dragMomentum={false}
                onDragEnd={isTop ? handleDragEnd : undefined}
                whileTap={{ cursor: isTop ? 'grabbing' : 'auto' }}
                whileDrag={{
                    scale: 1.05,
                    boxShadow: "var(--drag-shadow)"
                }}
            >
                {imageSrc ? (
                    <Image
                        src={imageSrc}
                        alt={restaurant.name || 'Restaurant'}
                        width={300}
                        height={400}
                        className="w-full h-72 object-cover"
                        draggable={false}
                        onError={handleImageError}
                    />
                ) : (
                    <div className="w-full h-72 flex items-center justify-center text-sm" style={{ background: 'var(--nav-item-hover)', color: 'var(--muted)' }}>
                        No image
                    </div>
                )}
                <div className="p-3">
                    <h3 className="text-lg font-semibold">
                        {restaurant.name}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        {restaurant.parent_city} • {restaurant.avg_rating ?? 'N/A'} ({restaurant.review_count ?? 0})
                    </p>
                </div>
        </motion.div>

        {isTop && createPortal(
            <>
            <motion.div
                style={{
                    position: 'fixed',
                    inset: 0,
                    pointerEvents: 'none',
                    zIndex: 9999,
                    opacity: likeOpacity,
                    background: 'linear-gradient(to right, rgba(34,197,94,0) 75%, rgba(34,197,94,0.45) 100%)',
                    willChange: 'opacity',
                }}
            />
            <motion.div
                style={{
                    position: 'fixed',
                    inset: 0,
                    pointerEvents: 'none',
                    zIndex: 9999,
                    opacity: dislikeOpacity,
                    background: 'linear-gradient(to left, rgba(239,68,68,0) 75%, rgba(239,68,68,0.45) 100%)',
                    willChange: 'opacity',
                }}
            />
            </>,
            document.body
        )}
        </motion.div>
    );
}