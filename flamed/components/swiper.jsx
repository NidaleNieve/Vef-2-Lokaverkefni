'use client';

import { useEffect, useMemo, useState, useRef, forwardRef, useImperativeHandle } from "react"; //bætti við useRef, forwardRef, useImperativeHandle til þess að geta notað takkana sem swipe
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
export default function Swiper({ groupId, hostPreferences = {}, playerPreferences = {} }) {
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

    //læsir UI þegar verið er að swipa með tökkum
    const [uiLocked, setUiLocked] = useState(false);

    //passa að takkarnir triggeri ekki sama cardið oftar en einu sinni. Unlocka þegar næsta card er komið
    useEffect(() => {
        setUiLocked(false);
    }, [current]);

    // Listen for host publish event; on publish, auto-submit current picks and fast-forward to results
    useEffect(() => {
        if (!groupId || !sessionId) return;
        const channel = supabase
            .channel(`grp:${groupId}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'group_messages', filter: `group_id=eq.${groupId}` }, (payload) => {
                try {
                    const j = JSON.parse(payload?.new?.content || '{}');
                    if (j && j.type === 'publish_results' && j.session_id === sessionId) {
                        // Auto-submit current picks
                        (async () => {
                            try {
                                const info = {
                                    content: JSON.stringify({
                                        type: 'swipe_results', session_id: sessionId,
                                        accepted_ids: accepted, rejected_ids: rejected,
                                    })
                                };
                                await fetch(`/api/groups/${groupId}/messages`, {
                                    method: 'POST', headers: { 'content-type': 'application/json' }, credentials: 'include',
                                    body: JSON.stringify(info)
                                });
                            } catch {}
                        })();
                        // Jump to results by finishing the deck
                        setCurrent(restaurants.length);
                    }
                } catch {}
            })
            .subscribe();

        return () => {
            try { supabase.removeChannel(channel); } catch {}
        };
    }, [groupId, sessionId, accepted, rejected, restaurants.length]);

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
                    body: JSON.stringify({ player, sortBy: 'random', limit: 5 })
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

    //sýnir loading
    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-96">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-var(--accent) mb-4"></div>
                <div style={{color: 'var(--muted)'}}>Loading restaurants...</div>
            </div>
        );
    }

    //error handling, ef enginn veitingastaður fundinn
    if (restaurants.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center min-h-96 text-center p-6">
                <div className="text-4xl mb-4" style={{color: 'var(--muted)'}}>🍽️</div>
                <div style={{color: 'var(--muted)'}} className="text-lg mb-2">No restaurants found</div>
                <div style={{color: 'var(--muted)'}} className="text-sm">Try adjusting your preferences</div>
            </div>
        );
    }

    //sýnir generic error 
    if (error) {
        return (
            <div className="flex flex-col items-center justify-center min-h-96 text-center p-6">
                <div className="text-4xl mb-4" style={{color: 'var(--muted)'}}>⚠️</div>
                <div style={{color: 'var(--muted)'}} className="text-lg mb-2">Something went wrong</div>
                <div style={{color: 'var(--muted)'}} className="text-sm">{error}</div>
            </div>
        );
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
        return (
            <div className="flex flex-col items-center justify-center min-h-96">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-var(--accent) mb-4"></div>
                <div style={{color: 'var(--muted)'}}>Loading game...</div>
            </div>
        );
    }
    if (groupId && sessionId === null) {
        return (
            <div className="flex flex-col items-center justify-center min-h-96 text-center p-6">
                <div className="text-4xl mb-4" style={{color: 'var(--muted)'}}>🎮</div>
                <div style={{color: 'var(--foreground)'}} className="mb-4">
                    <p className="text-lg font-medium mb-2">No active game</p>
                    <p className="text-sm">Ask the host to start a round</p>
                </div>
                {roundError && <p style={{color: 'var(--muted)'}} className="text-sm mt-2">{roundError}</p>}
            </div>
        );
    }

    //ef að allir veitingastaðirnir eru búnir, þá sýnir results component úr results skjalinu
    if (current >= restaurants.length) {
        return (
            <Results
                restaurants={restaurants}
                acceptedIds={accepted}
                rejectedIds={rejected}
                //group id og session id
                groupId={groupId}
                sessionId={sessionId}
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

    return (
        <div className="min-h-[32rem] flex flex-col items-center justify-center px-4">

            {/* Filters summary removed for a cleaner, more game-like experience */}

            <div className="relative w-80 h-[28rem] mb-8">
                {/*Animate Presence leyfir exit animation að virka vel og hverfa*/}
                <AnimatePresence initial={false} mode="popLayout">
                    {visibleCards.map((restaurant, index) => {
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
            </div>

            <div className="flex flex-col items-center gap-6 w-full max-w-sm">
                <div className="flex items-center justify-center gap-4 w-full">
                    
                    <button 
                        onClick={() => triggerAction('reject')}
                        aria-label="Reject" 
                        className="group inline-flex items-center justify-center w-14 h-14 rounded-full shadow-lg transition-all duration-200 ease-out hover:-translate-y-1 hover:shadow-xl focus:outline-none active:scale-95 active:translate-y-0"
                        style={{
                            backgroundColor: 'var(--background)',
                            border: '2px solid var(--muted)',
                            color: 'var(--muted)'
                        }}
                    >
                        <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>

                    <button 
                        onClick={() => triggerAction('skip')}
                        aria-label="Skip"
                        className="group inline-flex items-center justify-center w-16 h-16 rounded-full shadow-lg transition-all duration-200 ease-out hover:-translate-y-1 hover:shadow-xl focus:outline-none active:scale-95 active:translate-y-0"
                        style={{
                            backgroundColor: 'var(--background)',
                            border: '2px solid var(--foreground)',
                            color: 'var(--foreground)'
                        }}
                    >
                        <svg className="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="9" />
                            <path strokeLinecap="round" d="M8 12h8" />
                        </svg>
                    </button>

                    <button 
                        onClick={() => triggerAction('accept')}
                        aria-label="Accept"
                        className="group inline-flex items-center justify-center w-14 h-14 rounded-full shadow-lg transition-all duration-200 ease-out hover:-translate-y-1 hover:shadow-xl focus:outline-none active:scale-95 active:translate-y-0"
                        style={{
                            backgroundColor: 'var(--accent)',
                            border: '2px solid var(--accent)',
                            color: 'var(--background)'
                        }}
                    >
                        <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                    </button>
                    
                </div>

                <div className="flex items-center gap-3 text-sm font-medium">
                    <span style={{color: 'var(--muted)'}}>Reject</span>
                    <span style={{color: 'var(--foreground)'}}>Skip</span>
                    <span style={{color: 'var(--accent)'}}>Accept</span>
                </div>

                <div className="text-sm mt-2" style={{color: 'var(--muted)'}}>
                    {current + 1} of {restaurants.length}
                </div>
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
                //using global CSS variables for consistent theming
                className="glass-card"
                    style={{
                    background: 'var(--background)',
                    border: '2px solid var(--muted)',
                    boxShadow: '0 8px 25px var(--nav-shadow)',
                    '--drag-shadow': '0 15px 35px var(--nav-shadow)',
                    x,
                    y,
                    rotate,
                    width: '100%',
                    height: '100%',
                    borderRadius: '20px',
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
                <div className="relative w-full h-64 overflow-hidden">
                    <Image
                        src={imageSrc}
                        alt={restaurant.name}
                        fill
                        className="object-cover"
                        draggable={false}
                        onError={handleImageError}
                    />
                </div>
                <div className="p-4">
                    <h3 className="text-xl font-bold mb-2" style={{color: 'var(--foreground)'}}>
                        {restaurant.name}
                    </h3>
                    <div className="flex items-center justify-between text-sm">
                        <span style={{color: 'var(--muted)'}}>
                            {restaurant.parent_city}
                        </span>
                        <div className="flex items-center gap-1" style={{color: 'var(--muted)'}}>
                            <span>⭐</span>
                            <span>{restaurant.avg_rating ?? 'N/A'}</span>
                            <span>({restaurant.review_count ?? 0})</span>
                        </div>
                    </div>
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
                    background: 'linear-gradient(to right, rgba(34,197,94,0) 75%, rgba(34,197,94,0.45) 100%)', // Green for like
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
                    background: 'linear-gradient(to left, rgba(239,68,68,0) 75%, rgba(239,68,68,0.45) 100%)', // Red for dislike
                    willChange: 'opacity',
                }}
            />
            </>,
            document.body
        )}
        </motion.div>
    );
}