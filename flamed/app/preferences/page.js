// app/preferences/page.js
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Preferences() {
  const [preferences, setPreferences] = useState({
    cuisine: [],
    priceRange: [],
    dietaryRestrictions: [],
    distance: 5, // Now in km
  });
  
  const router = useRouter();

  const cuisineOptions = [
    { name: 'Italian', emoji: '🍝' },
    { name: 'Mexican', emoji: '🌮' },
    { name: 'Chinese', emoji: '🥡' },
    { name: 'Indian', emoji: '🍛' },
    { name: 'Japanese', emoji: '🍣' },
    { name: 'American', emoji: '🍔' },
    { name: 'Mediterranean', emoji: '🥙' },
    { name: 'Thai', emoji: '🍜' },
    { name: 'Vietnamese', emoji: '🍲' },
    { name: 'French', emoji: '🥐' }
  ];

  const priceOptions = [
    { symbol: '$', emoji: '💲' },
    { symbol: '$$', emoji: '💵' },
    { symbol: '$$$', emoji: '💰' },
    { symbol: '$$$$', emoji: '🪙' }
  ];

  const dietaryOptions = [
    { name: 'Vegetarian', emoji: '🥦' },
    { name: 'Vegan', emoji: '🌱' },
    { name: 'Gluten-Free', emoji: '🌾' },
    { name: 'Dairy-Free', emoji: '🥛' },
    { name: 'Keto', emoji: '🥑' },
    { name: 'Paleo', emoji: '🍖' }
  ];

  const handleCuisineToggle = (cuisine) => {
    setPreferences(prev => {
      if (prev.cuisine.includes(cuisine)) {
        return { ...prev, cuisine: prev.cuisine.filter(c => c !== cuisine) };
      } else {
        return { ...prev, cuisine: [...prev.cuisine, cuisine] };
      }
    });
  };

  const handlePriceToggle = (price) => {
    setPreferences(prev => {
      if (prev.priceRange.includes(price)) {
        return { ...prev, priceRange: prev.priceRange.filter(p => p !== price) };
      } else {
        return { ...prev, priceRange: [...prev.priceRange, price] };
      }
    });
  };

  const handleDietaryToggle = (diet) => {
    setPreferences(prev => {
      if (prev.dietaryRestrictions.includes(diet)) {
        return { ...prev, dietaryRestrictions: prev.dietaryRestrictions.filter(d => d !== diet) };
      } else {
        return { ...prev, dietaryRestrictions: [...prev.dietaryRestrictions, diet] };
      }
    });
  };

  const handleDistanceChange = (e) => {
    setPreferences(prev => ({ ...prev, distance: parseInt(e.target.value) }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Save preferences to localStorage
    localStorage.setItem('restaurantPreferences', JSON.stringify(preferences));
    // Redirect to home page instead of non-existent /swipe
    router.push('/swiper');
  };

  return (
    <div className="min-h-screen py-8 px-4 animate-fade-in" style={{ background: 'var(--background)', color: 'var(--foreground)' }}>
      <div className="max-w-md mx-auto rounded-xl shadow-md overflow-hidden p-6" style={{ 
        backgroundColor: 'var(--nav-item-bg)',
        boxShadow: '0 4px 6px var(--nav-shadow)'
      }}>
        <h1 className="text-2xl font-bold text-center mb-6" style={{ color: 'var(--foreground)' }}>
          Restaurant Preferences
        </h1>
        <p className="text-center mb-8" style={{ color: 'var(--muted)' }}>
          Set your preferences to help us find the perfect restaurants for you!
        </p>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Cuisine Preferences */}
          <div>
            <h2 className="text-lg font-semibold mb-3" style={{ color: 'var(--foreground)' }}>Preferred Cuisines</h2>
            <div className="flex flex-wrap gap-2">
              {cuisineOptions.map(cuisine => (
                <button
                  key={cuisine.name}
                  type="button"
                  onClick={() => handleCuisineToggle(cuisine.name)}
                  className={`px-3 py-2 rounded-full text-sm transition-colors flex items-center gap-1 ${
                    preferences.cuisine.includes(cuisine.name)
                      ? ''
                      : ''
                  }`}
                  style={{
                    backgroundColor: preferences.cuisine.includes(cuisine.name) 
                      ? 'var(--accent)' 
                      : 'var(--nav-item-hover)',
                    color: preferences.cuisine.includes(cuisine.name) 
                      ? 'var(--nav-text)' 
                      : 'var(--foreground)'
                  }}
                >
                  <span>{cuisine.emoji}</span>
                  <span>{cuisine.name}</span>
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
                    preferences.priceRange.includes(price.symbol)
                      ? ''
                      : ''
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

          {/* Dietary Restrictions */}
          <div>
            <h2 className="text-lg font-semibold mb-3" style={{ color: 'var(--foreground)' }}>Dietary Restrictions</h2>
            <div className="flex flex-wrap gap-2">
              {dietaryOptions.map(diet => (
                <button
                  key={diet.name}
                  type="button"
                  onClick={() => handleDietaryToggle(diet.name)}
                  className={`px-3 py-2 rounded-full text-sm transition-colors flex items-center gap-1 ${
                    preferences.dietaryRestrictions.includes(diet.name)
                      ? ''
                      : ''
                  }`}
                  style={{
                    backgroundColor: preferences.dietaryRestrictions.includes(diet.name) 
                      ? 'var(--accent)' 
                      : 'var(--nav-item-hover)',
                    color: preferences.dietaryRestrictions.includes(diet.name) 
                      ? 'var(--nav-text)' 
                      : 'var(--foreground)'
                  }}
                >
                  <span>{diet.emoji}</span>
                  <span>{diet.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Distance - Now in KM */}
          <div>
            <h2 className="text-lg font-semibold mb-3" style={{ color: 'var(--foreground)' }}>
              Maximum Distance: {preferences.distance} km
            </h2>
            <input
              type="range"
              min="1"
              max="30"
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
              <span>30 km</span>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="w-full py-3 rounded-lg font-semibold transition-colors hover:opacity-90 flex items-center justify-center gap-2 animate-float"
            style={{
              backgroundColor: 'var(--accent)',
              color: 'var(--nav-text)'
            }}
          >
            <span>Done - Start Swiping!</span>
            <span>👉</span>
          </button>
        </form>
      </div>
    </div>
  );
}