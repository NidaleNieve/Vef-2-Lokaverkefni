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
    <div className="max-w-xl mx-auto p-4">
      <div className="mb-4 text-sm" style={{ color: 'var(--muted)' }}>
        You will pick a group on the next step.
      </div>

      <PreferencesPanel
        hostPrefs={hostPrefs}
        setHostPrefs={setHostPrefs}
        playerPrefs={playerPrefs}
        setPlayerPrefs={() => {}}
        isHost={true}
        mode="host"
      />

      <div className="mt-4 flex justify-end">
        <button
          type="button"
          onClick={handleContinue}
          className="px-4 py-2 rounded-lg font-semibold"
          style={{ backgroundColor: 'var(--accent)', color: 'var(--nav-text)' }}
        >
          Continue
        </button>
      </div>
    </div>
  );
}