'use client';

import { useState, useMemo } from 'react';
import Image from 'next/image';
import { getAllergensFromCuisines } from '../../utils/allergenMapping';
import { getMatchingUserAllergens } from '../../utils/userAllergens';
import { testRestaurants } from '../../utils/testData';
import AllergenSettings from '../../components/AllergenSettings';

function RestaurantCard({ restaurant }) {
    // Get potential allergens based on restaurant cuisines
    const potentialAllergens = useMemo(() => {
        return getAllergensFromCuisines(restaurant.cuisines);
    }, [restaurant.cuisines]);

    // Check which allergens match user's allergen preferences
    const userMatchingAllergens = useMemo(() => {
        return getMatchingUserAllergens(potentialAllergens);
    }, [potentialAllergens]);

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden max-w-sm">
            <div className="h-48 bg-gray-200 dark:bg-gray-600 flex items-center justify-center">
                <span className="text-gray-500">Restaurant Image</span>
            </div>
            
            {/* Allergen warning tags */}
            {userMatchingAllergens.length > 0 && (
                <div className="px-3 py-2 border-b border-red-100">
                    <div className="flex flex-wrap gap-1">
                        {userMatchingAllergens.map((allergen) => (
                            <span
                                key={allergen}
                                className="inline-flex items-center px-2 py-1 text-xs font-medium 
                                         bg-red-50 text-red-700 border border-red-200 rounded-md
                                         dark:bg-red-900/20 dark:text-red-300 dark:border-red-800"
                                title={`Contains ${allergen}`}
                            >
                                ⚠️ {allergen}
                            </span>
                        ))}
                    </div>
                </div>
            )}
            
            <div className="p-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {restaurant.name}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    {restaurant.parent_city} • {restaurant.avg_rating ?? 'N/A'} ({restaurant.review_count ?? 0})
                </p>
                <div className="mb-2">
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Cuisines: </span>
                    <span className="text-xs text-gray-700 dark:text-gray-300">
                        {restaurant.cuisines.join(', ')}
                    </span>
                </div>
                <div>
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Potential allergens: </span>
                    <span className="text-xs text-gray-700 dark:text-gray-300">
                        {potentialAllergens.join(', ') || 'None detected'}
                    </span>
                </div>
            </div>
        </div>
    );
}

export default function DemoAllergensPage() {
    const [showSettings, setShowSettings] = useState(false);
    
    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
            <div className="max-w-6xl mx-auto px-4">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
                        Allergen Detection Demo
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400 mb-4">
                        This demo shows how restaurants display allergen warnings based on their cuisine types.
                    </p>
                    <button
                        onClick={() => setShowSettings(true)}
                        className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700
                                 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                    >
                        ⚙️ Set My Allergen Preferences
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {testRestaurants.map(restaurant => (
                        <RestaurantCard key={restaurant.id} restaurant={restaurant} />
                    ))}
                </div>

                <div className="mt-8 bg-white dark:bg-gray-800 rounded-lg p-6 max-w-4xl mx-auto">
                    <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
                        How It Works
                    </h2>
                    <div className="space-y-3 text-sm text-gray-600 dark:text-gray-400">
                        <p>
                            <strong>Server-side Allergen Detection:</strong> Based on cuisine types, 
                            the system automatically detects potential allergens. For example, Italian 
                            restaurants typically use dairy, gluten, eggs, and nuts.
                        </p>
                        <p>
                            <strong>User Preferences:</strong> Users can set their allergen preferences 
                            using the settings button above. These are stored locally for demonstration.
                        </p>
                        <p>
                            <strong>Warning Tags:</strong> When a restaurant's potential allergens match 
                            the user's allergen preferences, warning tags appear with a subtle red border 
                            underneath the restaurant image.
                        </p>
                        <p>
                            <strong>Future Enhancement:</strong> When cards are expanded (being worked on 
                            in another branch), the tags will show detailed explanations like 
                            "potential fish products" or "contains dairy products".
                        </p>
                    </div>
                </div>
            </div>

            <AllergenSettings 
                isOpen={showSettings}
                onClose={() => setShowSettings(false)}
            />
        </div>
    );
}