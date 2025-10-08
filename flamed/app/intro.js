'use client';
import { useState, useEffect } from 'react';
import { Plus, Sparkles, Users, Utensils } from 'lucide-react';
import DarkModeToggle from '../components/DarkModeToggle';
import { useRouter } from 'next/navigation';

export default function Intro() {
  const router = useRouter();
  const [generatedCode, setGeneratedCode] = useState(null);
  const [isClicked, setIsClicked] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [codeInput, setCodeInput] = useState('');
  const [showFoodIcons, setShowFoodIcons] = useState(false);

  // Added from home-client.jsx logic (state)
  const [groupId, setGroupId] = useState('');
  const [isHost, setIsHost] = useState(false);
  const [readyToSwipe, setReadyToSwipe] = useState(false);

  // animated food icons that float around
  const FoodIcon = ({ icon: Icon, style }) => (
    <div 
      className="absolute animate-float" 
      style={style}
    >
      <Icon size={24} style={{ color: 'var(--accent)' }} />
    </div>
  );
  useEffect(() => {
    // Show floating food icons after initial load
    const timer = setTimeout(() => {
      setShowFoodIcons(true);
    }, 1000);
    
    return () => clearTimeout(timer);
  }, []);

  /* Þurfum það ekki lengur útaf nýju invite codes
  //sækir groupId úr local storage, qol feature
  useEffect(() => {
    const last = localStorage.getItem('lastGroupId') || '';
    if (last) {
      setCodeInput(last);
      setGroupId(last);
      setIsHost(false);
      setReadyToSwipe(false);
    }
  }, []);
  */

  //geymir groupId í localstorage þegar það breytist
  useEffect(() => {
    if (groupId) localStorage.setItem('lastGroupId', groupId);
  }, [groupId]);

  //join logic: use invite code -> redeem -> navigate to preferences for resulting group
  const joinGroup = async () => {
    const code = codeInput.trim();
    if (!code) {
      alert('Enter an invite code to join');
      return;
    }
    try {
      const res = await fetch('/api/groups/redeem', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ code })
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j?.error || `Failed to redeem (${res.status})`);
      const gid = j?.group_id;
      if (!gid) throw new Error('Invalid response from server');
      setGroupId(gid);
      setIsHost(false);
      setReadyToSwipe(false);
      localStorage.setItem('lastGroupId', gid);
      router.push(`/game/preferences?groupId=${encodeURIComponent(gid)}`);
    } catch (err) {
      alert(err?.message || 'Failed to join group');
    }
  };

  //Þetta function býr til nýjan leik útfrá groupId sem er sett inn. Keyrir þegar create game takkinn er ýttur
  async function startRound() {
    // New flow: don't require group yet. Go pick host preferences first.
    setIsHost(true);
    setReadyToSwipe(false);
    router.push('/game/host');
  }

  const handleCircleClick = () => {
    setIsClicked(true);
    setTimeout(() => setIsClicked(false), 500);

    startRound();
  };

  const handleCodeSubmit = async (e) => {
    e.preventDefault();
    await joinGroup();
  };

  return (
    <div className="min-h-screen flex flex-col items-center p-4 relative overflow-x-hidden" style={{ background: 'var(--background)', color: 'var(--foreground)' }}>
      {/* Animated background elements */}
      {showFoodIcons && (
        <>
          <FoodIcon icon={Utensils} style={{ top: '15%', left: '10%', animationDelay: '0s', animationDuration: '15s' }} />
          <FoodIcon icon={Sparkles} style={{ top: '25%', right: '15%', animationDelay: '1s', animationDuration: '12s' }} />
          <FoodIcon icon={Users} style={{ bottom: '20%', left: '20%', animationDelay: '2s', animationDuration: '18s' }} />
          <FoodIcon icon={Sparkles} style={{ bottom: '30%', right: '10%', animationDelay: '1.5s', animationDuration: '14s' }} />
        </>
      )}
     
      {/* Welcome Message */}
      <div className="text-center mb-6 mt-8 animate-fade-in-up">
        <h1 className="text-4xl font-bold mb-3" style={{ color: 'var(--foreground)' }}>
          Welcome to <span className="animate-color-shift" style={{ color: 'var(--accent)' }}>GastroSwipe!</span>
        </h1>
        <p className="text-lg max-w-md" style={{ color: 'var(--muted)' }}>
          Click the circle to generate a code or enter an existing code to join.
        </p>
      </div>

      {/* Main Content */}
      <div className="flex flex-col items-center justify-center flex-grow space-y-6">
        
        {/* Clickable Circle with enhanced animation */}
        <div className="relative flex items-center justify-center">
          {/* Arrow pointing at circle with bounce animation */}
          <div className="absolute right-full mr-2 flex items-center animate-bounce-side">
            <div className="text-lg font-bold whitespace-nowrap" style={{ color: 'var(--muted)' }}>
              Click me!
            </div>
            <svg 
              className={`w-8 h-8 transition-transform duration-300 ease-out transform-gpu will-change-transform ${isHovered ? 'scale-110' : ''}`} 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
              style={{ color: 'var(--foreground)' }}
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </div>
          
          {/* Pulsing circle behind main circle */}
          <div 
            className={`absolute inset-0 rounded-full opacity-20 will-change-[opacity,transform] ${
              isHovered ? 'animate-ping' : ''
            }`}
            style={{ backgroundColor: 'var(--accent)' }}
          ></div>
          
          {/* Clickable Circle with enhanced animations */}
          <div
            className={`group relative flex items-center justify-center w-50 h-50 md:w-66 md:h-66 rounded-full cursor-pointer shadow-lg transition-transform duration-300 ease-out transform-gpu will-change-transform hover:scale-105 active:scale-95 ${
              isClicked ? 'animate-pulse-shrink' : ''
            }`}
            style={{
              backgroundColor: 'var(--accent)',
              color: 'var(--nav-text)'
            }}
            onClick={handleCircleClick}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
          >
            <Plus size={120} className="transition-transform duration-300 ease-out transform-gpu will-change-transform group-hover:rotate-90" />
            
            {/* Sparkle effects on hover */}
            {isHovered && (
              <>
                <div className="absolute top-2 right-2 animate-sparkle-1">
                  <Sparkles size={16} fill="currentColor" />
                </div>
                <div className="absolute bottom-2 left-2 animate-sparkle-2">
                  <Sparkles size={16} fill="currentColor" />
                </div>
              </>
            )}
          </div>
        </div>

        {/* Code Input Form with animation */}
        <form onSubmit={handleCodeSubmit} className="w-full max-w-md animate-fade-in-up-delayed">
          <div className="flex gap-3">
            <input
              type="text"
              value={codeInput}
              onChange={(e) => setCodeInput(e.target.value)}
              placeholder="ENTER EXISTING CODE"
              className="flex-1 px-4 py-3 border-2 rounded-xl font-mono font-semibold text-center focus:outline-none transition-colors duration-200"
              style={{
                borderColor: 'var(--accent)',
                backgroundColor: 'var(--background)',
                color: 'var(--foreground)'
              }}
            />
            <button 
              type="submit"
              className="px-6 py-3 rounded-xl font-semibold transition-transform duration-300 ease-out transform-gpu will-change-transform hover:scale-105 active:scale-95"
              style={{
                backgroundColor: 'var(--accent)',
                color: 'var(--nav-text)'
              }}
            >
              JOIN
            </button>
          </div>
        </form>
      </div>

      <footer className="mt-8 text-center text-sm animate-fade-in" style={{ color: 'var(--muted)' }}>
        <p>Daníel Snær Rodríguez, Hörður Pálsson, Kiara Mindy Biscarra Quiamco</p>
      </footer>

    </div>
  );
}