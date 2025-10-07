'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import PreferencesPanel from '../../../components/preferences-panel';

export default function PreferencesPage() {
  const search = useSearchParams();
  const spGroupId = search.get('groupId') || '';
  const [groupId, setGroupId] = useState(spGroupId || '');

  const [hostPrefs, setHostPrefs] = useState({
    requireKidFriendly: false,
    maxRadius: '',
    blockedCategories: [],
  });

  const [playerPrefs, setPlayerPrefs] = useState({
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
    const savedHost = localStorage.getItem(`hostPrefs:${groupId}`);
    if (savedHost) {
      try {
        setHostPrefs(JSON.parse(savedHost));
      } catch {}
    }
    const savedPlayer = localStorage.getItem(`playerPrefs:${groupId}`);
    if (savedPlayer) {
      try {
        setPlayerPrefs(JSON.parse(savedPlayer));
      } catch {}
    }
    // Best-effort: fetch latest host preferences from group chat
    (async () => {
      try {
        const res = await fetch(`/api/groups/${groupId}/messages`, { credentials: 'include' })
        const j = await res.json().catch(() => ({}))
        if (res.ok && Array.isArray(j?.items)) {
          for (const m of j.items) {
            try {
              const c = JSON.parse(m.content || '{}')
              if (c && c.type === 'host_prefs' && c.prefs) {
                setHostPrefs(prev => ({
                  ...prev,
                  requireKidFriendly: !!c.prefs.requireKidFriendly,
                  maxRadius: c.prefs.maxRadius ?? '',
                  blockedCategories: Array.isArray(c.prefs.blockedCategories) ? c.prefs.blockedCategories : [],
                }))
                break
              }
            } catch {}
          }
        }
      } catch {}
    })()
  }, [groupId]);

  const handleSave = () => {
    if (!groupId) {
      alert('Missing group id');
      return;
    }
    // Auto-select all subcategories for any expanded groups without choices
    // Note: the panel maintains categories; we simply ensure non-empty by leaving it as-is if user hasn't interacted.
    localStorage.setItem('lastGroupId', groupId);
    localStorage.setItem(`playerPrefs:${groupId}`, JSON.stringify(playerPrefs));
    alert('Preferences saved. Swiping flow will be wired later.');
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
        setPlayerPrefs={setPlayerPrefs}
        isHost={false}
        mode="personal"
      />

      <div className="mt-4 flex justify-end">
        <button
          type="button"
          onClick={handleSave}
          className="px-4 py-2 rounded-lg font-semibold"
          style={{ backgroundColor: 'var(--accent)', color: 'var(--nav-text)' }}
        >
          Save
        </button>
      </div>
    </div>
  );
}