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
    const [expandedCard, setExpandedCard] = useState(null); // Track which card is expanded

    //passa að takkarnir triggeri ekki sama cardið oftar en einu sinni. Unlocka þegar næsta card er komið
    useEffect(() => {
        setUiLocked(false);
    }, [current]);

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

    //function sem fetchar veitingastaðina frá supabase og byrtir loading screen
    useEffect(() => {
        const load = async () => {
            // Mock data for development
            const mockData = [
                {
                    id: '1',
                    name: 'Pizza Palace',
                    parent_city: 'Reykjavík',
                    avg_rating: 4.2,
                    cuisines: ['Italian', 'Pizza'],
                    price_tag: '$$',
                    review_count: 124,
                    hero_img_url: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=400&h=300&fit=crop',
                    square_img_url: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=300&h=300&fit=crop',
                    images: [
                        'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=400&h=300&fit=crop',
                        'https://images.unsplash.com/photo-1571407970349-bc81e7e96d47?w=400&h=300&fit=crop',
                        'https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=400&h=300&fit=crop'
                    ],
                    has_menu: true,
                    menu_url: 'https://example.com/menu',
                    status: 'open',
                    review_snippets: [
                        { text: "Amazing pizza with fresh ingredients!", rating: 5 },
                        { text: "Great atmosphere and friendly staff", rating: 4 },
                        { text: "Best pizza in town", rating: 5 }
                    ]
                },
                {
                    id: '2',
                    name: 'Sushi Zen',
                    parent_city: 'Reykjavík',
                    avg_rating: 4.7,
                    cuisines: ['Japanese', 'Sushi'],
                    price_tag: '$$$',
                    review_count: 89,
                    hero_img_url: 'https://images.unsplash.com/photo-1553621042-f6e147245754?w=400&h=300&fit=crop',
                    square_img_url: 'https://images.unsplash.com/photo-1553621042-f6e147245754?w=300&h=300&fit=crop',
                    images: [
                        'https://images.unsplash.com/photo-1553621042-f6e147245754?w=400&h=300&fit=crop',
                        'https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?w=400&h=300&fit=crop',
                        'https://images.unsplash.com/photo-1611143669185-af224c5e3252?w=400&h=300&fit=crop'
                    ],
                    has_menu: true,
                    menu_url: 'https://example.com/sushi-menu',
                    status: 'open',
                    review_snippets: [
                        { text: "Fresh fish and excellent presentation", rating: 5 },
                        { text: "Authentic Japanese experience", rating: 5 },
                        { text: "A bit pricey but worth it", rating: 4 }
                    ]
                },
                {
                    id: '3',
                    name: 'Burger Barn',
                    parent_city: 'Akureyri',
                    avg_rating: 3.9,
                    cuisines: ['American', 'Burgers'],
                    price_tag: '$',
                    review_count: 201,
                    hero_img_url: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&h=300&fit=crop',
                    square_img_url: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=300&h=300&fit=crop',
                    images: [
                        'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&h=300&fit=crop',
                        'https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=400&h=300&fit=crop',
                        'https://images.unsplash.com/photo-1594212699903-ec8a3eca50f5?w=400&h=300&fit=crop'
                    ],
                    has_menu: false,
                    menu_url: null,
                    status: 'open',
                    review_snippets: [
                        { text: "Good burgers for the price", rating: 4 },
                        { text: "Fast service, decent food", rating: 3 },
                        { text: "Great value for money", rating: 4 }
                    ]
                }
            ];

            try {
                // Simulate network delay
                await new Promise(resolve => setTimeout(resolve, 1000));
                setRestaurants(mockData);
            } catch (error) {
                setError(error.message);
                setRestaurants([]);
            }
            setLoading(false);
        };
        load();
    }, []);

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
        if (uiLocked || expandedCard) return; //Þetta er lásinn fyrir takkana og ekki má swipa ef card er expanded
        const top = restaurants[current];
        if (!top) return;
        setUiLocked(true); //Locka cardið þegar það er verið að swipa
        setAction({ type, id: top.id });
    };

    return (
        <div className="min-h-[28rem] flex flex-col items-center justify-center">

            {/* Preference Summaries */}
            {(hostSummary.length > 0 || playerSummary.length > 0) && (
                <div className="mb-6 w-full max-w-sm rounded-lg border border-gray-200 bg-white/80 p-3 text-xs text-gray-600 shadow-sm dark:border-gray-700 dark:bg-black/70 dark:text-gray-300">
                {hostSummary.length > 0 && (
                    <div className="mb-3">
                    <p className="font-semibold text-gray-700 dark:text-gray-200">Host constraints</p>
                    <ul className="mt-1 list-disc space-y-1 pl-4">
                        {hostSummary.map((item, idx) => (
                        <li key={`host-${idx}`}>{item}</li>
                        ))}
                    </ul>
                    </div>
                )}
                <div>
                    <p className="font-semibold text-gray-700 dark:text-gray-200">Your preferences</p>
                    {playerSummary.length > 0 ? (
                    <ul className="mt-1 list-disc space-y-1 pl-4">
                        {playerSummary.map((item, idx) => (
                        <li key={`player-${idx}`}>{item}</li>
                        ))}
                    </ul>
                    ) : (
                    <p className="mt-1 text-gray-500 dark:text-gray-400">Using default settings.</p>
                    )}
                </div>
                <p className="mt-3 text-[10px] uppercase tracking-wide text-gray-400 dark:text-gray-500">
                    Filters will activate once the Supabase RPC endpoint is wired up.
                </p>
                </div>
            )}

            <div className="relative w-72 h-96">
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
                            isExpanded={expandedCard === restaurant.id}
                            onToggleExpanded={(expanded) => setExpandedCard(expanded ? restaurant.id : null)}
                        />
                        );
                    })}
                </AnimatePresence>
            </div>

            <div className="mt-8 pt-2 px-2 sm:px-0 flex items-center gap-3">
                
                <button onClick={() => triggerAction('reject')}
                    aria-label="Reject" 
                    disabled={expandedCard !== null}
                    className={`group inline-flex items-center gap-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white/90 dark:bg-black/80 px-3 md:px-4 py-2 font-medium shadow-sm transition-all duration-150 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-black active:scale-95 active:-translate-y-0.5 active:shadow-inner ${expandedCard ? 'text-gray-400 dark:text-gray-600 cursor-not-allowed' : 'text-red-600 dark:text-red-400 hover:-translate-y-0.5 hover:shadow-md hover:border-red-300 dark:hover:border-red-700 hover:bg-red-50/60 dark:hover:bg-red-950/20 focus-visible:ring-red-400/60'}`}>
                    
                    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    <span className="hidden md:inline">Reject</span>
                </button>

                <button onClick={() => triggerAction('skip')}
                    aria-label="Skip"
                    disabled={expandedCard !== null}
                    className={`group inline-flex items-center gap-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white/90 dark:bg-black/80 px-3 md:px-4 py-2 font-medium shadow-sm transition-all duration-150 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-black active:scale-98 active:-translate-y-0.5 active:shadow-inner ${expandedCard ? 'text-gray-400 dark:text-gray-600 cursor-not-allowed' : 'text-gray-700 dark:text-gray-300 hover:-translate-y-0.5 hover:shadow-md hover:border-gray-400 dark:hover:border-gray-600 hover:bg-gray-50/60 dark:hover:bg-white/5 focus-visible:ring-slate-400/60'}`}>
                    
                    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="9" />
                        <path strokeLinecap="round" d="M8 12h8" />
                    </svg>
                    <span className="hidden md:inline">Skip</span>
                </button>

                <button onClick={() => triggerAction('accept')}
                    aria-label="Accept"
                    disabled={expandedCard !== null}
                    className={`group inline-flex items-center gap-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white/90 dark:bg-black/80 px-3 md:px-4 py-2 font-medium shadow-sm transition-all duration-150 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-black active:scale-98 active:-translate-y-0.5 active:shadow-inner ${expandedCard ? 'text-gray-400 dark:text-gray-600 cursor-not-allowed' : 'text-green-600 dark:text-green-400 hover:-translate-y-0.5 hover:shadow-md hover:border-green-300 dark:hover:border-green-700 hover:bg-green-50/60 dark:hover:bg-green-950/20 focus-visible:ring-green-400/60'}`}>
                    
                    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="hidden md:inline">Accept</span>
                </button>
                
            </div>
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

function Card({ restaurant, isTop, stackIndex, acceptedItem, rejectedItem, ignoreItem, action, onActionConsumed, isExpanded, onToggleExpanded }) {
    const x = useMotionValue(0);
    const y = useMotionValue(0);
    const rotate = useTransform(x, [-200, 200], [-15, 15]);
    const likeOpacity = useTransform(x, [0, 200, vw], [0, 1, 0]);
    const dislikeOpacity = useTransform(x, [-vw, -200, 0], [0, 1, 0]);

    // Image navigation state
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const images = restaurant.images || [restaurant.hero_img_url || restaurant.square_img_url];

    const nextImage = () => {
        setCurrentImageIndex((prev) => (prev + 1) % images.length);
    };

    const prevImage = () => {
        setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
    };

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
    const [imageSrc, setImageSrc] = useState(images[currentImageIndex]);
    const handleImageError = () => {
        if (restaurant.square_img_url && imageSrc !== restaurant.square_img_url) {
            setImageSrc(restaurant.square_img_url);
        }
    };

    // Update image source when currentImageIndex changes
    useEffect(() => {
        setImageSrc(images[currentImageIndex]);
    }, [currentImageIndex, images]);

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
                    height: isExpanded ? 'auto' : '100%',
                    minHeight: isExpanded ? '500px' : '100%',
                    borderRadius: '16px',
                    //backgroundColor: '#fff',
                    overflow: 'hidden',
                    //boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
                    position: 'absolute',
                    cursor: isTop && !isExpanded ? 'grab' : 'auto',
                    scale: 1 - stackIndex * 0.02,
                    translateY: stackIndex * 10,
                    zIndex: isTop ? 100 : 10 - stackIndex,
                }}
                animate={isExpanded ? { scale: 1.05, y: -20 } : { scale: 1 - stackIndex * 0.02, y: stackIndex * 10 }}
                transition={{ type: 'spring', stiffness: 260, damping: 22 }}
                drag={isTop && !isExpanded ? true : false}
                dragConstraints={false}
                dragElastic={0.2}
                dragMomentum={false}
                onDragEnd={isTop && !isExpanded ? handleDragEnd : undefined}
                whileTap={{ cursor: isTop && !isExpanded ? 'grabbing' : 'auto' }}
                whileDrag={isTop && !isExpanded ? {
                    scale: 1.05,
                    boxShadow: "var(--drag-shadow)"
                } : {}}
            >
                {/* Image container with navigation */}
                <div className="relative w-full h-72">
                    <Image
                        src={imageSrc}
                        alt={restaurant.name}
                        width={300}
                        height={400}
                        className="w-full h-full object-cover"
                        draggable={false}
                        onError={handleImageError}
                    />
                    
                    {/* Image navigation buttons */}
                    {images.length > 1 && (
                        <>
                            <button
                                onClick={prevImage}
                                className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 transition-all"
                                disabled={!isTop}
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                </svg>
                            </button>
                            <button
                                onClick={nextImage}
                                className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 transition-all"
                                disabled={!isTop}
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                            </button>
                            
                            {/* Image indicators */}
                            <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex space-x-1">
                                {images.map((_, index) => (
                                    <div
                                        key={index}
                                        className={`w-2 h-2 rounded-full ${
                                            index === currentImageIndex ? 'bg-white' : 'bg-white/50'
                                        }`}
                                    />
                                ))}
                            </div>
                        </>
                    )}

                    {/* Expand button */}
                    {isTop && (
                        <button
                            onClick={() => onToggleExpanded(!isExpanded)}
                            className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 transition-all"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                {isExpanded ? (
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                                ) : (
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                )}
                            </svg>
                        </button>
                    )}
                </div>

                {/* Card content */}
                <div className={`p-3 ${isExpanded ? 'h-auto' : ''}`}>
                    <h3 className="text-lg font-semibold">
                        {restaurant.name}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        {restaurant.parent_city} • {restaurant.avg_rating ?? 'N/A'} ({restaurant.review_count ?? 0})
                    </p>
                    
                    {/* Cuisines */}
                    {restaurant.cuisines && restaurant.cuisines.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                            {restaurant.cuisines.map((cuisine, index) => (
                                <span
                                    key={index}
                                    className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-2 py-1 rounded-full"
                                >
                                    {cuisine}
                                </span>
                            ))}
                        </div>
                    )}
                    
                    {/* Price tag */}
                    {restaurant.price_tag && (
                        <p className="text-sm font-medium text-green-600 dark:text-green-400 mt-1">
                            {restaurant.price_tag}
                        </p>
                    )}

                    {/* Expanded content */}
                    {isExpanded && (
                        <div className="mt-4 space-y-3 animate-in slide-in-from-top-2 duration-200">
                            {/* Status */}
                            {restaurant.status && (
                                <div>
                                    <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200">Status</h4>
                                    <p className="text-sm text-gray-600 dark:text-gray-400 capitalize">{restaurant.status}</p>
                                </div>
                            )}

                            {/* Menu availability */}
                            <div>
                                <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200">Menu</h4>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                    {restaurant.has_menu ? (
                                        restaurant.menu_url ? (
                                            <a href={restaurant.menu_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                                                View Menu
                                            </a>
                                        ) : (
                                            "Menu available"
                                        )
                                    ) : (
                                        "No menu available"
                                    )}
                                </p>
                            </div>

                            {/* Reviews */}
                            {restaurant.review_snippets && restaurant.review_snippets.length > 0 && (
                                <div>
                                    <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200">Recent Reviews</h4>
                                    <div className="space-y-2 max-h-32 overflow-y-auto">
                                        {restaurant.review_snippets.slice(0, 3).map((review, index) => (
                                            <div key={index} className="text-xs bg-gray-50 dark:bg-gray-800 p-2 rounded">
                                                <div className="flex items-center gap-1 mb-1">
                                                    {[...Array(5)].map((_, starIndex) => (
                                                        <span key={starIndex} className={`text-xs ${starIndex < review.rating ? 'text-yellow-400' : 'text-gray-300'}`}>
                                                            ★
                                                        </span>
                                                    ))}
                                                </div>
                                                <p className="text-gray-700 dark:text-gray-300">{review.text}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
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