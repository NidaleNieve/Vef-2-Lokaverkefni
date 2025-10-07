'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import PreferencesPanel from '../../../components/preferences-panel';

export default function HostPage() {
  const router = useRouter();
  const search = useSearchParams();
  const spGroupId = search.get('groupId') || '';
  const [groupId, setGroupId] = useState(spGroupId || '');
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
    if (!spGroupId) {
      const last = localStorage.getItem('lastGroupId') || '';
      if (last) setGroupId(last);
    }
  }, [spGroupId]);

  useEffect(() => {
    if (!groupId) return;
    const saved = localStorage.getItem(`hostPrefs:${groupId}`);
    if (saved) {
      try {
        setHostPrefs(JSON.parse(saved));
      } catch {}
    }
  }, [groupId]);

  const handleContinue = () => {
    if (!groupId) {
      alert('Missing group id');
      return;
    }
    localStorage.setItem('lastGroupId', groupId);
    localStorage.setItem(`hostPrefs:${groupId}`, JSON.stringify(hostPrefs));
    router.push(`/game/preferences?groupId=${encodeURIComponent(groupId)}`);
  };

  return (
    <div className="max-w-xl mx-auto p-4">
      <div className="mb-4 text-sm" style={{ color: 'var(--muted)' }}>
        Group: <span className="font-mono">{groupId || '(none)'}</span>
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