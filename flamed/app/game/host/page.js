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
    <div className="max-w-2xl mx-auto p-4 space-y-4">
      <div className="rounded-2xl p-5 shadow-sm border animate-fade-in" style={{ background: 'linear-gradient(135deg, var(--nav-bg) 0%, var(--nav-item-bg) 100%)', borderColor: 'var(--nav-shadow)' }}>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--nav-text)' }}>Host setup</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>Pick constraints for this round. You’ll choose a group next.</p>
      </div>

      <div className="rounded-2xl p-4 shadow-sm border" style={{ background: 'var(--nav-item-bg)', borderColor: 'var(--nav-shadow)' }}>
      <PreferencesPanel
        hostPrefs={hostPrefs}
        setHostPrefs={setHostPrefs}
        playerPrefs={playerPrefs}
        setPlayerPrefs={() => {}}
        isHost={true}
        mode="host"
      />
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleContinue}
          className="px-5 py-3 rounded-xl font-semibold shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5"
          style={{ background: 'var(--accent)', color: 'white' }}
        >
          Continue
        </button>
      </div>
    </div>
  );
}