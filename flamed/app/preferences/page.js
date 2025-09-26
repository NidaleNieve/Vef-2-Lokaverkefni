// app/preferences/page.js
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '../components/Navbar';

// main preferences page component
export default function Preferences() {
  // state for storing users preferences
  const [preferences, setPreferences] = useState({
    coordinates: { lat: 64.1265, lng: -21.8174 }, // Default to Reykjavik
    kidFriendly: false,
    category: [],
    allergies: [],
    distance: 5,
    rating: 0,
    priceRange: [],
    travelMode: 'driving' // driving or walking
  });
  
  const router = useRouter();

  // category options for Iceland restaurants
  const categoryOptions = [
    { name: 'Traditional Icelandic', emoji: '❄️' },
    { name: 'Seafood', emoji: '🐟' },
    { name: 'Nordic', emoji: '🏔️' },
    { name: 'Buffet', emoji: '🍽️' },
    { name: 'Fast Food', emoji: '🍟' },
    { name: 'Fine Dining', emoji: '🍷' },
    { name: 'Cafe', emoji: '☕' },
    { name: 'Street Food', emoji: '🌭' },
    { name: 'Vegetarian', emoji: '🥦' },
    { name: 'International', emoji: '🌎' }
  ];

  // allergy options
  const allergyOptions = [
    { name: 'Gluten', emoji: '🌾' },
    { name: 'Dairy', emoji: '🥛' },
    { name: 'Nuts', emoji: '🥜' },
    { name: 'Shellfish', emoji: '🦐' },
    { name: 'Eggs', emoji: '🥚' },
    { name: 'Soy', emoji: '🥢' }
  ];

  // price options
  const priceOptions = [
    { symbol: '$', emoji: '💲', description: 'Budget' },
    { symbol: '$$', emoji: '💵', description: 'Moderate' },
    { symbol: '$$$', emoji: '💰', description: 'Expensive' }
  ];

  // rating options
  const ratingOptions = [1, 2, 3, 4, 5];

  // toggle category selection
  const handleCategoryToggle = (category) => {
    setPreferences(prev => {
      if (prev.category.includes(category)) {
        return { ...prev, category: prev.category.filter(c => c !== category) };
      } else {
        return { ...prev, category: [...prev.category, category] };
      }
    });
  };

  // toggle allergy selection
  const handleAllergyToggle = (allergy) => {
    setPreferences(prev => {
      if (prev.allergies.includes(allergy)) {
        return { ...prev, allergies: prev.allergies.filter(a => a !== allergy) };
      } else {
        return { ...prev, allergies: [...prev.allergies, allergy] };
      }
    });
  };

  // toggle price selection
  const handlePriceToggle = (price) => {
    setPreferences(prev => {
      if (prev.priceRange.includes(price)) {
        return { ...prev, priceRange: prev.priceRange.filter(p => p !== price) };
      } else {
        return { ...prev, priceRange: [...prev.priceRange, price] };
      }
    });
  };

  // handle distance slider change
  const handleDistanceChange = (e) => {
    setPreferences(prev => ({ ...prev, distance: parseInt(e.target.value) }));
  };

  // handle rating selection
  const handleRatingChange = (rating) => {
    setPreferences(prev => ({ ...prev, rating }));
  };

  // handle kid friendly toggle
  const handleKidFriendlyToggle = () => {
    setPreferences(prev => ({ ...prev, kidFriendly: !prev.kidFriendly }));
  };

  // handle travel mode change
  const handleTravelModeChange = (mode) => {
    setPreferences(prev => ({ ...prev, travelMode: mode }));
  };

  // get current location coordinates
  const handleGetCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setPreferences(prev => ({
            ...prev,
            coordinates: {
              lat: position.coords.latitude,
              lng: position.coords.longitude
            }
          }));
        },
        (error) => {
          console.error('Error getting location:', error);
          alert('Unable to get your location. Using default Reykjavik coordinates.');
        }
      );
    } else {
      alert('Geolocation is not supported by this browser.');
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // save to local storage
    localStorage.setItem('restaurantPreferences', JSON.stringify(preferences));
    // go to swiping page when done
    router.push('/swiper');
  };

  return (
    <div className="min-h-screen py-8 px-4 animate-fade-in" style={{ background: 'var(--background)', color: 'var(--foreground)' }}>
      {/* navbar at the top */}
      <Navbar />

      {/* main preferences card */}
      <div className="max-w-md mx-auto rounded-xl shadow-md overflow-hidden p-6 mt-12" style={{ 
        backgroundColor: 'var(--nav-item-bg)',
        boxShadow: '0 4px 6px var(--nav-shadow)'
      }}>
        <h1 className="text-2xl font-bold text-center mb-6" style={{ color: 'var(--foreground)' }}>
          Preferences
        </h1>
        <p className="text-center mb-8" style={{ color: 'var(--muted)' }}>
          Set your preferences to find perfect restaurants!
        </p>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Coordinates/Location */}
          <div>
            <h2 className="text-lg font-semibold mb-3" style={{ color: 'var(--foreground)' }}>
              Location 
            </h2>
            <div className="space-y-3">
              <button
                type="button"
                onClick={handleGetCurrentLocation}
                className="w-full py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                style={{
                  backgroundColor: 'var(--nav-item-hover)',
                  color: 'var(--foreground)'
                }}
              >
                <span>📍 Use My Current Location</span>
              </button>
              <div className="text-xs text-center" style={{ color: 'var(--muted)' }}>
                Current: {preferences.coordinates.lat.toFixed(4)}, {preferences.coordinates.lng.toFixed(4)}
              </div>
            </div>
          </div>

          {/* Travel Mode */}
          <div>
            <h2 className="text-lg font-semibold mb-3" style={{ color: 'var(--foreground)' }}>Travel Mode</h2>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handleTravelModeChange('driving')}
                className={`flex-1 py-2 rounded-lg transition-colors flex items-center justify-center gap-1 ${
                  preferences.travelMode === 'driving' ? '' : ''
                }`}
                style={{
                  backgroundColor: preferences.travelMode === 'driving' 
                    ? 'var(--accent)' 
                    : 'var(--nav-item-hover)',
                  color: preferences.travelMode === 'driving' 
                    ? 'var(--nav-text)' 
                    : 'var(--foreground)'
                }}
              >
                <span>🚗</span>
                <span>Driving</span>
              </button>
              <button
                type="button"
                onClick={() => handleTravelModeChange('walking')}
                className={`flex-1 py-2 rounded-lg transition-colors flex items-center justify-center gap-1 ${
                  preferences.travelMode === 'walking' ? '' : ''
                }`}
                style={{
                  backgroundColor: preferences.travelMode === 'walking' 
                    ? 'var(--accent)' 
                    : 'var(--nav-item-hover)',
                  color: preferences.travelMode === 'walking' 
                    ? 'var(--nav-text)' 
                    : 'var(--foreground)'
                }}
              >
                <span>🚶</span>
                <span>Walking</span>
              </button>
            </div>
          </div>

          {/* Distance */}
          <div>
            <h2 className="text-lg font-semibold mb-3" style={{ color: 'var(--foreground)' }}>
              Maximum {preferences.travelMode === 'walking' ? 'Walking' : 'Driving'} Distance: {preferences.distance} km
            </h2>
            <input
              type="range"
              min="1"
              max={preferences.travelMode === 'walking' ? '10' : '50'}
              value={preferences.distance}
              onChange={handleDistanceChange}
              className="w-full h-2 rounded-lg appearance-none cursor-pointer"
              style={{ 
                backgroundColor: 'var(--nav-item-hover)',
                accentColor: 'var(--accent)'
              }}
            />
            <div className="flex justify-between text-xs mt-1" style={{ color: 'var(--muted)' }}>
              <span>1 km</span>
              <span>{preferences.travelMode === 'walking' ? '10' : '50'} km</span>
            </div>
          </div>

          {/* Rating */}
          <div>
            <h2 className="text-lg font-semibold mb-3" style={{ color: 'var(--foreground)' }}>Minimum Rating</h2>
            <div className="flex flex-wrap gap-2">
              {ratingOptions.map(rating => (
                <button
                  key={rating}
                  type="button"
                  onClick={() => handleRatingChange(rating)}
                  className={`px-3 py-2 rounded-full text-sm transition-colors flex items-center gap-1 ${
                    preferences.rating >= rating ? '' : ''
                  }`}
                  style={{
                    backgroundColor: preferences.rating >= rating 
                      ? 'var(--accent)' 
                      : 'var(--nav-item-hover)',
                    color: preferences.rating >= rating 
                      ? 'var(--nav-text)' 
                      : 'var(--foreground)'
                  }}
                >
                  <span>⭐</span>
                  <span>{rating}+</span>
                </button>
              ))}
            </div>
          </div>

          {/* Price Range */}
          <div>
            <h2 className="text-lg font-semibold mb-3" style={{ color: 'var(--foreground)' }}>Price Range</h2>
            <div className="flex flex-wrap gap-2">
              {priceOptions.map(price => (
                <button
                  key={price.symbol}
                  type="button"
                  onClick={() => handlePriceToggle(price.symbol)}
                  className={`px-3 py-2 rounded-full text-sm transition-colors flex items-center gap-1 ${
                    preferences.priceRange.includes(price.symbol) ? '' : ''
                  }`}
                  style={{
                    backgroundColor: preferences.priceRange.includes(price.symbol) 
                      ? 'var(--accent)' 
                      : 'var(--nav-item-hover)',
                    color: preferences.priceRange.includes(price.symbol) 
                      ? 'var(--nav-text)' 
                      : 'var(--foreground)'
                  }}
                >
                  <span>{price.emoji}</span>
                  <span>{price.symbol}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Category */}
          <div>
            <h2 className="text-lg font-semibold mb-3" style={{ color: 'var(--foreground)' }}>Restaurant Categories</h2>
            <div className="flex flex-wrap gap-2">
              {categoryOptions.map(category => (
                <button
                  key={category.name}
                  type="button"
                  onClick={() => handleCategoryToggle(category.name)}
                  className={`px-3 py-2 rounded-full text-sm transition-colors flex items-center gap-1 ${
                    preferences.category.includes(category.name) ? '' : ''
                  }`}
                  style={{
                    backgroundColor: preferences.category.includes(category.name) 
                      ? 'var(--accent)' 
                      : 'var(--nav-item-hover)',
                    color: preferences.category.includes(category.name) 
                      ? 'var(--nav-text)' 
                      : 'var(--foreground)'
                  }}
                >
                  <span>{category.emoji}</span>
                  <span>{category.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Kid Friendly */}
          <div>
            <h2 className="text-lg font-semibold mb-3" style={{ color: 'var(--foreground)' }}>Kid Friendly</h2>
            <button
              type="button"
              onClick={handleKidFriendlyToggle}
              className={`w-full py-3 rounded-lg transition-colors flex items-center justify-center gap-2 ${
                preferences.kidFriendly ? '' : ''
              }`}
              style={{
                backgroundColor: preferences.kidFriendly 
                  ? 'var(--accent)' 
                  : 'var(--nav-item-hover)',
                color: preferences.kidFriendly 
                  ? 'var(--nav-text)' 
                  : 'var(--foreground)'
              }}
            >
              <span>{preferences.kidFriendly ? '✅' : '❌'}</span>
              <span>{preferences.kidFriendly ? 'Kid Friendly Restaurants' : 'Any Restaurant'}</span>
            </button>
          </div>

          {/* Allergies */}
          <div>
            <h2 className="text-lg font-semibold mb-3" style={{ color: 'var(--foreground)' }}>Allergies</h2>
            <div className="flex flex-wrap gap-2">
              {allergyOptions.map(allergy => (
                <button
                  key={allergy.name}
                  type="button"
                  onClick={() => handleAllergyToggle(allergy.name)}
                  className={`px-3 py-2 rounded-full text-sm transition-colors flex items-center gap-1 ${
                    preferences.allergies.includes(allergy.name) ? '' : ''
                  }`}
                  style={{
                    backgroundColor: preferences.allergies.includes(allergy.name) 
                      ? 'var(--accent)' 
                      : 'var(--nav-item-hover)',
                    color: preferences.allergies.includes(allergy.name) 
                      ? 'var(--nav-text)' 
                      : 'var(--foreground)'
                  }}
                >
                  <span>{allergy.emoji}</span>
                  <span>{allergy.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="w-full py-3 rounded-lg font-semibold transition-colors hover:opacity-90 flex items-center justify-center gap-2"
            style={{
              backgroundColor: 'var(--accent)',
              color: 'var(--nav-text)'
            }}
          >
            <span>Start swiping!</span>
          </button>
        </form>
      </div>
    </div>
  );
}