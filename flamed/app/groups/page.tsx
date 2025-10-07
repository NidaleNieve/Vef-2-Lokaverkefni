// app/groups/page.tsx
// this is the main groups page where users can see all their groups
// it loads groups from supabase and shows them in a list
// each group card links to the chat room for that group
'use client' // this tells nextjs to run this on the client side not server
import { useEffect, useState } from 'react' 
import Link from 'next/link' 
import { supabaseBrowser } from '@/utils/supabase/browser' 
import { Users, MessageCircle, Clock, Edit2, Check, X } from 'lucide-react' 

// this is what a group looks like when we get it from the database
type MyGroup = {
  group_id: string // unique id for each group
  group_name: string // the name of the group
  role: string // if you're admin or just a member
  joined_at?: string // when you joined (optional)
  group_created_at?: string // when group was made (optional)
}

export default function GroupsPage() {
  const supa = supabaseBrowser() // connect to our database
  const [groups, setGroups] = useState<MyGroup[]>([]) // list of all groups user is in
  const [loading, setLoading] = useState(true) // shows loading spinner while fetching
  const [error, setError] = useState<string | null>(null) // stores error messages
  const [newGroupName, setNewGroupName] = useState('') // text input for creating groups
  const [creating, setCreating] = useState(false) // prevents double-clicking create button
  
  // rename functionality state
  const [renamingGroupId, setRenamingGroupId] = useState<string | null>(null) // which group is being renamed
  const [renameValue, setRenameValue] = useState('') // new name input value
  const [renaming, setRenaming] = useState(false) // prevents double-clicking rename button

  // this runs when the page first loads
  useEffect(() => {
    loadMyGroups() // go get all the groups from database
  }, [])

  // function to get all groups the user belongs to
  async function loadMyGroups() {
    try {
      setLoading(true) // show loading spinner
      setError(null) // clear any old errors
      
      // call the database function to get groups
      const { data, error } = await supa.rpc('get_my_groups')

      if (error) {
        setError(error.message) // show error to user
        setGroups([]) // clear the groups list
        return
      }
      
      // make sure we got an array back, if not use empty array
      const arr = Array.isArray(data) ? (data as MyGroup[]) : []
      setGroups(arr) // update our state with the groups
    } catch (err) {
      setError('Failed to load groups') // generic error message
      console.error('Error loading groups:', err) // log for debugging
    } finally {
      setLoading(false) // hide loading spinner no matter what
    }
  }

  // function to create a new group
  async function createGroup() {
    // don't do anything if name is empty or already creating
    if (!newGroupName.trim() || creating) return
    
    try {
      setCreating(true) // disable the button
      setError(null) // clear any old errors
      
      // send request to our api to create the group
      const response = await fetch('/api/groups', {
        method: 'POST', // we're creating something new
        headers: { 'content-type': 'application/json' }, // tell server we're sending json
        credentials: 'include', // include cookies for authentication
        body: JSON.stringify({ name: newGroupName.trim() }) // send the group name
      })
      
      const body = await response.json() // get the response
      
      if (!response.ok) {
        // something went wrong, throw an error
        throw new Error(body?.error || `HTTP ${response.status}`)
      }
      
      // success! clear the input and refresh the list
      setNewGroupName('') // empty the text box
      await loadMyGroups() // reload groups to show the new one
      
    } catch (err) {
      // handle any errors that happened
      setError(err instanceof Error ? err.message : 'Failed to create group')
      console.error('Error creating group:', err) // log for debugging
    } finally {
      setCreating(false) // re-enable the button
    }
  }

  // function to rename a group (using same RPC logic as dev console)
  async function renameGroup(groupId: string) {
    const name = renameValue.trim()
    if (!name || name.length < 2 || renaming) return
    
    try {
      setRenaming(true) // disable the button
      setError(null) // clear any old errors
      
      // call the same RPC function as dev console
      const { data, error } = await supa.rpc('rename_group', {
        p_group_id: groupId,
        p_new_name: name,
      })
      
      if (error) {
        throw new Error(error.message)
      }
      
      // success! exit rename mode and refresh the list
      setRenamingGroupId(null)
      setRenameValue('')
      await loadMyGroups() // reload groups to show the new name
      
    } catch (err) {
      // handle any errors that happened
      setError(err instanceof Error ? err.message : 'Failed to rename group')
      console.error('Error renaming group:', err) // log for debugging
    } finally {
      setRenaming(false) // re-enable the button
    }
  }

  // function to start renaming a group
  function startRename(group: MyGroup) {
    setRenamingGroupId(group.group_id)
    setRenameValue(group.group_name) // pre-fill with current name
    setError(null) // clear any errors
  }

  // function to cancel renaming
  function cancelRename() {
    setRenamingGroupId(null)
    setRenameValue('')
    setError(null)
  }

  // helper to make dates look nice
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'unknown' // if no date, show this
    return new Date(dateString).toLocaleDateString() // format as readable date
  }

  // helper to style the role badges (admin vs member)
  const getRoleColor = (role: string) => {
    const baseStyle = {
      background: 'var(--nav-item-hover)', // use our custom css colors
      color: 'var(--foreground)',
      opacity: role.toLowerCase() === 'admin' ? '0.9' : '0.7' // admins are more opaque
    }
    return baseStyle
  }

  // show loading skeleton while fetching data
  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6 mt-20">
        <div className="animate-pulse">
          <div className="h-8 rounded w-1/3 mb-6" style={{ background: 'var(--muted)', opacity: 0.3 }}></div>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-24 rounded-lg" style={{ background: 'var(--muted)', opacity: 0.2 }}></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // main page content
  return (
    <div className="max-w-4xl mx-auto p-6 mt-20">
      <div className="mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-2 mb-4" style={{ color: 'var(--foreground)' }}>
          <Users style={{ color: 'var(--accent)' }} />
          my groups
        </h1>
        
        {/* form to create new groups */}
        <div className="flex gap-2 items-center">
          {/* text input for group name */}
          <input
            className="flex-1 px-3 py-2 rounded border transition-colors"
            style={{ 
              background: 'var(--nav-item-bg)', 
              borderColor: 'var(--muted)', 
              color: 'var(--foreground)' 
            }}
            placeholder="enter group name..." 
            value={newGroupName} // controlled input
            onChange={(e) => setNewGroupName(e.target.value)} // update state on type
            onKeyPress={(e) => e.key === 'Enter' && createGroup()} // enter key creates group
            disabled={creating} // disable while creating
          />
          {/* create button */}
          <button
            className="px-4 py-2 rounded transition-all duration-200 disabled:opacity-50"
            style={{ 
              background: 'var(--accent)', 
              color: 'white' 
            }}
            onClick={createGroup}
            disabled={!newGroupName.trim() || creating} // disable if empty or creating
          >
            {creating ? 'creating...' : 'create group'}
          </button>
        </div>
      </div>

      {/* show error message if something went wrong */}
      {error && (
        <div className="px-4 py-3 rounded mb-6" style={{ background: 'var(--nav-item-bg)', border: '1px solid var(--accent)', color: 'var(--foreground)' }}>
          <p>error: {error}</p> {/* show the error */}
          <button 
            onClick={loadMyGroups} // try loading again
            className="mt-2 text-sm underline"
            style={{ color: 'var(--accent)' }}
          >
            try again
          </button>
        </div>
      )}

      {/* show this when user has no groups */}
      {groups.length === 0 && !loading && !error && (
        <div className="text-center py-12">
          <Users size={64} className="mx-auto mb-4" style={{ color: 'var(--muted)' }} /> 
          <h3 className="text-xl font-semibold mb-2" style={{ color: 'var(--muted)' }}>
            no groups yet
          </h3>
          <p style={{ color: 'var(--muted)' }}>
            you haven't joined any groups yet.
          </p>
        </div>
      )}

      {/* list of all groups */}
      <div className="grid gap-4">
        {groups.map((group) => {
          const isRenaming = renamingGroupId === group.group_id
          const canRename = group.role.toLowerCase() === 'admin' || group.role.toLowerCase() === 'owner'
          
          return (
            <div
              key={group.group_id} // unique key for react
              className="p-6 rounded-lg shadow-sm border transition-all duration-200 group hover:shadow-md"
              style={{ 
                background: 'var(--nav-item-bg)', // custom background
                borderColor: 'var(--muted)' // custom border
              }}
              onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--accent)'} // hover effect
              onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--muted)'} // unhover effect
            >
              {/* group card layout */}
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  {/* group name or rename input */}
                  {isRenaming ? (
                    <div className="flex items-center gap-2 mb-2">
                      <input
                        className="flex-1 px-2 py-1 rounded border text-lg font-semibold"
                        style={{ 
                          background: 'var(--background)', 
                          borderColor: 'var(--accent)', 
                          color: 'var(--foreground)' 
                        }}
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && renameGroup(group.group_id)}
                        placeholder="Enter new group name"
                        autoFocus
                        disabled={renaming}
                      />
                      <button
                        onClick={() => renameGroup(group.group_id)}
                        disabled={renaming || renameValue.trim().length < 2}
                        className="p-1 rounded transition-colors disabled:opacity-50"
                        style={{ color: 'var(--accent)' }}
                        title="Save changes"
                      >
                        <Check size={18} />
                      </button>
                      <button
                        onClick={cancelRename}
                        disabled={renaming}
                        className="p-1 rounded transition-colors disabled:opacity-50"
                        style={{ color: 'var(--muted)' }}
                        title="Cancel rename"
                      >
                        <X size={18} />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-xl font-semibold transition-colors group-hover:opacity-80" style={{ color: 'var(--foreground)' }}>
                        {group.group_name}
                      </h3>
                      {canRename && (
                        <button
                          onClick={() => startRename(group)}
                          className="p-1 rounded transition-colors opacity-0 group-hover:opacity-70 hover:opacity-100"
                          style={{ color: 'var(--muted)' }}
                          title="Rename group"
                        >
                          <Edit2 size={16} />
                        </button>
                      )}
                    </div>
                  )}
                  
                  {/* group details */}
                  <div className="flex items-center gap-4 text-sm" style={{ color: 'var(--muted)' }}>
                    {/* role badge (admin or member) */}
                    <span className="px-2 py-1 rounded-full text-xs font-medium" style={getRoleColor(group.role)}>
                      {group.role}
                    </span>
                    {/* when user joined (if we have that info) */}
                    {group.joined_at && (
                      <span className="flex items-center gap-1">
                        <Clock size={14} />
                        joined {formatDate(group.joined_at)} {/* formatted date */}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {!isRenaming && (
                    <Link
                      href={`/groups/${group.group_id}`} // link to group chat page
                      className="flex items-center transition-colors group-hover:opacity-80 p-2 rounded hover:bg-opacity-50"
                      style={{ color: 'var(--muted)' }}
                      title="Open chat"
                    >
                      <MessageCircle size={20} />
                    </Link>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

    </div>
  )
}