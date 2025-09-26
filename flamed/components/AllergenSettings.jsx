'use client';

import { useState, useEffect } from 'react';
import { getUserAllergens, setUserAllergens, AVAILABLE_ALLERGENS } from '../utils/userAllergens';

export default function AllergenSettings({ isOpen, onClose }) {
  const [selectedAllergens, setSelectedAllergens] = useState([]);

  useEffect(() => {
    if (isOpen) {
      setSelectedAllergens(getUserAllergens());
    }
  }, [isOpen]);

  const toggleAllergen = (allergen) => {
    setSelectedAllergens(prev => 
      prev.includes(allergen) 
        ? prev.filter(a => a !== allergen)
        : [...prev, allergen]
    );
  };

  const handleSave = () => {
    setUserAllergens(selectedAllergens);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
          My Allergen Preferences
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Select allergens you have to get warnings on restaurant cards:
        </p>
        
        <div className="space-y-2 mb-6">
          {AVAILABLE_ALLERGENS.map(allergen => (
            <label key={allergen} className="flex items-center">
              <input
                type="checkbox"
                checked={selectedAllergens.includes(allergen)}
                onChange={() => toggleAllergen(allergen)}
                className="mr-3 h-4 w-4 text-red-600 border-gray-300 rounded 
                          focus:ring-red-500 dark:border-gray-600 dark:bg-gray-700"
              />
              <span className="text-gray-900 dark:text-white capitalize">
                {allergen}
              </span>
            </label>
          ))}
        </div>

        <div className="flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 
                     dark:text-gray-400 dark:hover:text-gray-200"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-red-600 text-white rounded-md 
                     hover:bg-red-700 focus:outline-none focus:ring-2 
                     focus:ring-red-500 focus:ring-offset-2"
          >
            Save Preferences
          </button>
        </div>
      </div>
    </div>
  );
}