/**
 * Server-side function to interpret potential allergens based on cuisine type
 * Used to add allergen warnings to restaurant cards based on common ingredients in different cuisines
 */

const CUISINE_ALLERGEN_MAPPING = {
  // European cuisines
  'European': ['dairy', 'gluten', 'eggs', 'nuts'],
  'Italian': ['dairy', 'gluten', 'eggs', 'nuts'],
  'French': ['dairy', 'gluten', 'eggs', 'shellfish', 'nuts'],
  'German': ['dairy', 'gluten', 'eggs', 'nuts'],
  'Spanish': ['shellfish', 'fish', 'nuts', 'eggs'],
  
  // Asian cuisines
  'Chinese': ['soy', 'shellfish', 'fish', 'eggs', 'nuts'],
  'Japanese': ['soy', 'fish', 'shellfish', 'eggs'],
  'Thai': ['fish', 'shellfish', 'nuts', 'soy'],
  'Indian': ['dairy', 'nuts', 'gluten', 'legumes'],
  'Korean': ['soy', 'fish', 'shellfish', 'eggs'],
  'Vietnamese': ['fish', 'shellfish', 'soy', 'nuts'],
  
  // American cuisines
  'American': ['dairy', 'gluten', 'eggs', 'nuts'],
  'Mexican': ['gluten', 'dairy', 'nuts'],
  'Tex-Mex': ['gluten', 'dairy', 'nuts'],
  
  // Mediterranean
  'Mediterranean': ['nuts', 'fish', 'dairy', 'gluten'],
  'Greek': ['dairy', 'fish', 'nuts', 'gluten'],
  'Turkish': ['nuts', 'dairy', 'gluten'],
  
  // Middle Eastern
  'Middle Eastern': ['nuts', 'legumes', 'gluten'],
  'Lebanese': ['nuts', 'legumes', 'gluten'],
  
  // Seafood focused
  'Seafood': ['fish', 'shellfish'],
  'Sushi': ['fish', 'soy', 'shellfish'],
  
  // Bakery/Desserts
  'Bakery': ['gluten', 'dairy', 'eggs', 'nuts'],
  'Desserts': ['dairy', 'eggs', 'nuts', 'gluten'],
  
  // Fast food
  'Fast Food': ['gluten', 'dairy', 'eggs', 'soy'],
  'Burgers': ['gluten', 'dairy', 'eggs', 'soy'],
  'Pizza': ['dairy', 'gluten'],
  
  // Other common categories
  'Vegetarian': ['nuts', 'dairy', 'gluten', 'soy'],
  'Vegan': ['nuts', 'gluten', 'soy'],
  'Brunch': ['eggs', 'dairy', 'gluten', 'nuts'],
  'Cafe': ['dairy', 'gluten', 'nuts'],
  'Steakhouse': ['dairy', 'gluten']
};

/**
 * Get potential allergens based on restaurant cuisines
 * @param {Array<string>} cuisines - Array of cuisine types for a restaurant
 * @returns {Array<string>} - Array of potential allergens
 */
export function getAllergensFromCuisines(cuisines) {
  if (!cuisines || !Array.isArray(cuisines)) {
    return [];
  }
  
  const allergenSet = new Set();
  
  cuisines.forEach(cuisine => {
    const normalizedCuisine = cuisine.trim();
    
    // Direct match
    if (CUISINE_ALLERGEN_MAPPING[normalizedCuisine]) {
      CUISINE_ALLERGEN_MAPPING[normalizedCuisine].forEach(allergen => 
        allergenSet.add(allergen)
      );
      return;
    }
    
    // Partial matches for compound cuisine names
    Object.keys(CUISINE_ALLERGEN_MAPPING).forEach(mappedCuisine => {
      if (normalizedCuisine.toLowerCase().includes(mappedCuisine.toLowerCase()) ||
          mappedCuisine.toLowerCase().includes(normalizedCuisine.toLowerCase())) {
        CUISINE_ALLERGEN_MAPPING[mappedCuisine].forEach(allergen => 
          allergenSet.add(allergen)
        );
      }
    });
  });
  
  return Array.from(allergenSet);
}

export default { getAllergensFromCuisines };