"use client";

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function HostSharePage() {
  const router = useRouter();
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [newGroupName, setNewGroupName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [hostPrefs, setHostPrefs] = useState(null);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    // Load pending prefs saved by host page
    const saved = localStorage.getItem('hostPrefs:pending');
    if (saved) {
      try { setHostPrefs(JSON.parse(saved)); } catch {}
    }
  }, []);

  async function loadGroups() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/groups', { credentials: 'include' });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j?.error || `Failed to load groups (${res.status})`);
      const arr = Array.isArray(j?.data) ? j.data : [];
      setGroups(arr);
      if (!selectedGroupId && arr.length) setSelectedGroupId(arr[0].id);
    } catch (e) {
      setError(e?.message || 'Failed to load groups');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadGroups(); }, []);

  async function createGroup() {
    const name = newGroupName.trim();
    if (name.length < 2) { alert('Group name must be at least 2 characters'); return; }
    const res = await fetch('/api/groups', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ name })
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) { alert(j?.error || `Failed to create group (${res.status})`); return; }
    const id = j?.data?.id;
    if (id) {
      setSelectedGroupId(id);
      localStorage.setItem('lastGroupId', id);
      await loadGroups();
    }
  }

  async function createInvite() {
    if (!selectedGroupId) { alert('Pick a group first'); return; }
    const res = await fetch(`/api/groups/${selectedGroupId}/invites`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ max_uses: 10 })
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) { alert(j?.error || `Failed to create invite (${res.status})`); return; }
    setInviteCode(j?.code || '');
  }

  async function startRoundAndAnnounce() {
    if (!selectedGroupId) { alert('Pick a group first'); return; }
    setStarting(true);
    try {
      // Persist host prefs under the selected group as well
      if (hostPrefs) localStorage.setItem(`hostPrefs:${selectedGroupId}`, JSON.stringify(hostPrefs));
      localStorage.setItem('lastGroupId', selectedGroupId);

      // Start a game round for this group
      const res = await fetch(`/api/groups/${selectedGroupId}/round`, {
        method: 'POST', headers: { 'content-type': 'application/json' }, credentials: 'include'
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j?.error || `Failed to start round (${res.status})`);

      // Broadcast preferences into chat so players can filter
      if (hostPrefs) {
        const prefPayload = {
          type: 'host_prefs',
          prefs: hostPrefs,
          created_at: new Date().toISOString(),
        };
        const pr = await fetch(`/api/groups/${selectedGroupId}/messages`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ content: JSON.stringify(prefPayload) })
        });
        const pj = await pr.json().catch(() => ({}));
        if (!pr.ok) throw new Error(pj?.error || `Failed to post prefs (${pr.status})`);
      }

      // Also post a short text message with invite code if available
      if (inviteCode) {
        const text = `Game starting now! Join with code: ${inviteCode}`;
        await fetch(`/api/groups/${selectedGroupId}/messages`, {
          method: 'POST', headers: { 'content-type': 'application/json' }, credentials: 'include',
          body: JSON.stringify({ content: text })
        });
      }

      // Navigate host to preferences page (players will enter via main screen code)
      router.push(`/game/preferences?groupId=${encodeURIComponent(selectedGroupId)}`);
    } catch (e) {
      alert(e?.message || 'Failed to start and announce game');
    } finally {
      setStarting(false);
    }
  }

  return (
    <div className="max-w-xl mx-auto p-4 space-y-4">
      <h1 className="text-xl font-semibold">Create Invite and Share</h1>

      {error && <div className="p-2 text-sm text-red-600 border border-red-300 rounded">{error}</div>}

      <div className="space-y-2">
        <div className="flex gap-2 items-center">
          <select className="border p-2 flex-1" value={selectedGroupId} onChange={e => setSelectedGroupId(e.target.value)}>
            <option value="">Select a group</option>
            {groups.map(g => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </select>
          <button className="border px-3 py-2" onClick={loadGroups}>Refresh</button>
        </div>
        <div className="flex gap-2 items-center">
          <input className="border p-2 flex-1" placeholder="or create new group" value={newGroupName} onChange={e => setNewGroupName(e.target.value)} />
          <button className="border px-3 py-2" onClick={createGroup}>Create</button>
        </div>
      </div>

      <div className="space-y-2">
        <button className="border px-3 py-2" onClick={createInvite} disabled={!selectedGroupId}>Generate Invite Code</button>
        {inviteCode && (
          <div className="text-sm">Invite Code: <span className="font-mono">{inviteCode}</span></div>
        )}
      </div>

      <div className="space-y-2">
        <button className="border px-4 py-2" onClick={startRoundAndAnnounce} disabled={!selectedGroupId || starting}>
          {starting ? 'Starting…' : 'Start Game and Announce'}
        </button>
      </div>

      <div className="text-xs opacity-70">
        <p>This step lets you choose a group or create a new one, generate a short invite code, and then announce the game with host preferences in the chat.</p>
      </div>

      <div>
        <Link className="text-sm underline" href="/game/host">Back to host preferences</Link>
      </div>
    </div>
  );
}
