// Test data to demonstrate allergen functionality
// This simulates restaurant data with cuisines that would come from the database

export const testRestaurants = [
  {
    id: '1',
    name: 'Sunny Side Bistro',
    parent_city: 'Reykjavík',
    avg_rating: 4.5,
    review_count: 123,
    cuisines: ['American', 'Brunch', 'Cafe'],
    hero_img_url: '/api/placeholder/300/400',
    square_img_url: '/api/placeholder/300/300'
  },
  {
    id: '2',
    name: 'Little Italy',
    parent_city: 'Reykjavík',
    avg_rating: 4.3,
    review_count: 89,
    cuisines: ['Italian', 'European'],
    hero_img_url: '/api/placeholder/300/400',
    square_img_url: '/api/placeholder/300/300'
  },
  {
    id: '3',
    name: 'Sushi Master',
    parent_city: 'Reykjavík',
    avg_rating: 4.8,
    review_count: 156,
    cuisines: ['Japanese', 'Sushi'],
    hero_img_url: '/api/placeholder/300/400',
    square_img_url: '/api/placeholder/300/300'
  },
  {
    id: '4',
    name: 'Spice Route',
    parent_city: 'Reykjavík',
    avg_rating: 4.2,
    review_count: 78,
    cuisines: ['Indian', 'Asian'],
    hero_img_url: '/api/placeholder/300/400',
    square_img_url: '/api/placeholder/300/300'
  },
  {
    id: '5',
    name: 'Ocean Catch',
    parent_city: 'Reykjavík',
    avg_rating: 4.6,
    review_count: 92,
    cuisines: ['Seafood', 'Mediterranean'],
    hero_img_url: '/api/placeholder/300/400',
    square_img_url: '/api/placeholder/300/300'
  }
];

// Expected allergen mappings for the test restaurants:
// Sunny Side Bistro (American, Brunch, Cafe) -> dairy, gluten, eggs, nuts
// Little Italy (Italian, European) -> dairy, gluten, eggs, nuts
// Sushi Master (Japanese, Sushi) -> soy, fish, shellfish, eggs
// Spice Route (Indian, Asian) -> dairy, nuts, gluten, legumes
// Ocean Catch (Seafood, Mediterranean) -> fish, shellfish, nuts, dairy, gluten