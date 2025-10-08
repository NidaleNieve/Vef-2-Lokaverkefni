'use client'
import { useState, useEffect } from 'react'
import { User, Settings, LogOut, Save, Edit3, Camera, Check } from 'lucide-react'
import Link from 'next/link'

// pre-defined avatar seeds for consistent, diverse avatars
const AVATAR_SEEDS = [
  'John', 'Sarah', 'Mike', 'Emma', 'Alex', 'Luna', 
  'David', 'Sofia', 'Ryan', 'Mia', 'Chris', 'Zoe',
  'Kevin', 'Aria', 'Jake', 'Lily'
]

// predefined allergies and dietary restrictions
const DIETARY_OPTIONS = [
  { id: 'gluten-free', label: 'Gluten-Free', category: 'allergy' },
  { id: 'dairy-free', label: 'Dairy-Free', category: 'allergy' },
  { id: 'nut-free', label: 'Nut-Free', category: 'allergy' },
  { id: 'shellfish-free', label: 'Shellfish-Free', category: 'allergy' }
]

// generate avatar URL from seed using Dicebear API
const getAvatarUrl = (seed) => {
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`
}

// dummy profile data
export default function ProfilePage() {
  // user profile state
  const [userProfile, setUserProfile] = useState({
    name: 'John Doe',
    email: 'john.doe@example.com',
    profilePicture: null,
    avatarSeed: 'John', // default avatar seed
    joinDate: '2024-01-15' // random join date
  })

  // food preferences state
  const [preferences, setPreferences] = useState({
    selectedOptions: [] // array of selected dietary option IDs
  })

  // UI state
  const [isEditing, setIsEditing] = useState(false)
  const [loading, setLoading] = useState(false)
  const [saveResult, setSaveResult] = useState(null)
  const [signOutLoading, setSignOutLoading] = useState(false)
  const [signOutResult, setSignOutResult] = useState(null)
  const [showAvatarSelector, setShowAvatarSelector] = useState(false)

  // Load avatar and preferences on page mount
  useEffect(() => {
    loadUserAvatar()
    loadUserPreferences()
  }, [])

  // Load user preferences from localStorage
  const loadUserPreferences = () => {
    try {
      const savedPreferences = localStorage.getItem('userDietaryPreferences')
      if (savedPreferences) {
        const parsedPreferences = JSON.parse(savedPreferences)
        setPreferences(prev => ({
          ...prev,
          selectedOptions: parsedPreferences
        }))
      }
    } catch (error) {
      console.error('Failed to load preferences from localStorage:', error)
    }
  }

  // Toggle dietary option selection
  const toggleDietaryOption = (optionId) => {
    setPreferences(prev => {
      const isSelected = prev.selectedOptions.includes(optionId)
      const newSelection = isSelected 
        ? prev.selectedOptions.filter(id => id !== optionId)
        : [...prev.selectedOptions, optionId]
      
      return { ...prev, selectedOptions: newSelection }
    })
  }

  // Load use avatar from local Storage
  const loadUserAvatar = () => {
    try {
      const savedAvatarSeed = localStorage.getItem('userAvatarSeed')
      if (savedAvatarSeed) {
        setUserProfile(prev => ({
          ...prev,
          avatarSeed: savedAvatarSeed
        }))
      }
    } catch (error) {
      console.error('Failed to load avatar from localStorage:', error)
    }
  }

  // Select avatar function - saves to localStorage
  const selectAvatar = (seed) => {
    // Update UI immediately
    setUserProfile(prev => ({ ...prev, avatarSeed: seed }))
    setShowAvatarSelector(false)
    
    // Save to localStorage
    try {
      localStorage.setItem('userAvatarSeed', seed)
      setSaveResult({ ok: true, message: 'Avatar saved successfully!' })
    } catch (error) {
      console.error('Avatar save error:', error)
      setSaveResult({ ok: false, error: 'Failed to save avatar locally' })
    }
    
    setTimeout(() => setSaveResult(null), 3000)
  }

  // save preferences
  const savePreferences = () => {
    setLoading(true)
    setSaveResult(null)
    try {
      // Save to localStorage for now
      localStorage.setItem('userDietaryPreferences', JSON.stringify(preferences.selectedOptions))
      setSaveResult({ ok: true, message: 'Preferences saved successfully!' })
      setIsEditing(false)
    } catch (err) {
      setSaveResult({ ok: false, error: err?.message || 'Failed to save preferences' })
    } finally {
      setLoading(false)
    }
  }

  // sign out function
  const handleSignOut = async () => {
    setSignOutLoading(true)
    setSignOutResult(null)
    try {
      const res = await fetch('/api/auth/signout', { method: 'POST' })
      const json = await res.json()
      setSignOutResult(json)
      
      if (json.ok) {
        // redirect to home page after successful sign out
        setTimeout(() => {
          window.location.href = '/'
        }, 1500)
      }
    } catch (err) {
      setSignOutResult({ ok: false, error: err?.message || 'Sign out failed' })
    } finally {
      setSignOutLoading(false)
    }
  }

  return (
    <div className="min-h-screen pt-20 pb-8 px-4" style={{ background: 'var(--background)' }}>
      <div className="max-w-4xl mx-auto">
        {/* profile header */}
        <div className="rounded-2xl shadow-xl overflow-hidden border mb-8" style={{ 
          background: 'var(--nav-bg)',
          borderColor: 'var(--accent)',
          opacity: 0.95
        }}>
          <div className="px-8 py-6">
            <div className="flex flex-col md:flex-row items-center gap-6">
              {/*profile picture */}
              <div className="relative">
                <div className="w-24 h-24 rounded-full flex items-center justify-center overflow-hidden" style={{ 
                  background: 'var(--nav-item-bg)',
                  border: '3px solid var(--accent)'
                }}>
                  {userProfile.avatarSeed ? (
                    <img 
                      src={getAvatarUrl(userProfile.avatarSeed)} 
                      alt="Profile Avatar" 
                      className="w-full h-full object-cover"
                    />
                  ) : userProfile.profilePicture ? (
                    <img 
                      src={userProfile.profilePicture} 
                      alt="Profile" 
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    <User size={40} style={{ color: 'var(--accent)' }} />
                  )}
                </div>
                <button 
                  onClick={() => setShowAvatarSelector(true)}
                  className="absolute -bottom-2 -right-2 p-2 rounded-full shadow-lg transition-transform hover:scale-110"
                  style={{ background: 'var(--accent)', color: 'white' }}
                  title="Change Avatar"
                >
                  <Camera size={16} />
                </button>
              </div>

              {/* user info */}
              <div className="flex-1 text-center md:text-left">
                <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--nav-text)' }}>
                  {userProfile.name}
                </h1>
                <p className="text-lg mb-2" style={{ color: 'var(--muted)' }}>
                  {userProfile.email}
                </p>
                <p className="text-sm" style={{ color: 'var(--muted)' }}>
                  Member since {new Date(userProfile.joinDate).toLocaleDateString()}
                </p>
              </div>

              {/* sign out button */}
              <div className="flex flex-col gap-2">
                <button
                  onClick={handleSignOut}
                  disabled={signOutLoading}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 hover:scale-105"
                  style={{ 
                    background: 'var(--destructive)',
                    color: 'white'
                  }}
                >
                  <LogOut size={18} />
                  {signOutLoading ? 'Signing out...' : 'Sign Out'}
                </button>
              </div>
            </div>

            {/* sign Out Result */}
            {signOutResult && (
              <div className={`mt-4 p-3 rounded-lg flex items-center gap-2 ${
                signOutResult.ok ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-200' 
                : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-200'
              }`}>
                {signOutResult.ok ? '✓' : '✗'}
                {signOutResult.ok ? 'Signed out successfully! Redirecting...' : signOutResult.error}
              </div>
            )}
          </div>
        </div>

        {/* Avatar Selector Modal */}
        {showAvatarSelector && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto" style={{ 
              background: 'var(--nav-bg)',
              borderColor: 'var(--accent)',
              border: '2px solid'
            }}>
              <div className="p-6">
                {/* Modal Header */}
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-2xl font-bold" style={{ color: 'var(--nav-text)' }}>
                    Choose Your Avatar
                  </h3>
                  <button
                    onClick={() => setShowAvatarSelector(false)}
                    className="p-2 rounded-lg transition-colors hover:bg-gray-200 dark:hover:bg-gray-700"
                    style={{ color: 'var(--nav-text)' }}
                  >
                    ✕
                  </button>
                </div>

                {/* Avatar Grid */}
                <div className="grid grid-cols-4 gap-4 mb-6">
                  {AVATAR_SEEDS.map((seed) => (
                    <div key={seed} className="relative">
                      <button
                        onClick={() => selectAvatar(seed)}
                        className={`w-full aspect-square rounded-xl border-3 transition-all duration-200 hover:scale-105 overflow-hidden ${
                          userProfile.avatarSeed === seed 
                            ? 'ring-4 ring-blue-500 scale-105' 
                            : 'hover:ring-2 hover:ring-gray-300'
                        }`}
                        style={{ 
                          borderColor: userProfile.avatarSeed === seed ? 'var(--accent)' : 'transparent'
                        }}
                      >
                        <img 
                          src={getAvatarUrl(seed)} 
                          alt={`Avatar ${seed}`}
                          className="w-full h-full object-cover"
                        />
                      </button>
                      
                      {/* Selected indicator */}
                      {userProfile.avatarSeed === seed && (
                        <div className="absolute -top-2 -right-2 p-1 rounded-full shadow-lg" style={{ background: 'var(--accent)' }}>
                          <Check size={16} color="white" />
                        </div>
                      )}
                      
                      {/* Avatar name */}
                      <p className="text-center text-sm mt-2" style={{ color: 'var(--muted)' }}>
                        {seed}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Modal Footer */}
                <div className="flex justify-between items-center">
                  <p className="text-sm" style={{ color: 'var(--muted)' }}>
                    💡 Click any avatar to select it
                  </p>
                  <button
                    onClick={() => setShowAvatarSelector(false)}
                    className="px-4 py-2 rounded-lg transition-colors"
                    style={{ 
                      background: 'var(--nav-item-bg)',
                      color: 'var(--nav-text)'
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* food preferences section */}
        <div className="rounded-2xl shadow-xl overflow-hidden border" style={{ 
          background: 'var(--nav-bg)',
          borderColor: 'var(--accent)',
          opacity: 0.95
        }}>
          <div className="px-8 py-6">
            {/* section header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <Settings size={24} style={{ color: 'var(--accent)' }} />
                <h2 className="text-2xl font-bold" style={{ color: 'var(--nav-text)' }}>
                  Dietary Information
                </h2>
              </div>
              <button
                onClick={() => isEditing ? setIsEditing(false) : setIsEditing(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 hover:scale-105"
                style={{ 
                  background: 'var(--nav-item-bg)',
                  color: 'var(--nav-text)'
                }}
              >
                <Edit3 size={18} />
                {isEditing ? 'Cancel' : 'Edit'}
              </button>
            </div>

            {/* preferences form */}
            <div className="space-y-6">
              {/* dietary preferences and allergies */}
              <div>
                <label className="block text-sm font-medium mb-4" style={{ color: 'var(--nav-text)' }}>
                  Allergies & Dietary Restrictions
                </label>
                
                {/* Display selected preferences when not editing */}
                {!isEditing && (
                  <div className="mb-4">
                    {preferences.selectedOptions.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {preferences.selectedOptions.map(optionId => {
                          const option = DIETARY_OPTIONS.find(opt => opt.id === optionId)
                          return option ? (
                            <span 
                              key={optionId}
                              className="px-3 py-1 rounded-full text-sm"
                              style={{ 
                                background: 'var(--accent)',
                                color: 'white'
                              }}
                            >
                              {option.label}
                            </span>
                          ) : null
                        })}
                      </div>
                    ) : (
                      <p className="text-sm" style={{ color: 'var(--muted)' }}>
                        No allergies or restrictions selected
                      </p>
                    )}
                  </div>
                )}

                {/* Button grid for editing */}
                {isEditing && (
                  <div className="space-y-4">
                    {/* Group by category */}
                    {['allergy'].map(category => {
                      const categoryOptions = DIETARY_OPTIONS.filter(opt => opt.category === category)
                      const categoryTitles = {
                        allergy: 'Allergies & Restrictions'
                      }
                      
                      return (
                        <div key={category}>
                          <h4 className="text-sm font-medium mb-2" style={{ color: 'var(--nav-text)' }}>
                            {categoryTitles[category]}
                          </h4>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                            {categoryOptions.map(option => {
                              const isSelected = preferences.selectedOptions.includes(option.id)
                              return (
                                <button
                                  key={option.id}
                                  onClick={() => toggleDietaryOption(option.id)}
                                  className={`px-3 py-2 rounded-lg text-sm transition-all duration-200 hover:scale-105 border ${
                                    isSelected 
                                      ? 'ring-2 ring-blue-500' 
                                      : 'hover:ring-1 hover:ring-gray-300'
                                  }`}
                                  style={{ 
                                    background: isSelected ? 'var(--accent)' : 'var(--nav-item-bg)',
                                    color: isSelected ? 'white' : 'var(--nav-text)',
                                    borderColor: isSelected ? 'var(--accent)' : 'transparent'
                                  }}
                                >
                                  {option.label}
                                  {isSelected && <Check size={14} className="inline ml-1" />}
                                </button>
                              )
                            })}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}

                <p className="mt-2 text-sm" style={{ color: 'var(--muted)' }}>
                  {isEditing 
                    ? 'Click to select/deselect your allergies and dietary restrictions'
                    : 'Your selected allergies help us find suitable restaurants for you'
                  }
                </p>
              </div>

              {/* save buttons */}
              {isEditing && (
                <div className="flex justify-end gap-3 pt-4">
                  <button
                    onClick={savePreferences}
                    disabled={loading}
                    className="flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all duration-200 hover:scale-105"
                    style={{ 
                      background: 'var(--accent)',
                      color: 'white'
                    }}
                  >
                    <Save size={18} />
                    {loading ? 'Saving...' : 'Save Preferences'}
                  </button>
                </div>
              )}

              {/* save results */}
              {saveResult && (
                <div className={`p-4 rounded-lg flex items-center gap-2 ${
                  saveResult.ok ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-200' 
                  : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-200'
                }`}>
                  {saveResult.ok ? '✓' : '✗'}
                  {saveResult.ok ? saveResult.message : saveResult.error}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* back to home link */}
        <div className="text-center mt-8">
          <Link 
            href="/" 
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg transition-all duration-200 hover:scale-105"
            style={{ 
              background: 'var(--nav-item-bg)',
              color: 'var(--nav-text)'
            }}
          >
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  )
}
