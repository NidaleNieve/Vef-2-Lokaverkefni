// Test script to verify allergen functionality
import { getAllergensFromCuisines, getAllergenDescriptions } from './utils/allergenMapping.js';
import { testRestaurants } from './utils/testData.js';

console.log('Testing Allergen Detection Functionality\n');

testRestaurants.forEach(restaurant => {
  console.log(`\n=== ${restaurant.name} ===`);
  console.log(`Cuisines: ${restaurant.cuisines.join(', ')}`);
  
  const allergens = getAllergensFromCuisines(restaurant.cuisines);
  console.log(`Detected Allergens: ${allergens.join(', ') || 'None'}`);
  
  if (allergens.length > 0) {
    const descriptions = getAllergenDescriptions(allergens);
    console.log('Descriptions:');
    descriptions.forEach(desc => {
      console.log(`  - ${desc.name}: ${desc.description}`);
    });
  }
});

console.log('\n=== Testing User Matching ===');
const mockUserAllergens = ['dairy', 'nuts', 'fish'];
console.log(`Mock user has allergens: ${mockUserAllergens.join(', ')}`);

testRestaurants.forEach(restaurant => {
  const potentialAllergens = getAllergensFromCuisines(restaurant.cuisines);
  const matches = potentialAllergens.filter(allergen => mockUserAllergens.includes(allergen));
  
  if (matches.length > 0) {
    console.log(`⚠️  ${restaurant.name}: WARNING - Contains ${matches.join(', ')}`);
  } else {
    console.log(`✅ ${restaurant.name}: Safe`);
  }
});