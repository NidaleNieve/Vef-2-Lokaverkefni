'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import PreferencesPanel from '../../../components/preferences-panel';

export default function HostPage() {
  const router = useRouter();
  // New flow: host picks prefs first, group is chosen in share step
  const [groupId, setGroupId] = useState('');
  const [hostPrefs, setHostPrefs] = useState({
    requireKidFriendly: false,
    maxRadius: '',
    blockedCategories: [],
  });
  const [playerPrefs] = useState({
    radius: '',
    rating: '',
    price: '',
    kidFriendly: false,
    allergies: '',
    categories: [],
  });

  useEffect(() => {
    const last = localStorage.getItem('lastGroupId') || '';
    if (last) setGroupId(last);
  }, []);

  useEffect(() => {
    // Load any pending host prefs saved earlier (before choosing group)
    const savedPending = localStorage.getItem('hostPrefs:pending');
    if (savedPending) {
      try { setHostPrefs(JSON.parse(savedPending)); } catch {}
    }
    if (groupId) {
      const saved = localStorage.getItem(`hostPrefs:${groupId}`);
      if (saved) { try { setHostPrefs(JSON.parse(saved)); } catch {} }
    }
  }, [groupId]);

  const handleContinue = () => {
    // Save prefs for the upcoming share step; group will be selected there
    localStorage.setItem('hostPrefs:pending', JSON.stringify(hostPrefs));
    router.push('/game/host/share');
  };

  return (
    <div className="max-w-2xl mx-auto p-6 animate-fade-in">
      {/* Page Header */}
      <div className="mb-6 text-center animate-fade-in-up">
        <h1 className="text-2xl font-bold mb-2" style={{ color: 'var(--foreground)' }}>
          Host Game Setup
        </h1>
        <p className="text-sm px-4 py-2 rounded-full inline-block" style={{ 
          color: 'var(--muted)',
          backgroundColor: 'var(--nav-item-hover)'
        }}>
          Step 1 of 3: Optionally block categories for your group
        </p>
      </div>

      {/* Preferences Panel Container */}
      <div className="animate-fade-in-up-delayed">
        <PreferencesPanel
          hostPrefs={hostPrefs}
          setHostPrefs={setHostPrefs}
          playerPrefs={playerPrefs}
          setPlayerPrefs={() => {}}
          isHost={true}
          mode="host"
        />
      </div>

      {/* Action Button */}
      <div className="mt-8 flex justify-end animate-fade-in-up-delayed">
        <button
          type="button"
          onClick={handleContinue}
          className="group relative px-8 py-3 rounded-xl font-semibold text-base transition-all duration-300 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 active:scale-95 overflow-hidden"
          style={{ 
            backgroundColor: 'var(--accent)', 
            color: 'var(--nav-text)',
            boxShadow: '0 4px 14px 0 rgba(170, 96, 200, 0.3)',
            '--tw-ring-color': 'var(--accent)',
            '--tw-ring-offset-color': 'var(--background)'
          }}
          onMouseEnter={(e) => {
            e.target.style.boxShadow = '0 8px 25px 0 rgba(170, 96, 200, 0.4)';
          }}
          onMouseLeave={(e) => {
            e.target.style.boxShadow = '0 4px 14px 0 rgba(170, 96, 200, 0.3)';
          }}
        >
          {/* Subtle gradient overlay for depth */}
          <div 
            className="absolute inset-0 opacity-0 group-hover:opacity-20 transition-opacity duration-300 rounded-xl"
            style={{ 
              background: 'linear-gradient(135deg, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0) 50%, rgba(0,0,0,0.1) 100%)'
            }}
          />
          <span className="relative z-10 flex items-center gap-2">
            Continue to Group Selection
            <svg 
              className="w-5 h-5 transition-transform duration-200 group-hover:translate-x-1" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </span>
        </button>
      </div>

      {/* Progress Indicator */}
      <div className="mt-6 flex justify-center animate-fade-in-up-delayed">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: 'var(--accent)' }}></div>
          <div className="w-8 h-1 rounded-full" style={{ backgroundColor: 'var(--nav-shadow)' }}></div>
          <div className="w-3 h-3 rounded-full border-2" style={{ borderColor: 'var(--nav-shadow)' }}></div>
          <div className="w-8 h-1 rounded-full" style={{ backgroundColor: 'var(--nav-shadow)' }}></div>
          <div className="w-3 h-3 rounded-full border-2" style={{ borderColor: 'var(--nav-shadow)' }}></div>
        </div>
      </div>
    </div>
  );
}