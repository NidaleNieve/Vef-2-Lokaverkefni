'use client';

import { useEffect, useMemo, useState, useRef, forwardRef, useImperativeHandle } from "react"; //bætti við useRef, forwardRef, useImperativeHandle til þess að geta notað takkana sem swipe
import { supabase } from "../../lib/supabaseClient";
import Results from "../components/Result";
import Navbar from '../components/Navbar';

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
export default function Swiper() {
    //bý til breytur sem halda utan um veitingastaðina og hvað er valið
    const [restaurants, setRestaurants] = useState([]); // restaurants state
    const [loading, setLoading] = useState(true);//breyta til þess að geta byrt loading
    const [error, setError] = useState(null); //error state, segir sig sjálft

    const [current, setCurrent] = useState(0); //current staðurinn, geymir listann, byrjar á 0
    const [accepted, setAccepted] = useState([]); //array sem geymir veitingastaðin sem eru samþykktir
    const [rejected, setRejected] = useState([]);
    const [action, setAction] = useState(null); //action state til þess að geta triggerað swipe með tökkum

    //function sem fetchar veitingastaðina frá supabase og byrtir loading screen
    useEffect(() => {
        const load = async () => {
            const { data, error } = await supabase
                .from('restaurants')
                .select(`
                    id,
                    name,
                    parent_city,
                    avg_rating,
                    cuisines,
                    price_tag,
                    review_count,
                    hero_img_url,
                    square_img_url    
                `)
                .limit(10); //temp limit

            if (error) {
                setError(error.message);
                setRestaurants([]);
            } else {
                setRestaurants(data || []);
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

    //ef að allir veitingastaðirnir eru búnir, þá sýnir results component úr results skjalinu
    if (current >= restaurants.length) {
        return (
            <Results
                restaurants={restaurants}
                acceptedIds={accepted}
                rejectedIds={rejected}
            />
        );
    }

    const visibleCards = restaurants.slice(current, current + 3);

    //top level function sem triggerar action útfrá tökkum á rétta cardið
    const triggerAction = (type) => {
        const top = restaurants[current];
        if (!top) return;
        setAction({ type, id: top.id });
    };

    return (
        <div className="min-h-[28rem] flex flex-col items-center justify-center p-4">
            {/* navbar at the top */}
            <Navbar />

            {/* add a margin to put the vards lower */}
            <div className="relative w-72 h-96 max-w-full mt-15">
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
            <div className="text-sm text-gray-500 dark:text-gray-400 mt-4">
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
                //UPDATED: Enhanced box border styling for better visual appearance
                className="bg-white dark:bg-gray-900 
                            shadow-[0_4px_20px_rgba(168,85,138,0.15)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.4)] 
                            border-2 border-pink-300 dark:border-gray-600
                            [--drag-shadow:0_12px_35px_rgba(168,85,138,0.25)] 
                            dark:[--drag-shadow:0_12px_35px_rgba(0,0,0,0.6)]
                            relative
                            before:absolute before:inset-0 before:rounded-[14px] before:border before:border-white/50 dark:before:border-gray-400/30 before:pointer-events-none"
                    style={{
                    x,
                    y,
                    rotate,
                    width: '100%',
                    height: '100%',
                    borderRadius: '16px',
                    overflow: 'hidden',
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
                {/* Inner container for additional border effect */}
                <div className="absolute inset-0 rounded-[14px] border border-white/40 dark:border-gray-500/30 pointer-events-none z-10" />
                
                <Image
                    src={imageSrc}
                    alt={restaurant.name}
                    width={300}
                    height={400}
                    className="w-full h-72 object-cover relative z-0"
                    draggable={false}
                    onError={handleImageError}
                />
                <div className="p-4 bg-white dark:bg-gray-900 relative z-0 border-t border-pink-100 dark:border-gray-700">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">
                        {restaurant.name}
                    </h3>
                    <p className="text-sm text-gray-700 dark:text-gray-400 mb-1">
                        {restaurant.parent_city}
                    </p>
                    <div className="flex justify-between items-center text-sm text-gray-700 dark:text-gray-400">
                        <span>⭐ {restaurant.avg_rating ?? 'N/A'}</span>
                        <span>({restaurant.review_count ?? 0} reviews)</span>
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