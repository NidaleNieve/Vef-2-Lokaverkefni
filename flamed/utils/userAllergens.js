/**
 * Temporary utility for managing user allergen preferences
 * In a production app, this would be stored in user profiles in the database
 */

const STORAGE_KEY = 'user_allergens';

/**
 * Get user's allergen preferences from localStorage
 * @returns {Array<string>} Array of allergens the user has marked as having
 */
export function getUserAllergens() {
  if (typeof window === 'undefined') {
    return []; // Server-side rendering fallback
  }
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Error reading user allergens from localStorage:', error);
    return [];
  }
}

/**
 * Set user's allergen preferences in localStorage
 * @param {Array<string>} allergens - Array of allergen identifiers
 */
export function setUserAllergens(allergens) {
  if (typeof window === 'undefined') {
    return; // Server-side rendering fallback
  }
  
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(allergens));
  } catch (error) {
    console.error('Error saving user allergens to localStorage:', error);
  }
}

/**
 * Check if user has any of the specified allergens
 * @param {Array<string>} potentialAllergens - Allergens to check against
 * @returns {Array<string>} Array of matching allergens the user has
 */
export function getMatchingUserAllergens(potentialAllergens) {
  const userAllergens = getUserAllergens();
  return potentialAllergens.filter(allergen => 
    userAllergens.includes(allergen)
  );
}

/**
 * Available allergen options for the user to select from
 */
export const AVAILABLE_ALLERGENS = [
  'dairy',
  'gluten', 
  'nuts',
  'eggs',
  'soy',
  'fish',
  'shellfish',
  'legumes',
  'sesame'
];

export default { 
  getUserAllergens, 
  setUserAllergens, 
  getMatchingUserAllergens, 
  AVAILABLE_ALLERGENS 
};