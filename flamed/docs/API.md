# API Documentation

## API Design Principles

This API follows RESTful conventions with consistent response formats, proper HTTP status codes, and standardized error handling.

### Response Format

All successful responses follow this structure:

```json
{
  "data": [...],           // The main response data
  "meta": {                // Metadata about the response
    "total": 100,          // Total items available
    "limit": 20,           // Items per page
    "offset": 0,           // Current offset
    "hasMore": true        // Whether more items exist
  },
  "filters": {...}         // Applied filters (for filtered endpoints)
}
```

### Error Format

All error responses include:

```json
{
  "error": "Human readable error message",
  "code": "MACHINE_READABLE_ERROR_CODE"
}
```

## Authentication Endpoints

### Sessions (Login/Logout)

- `POST /api/auth/sessions` - Create session (login)
- `DELETE /api/auth/sessions` - Destroy session (logout)  
- `GET /api/auth/sessions` - Get current session info

### Users (Registration)

- `POST /api/auth/users` - Create new user (register)

## Restaurant Endpoints

### Main Resource

- `GET /api/restaurants` - List restaurants with simple filters
- `POST /api/restaurants` - List restaurants with complex filters

**Query Parameters (GET):**
- `minRating`, `maxRating` - Rating range (0-5)
- `city` - City name (partial match)
- `search` - Restaurant name search
- `cuisineAny[]` - Any of these cuisines
- `cuisineAll[]` - All of these cuisines  
- `priceTag[]` - Price tags ($, $$, etc.)
- `activeOnly` - Only active restaurants (default: true)
- `sortBy` - Sort field (rating, reviews, name, random)
- `sortOrder` - Sort direction (asc, desc)
- `limit`, `offset` - Pagination

**Request Body (POST):**
```json
{
  "filters": {
    "minRating": 4.0,
    "city": "Reykjavik",
    "cuisinesAny": ["Italian", "Mexican"],
    "activeOnly": true
  },
  "pagination": {
    "limit": 20,
    "offset": 0
  }
}
```

### Search

- `GET /api/restaurants/search?q=pizza` - Simple search
- `POST /api/restaurants/search` - Advanced search with filters

### Metadata

- `GET /api/restaurants/meta/cuisines` - Available cuisines
- `GET /api/restaurants/meta/price-tags` - Available price tags

## Groups Endpoints

### Main Resource

- `GET /api/groups` - List user's groups
- `POST /api/groups` - Create new group

### Group Details

- `GET /api/groups/[id]/messages` - Get group messages
- `POST /api/groups/[id]/messages` - Send message
- `GET /api/groups/[id]/invites` - Get group invites

### Group Actions

- `POST /api/groups/redeem` - Redeem invite code

## HTTP Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request (client error)
- `401` - Unauthorized
- `404` - Not Found
- `409` - Conflict (e.g., email already exists)
- `422` - Unprocessable Entity (validation error)
- `500` - Internal Server Error

## Error Codes

### Authentication
- `UNAUTHORIZED` - Authentication required
- `INVALID_CREDENTIALS` - Wrong email/password
- `EMAIL_ALREADY_EXISTS` - Registration with existing email
- `MISSING_CREDENTIALS` - Email or password not provided

### Validation
- `MISSING_REQUIRED_FIELDS` - Required fields not provided
- `INVALID_INPUT_TYPE` - Wrong data type
- `INVALID_EMAIL_FORMAT` - Malformed email
- `PASSWORD_TOO_SHORT` - Password less than 6 characters

### Business Logic
- `RESTAURANT_FETCH_ERROR` - Error fetching restaurants
- `SEARCH_ERROR` - Search operation failed
- `GROUP_CREATION_FAILED` - Could not create group
- `MISSING_SEARCH_QUERY` - Search query required

### System
- `INTERNAL_ERROR` - Unexpected server error
- `DATABASE_ERROR` - Database operation failed

## Migration Guide

### From Old Auth Endpoints

**Old:**
```javascript
// POST /api/auth/signin
fetch('/api/auth/signin', {
  method: 'POST',
  body: JSON.stringify({ email, password })
})

// POST /api/auth/signout  
fetch('/api/auth/signout', { method: 'POST' })
```

**New:**
```javascript
// POST /api/auth/sessions
fetch('/api/auth/sessions', {
  method: 'POST', 
  body: JSON.stringify({ email, password })
})

// DELETE /api/auth/sessions
fetch('/api/auth/sessions', { method: 'DELETE' })
```

### From Old Restaurant Endpoints

**Old:**
```javascript
// Multiple separate endpoints
fetch('/api/restaurants/filter/rating?min=4&max=5')
fetch('/api/restaurants/filter/search', { method: 'POST', ... })
```

**New:**
```javascript
// Single unified endpoint
fetch('/api/restaurants', {
  method: 'POST',
  body: JSON.stringify({
    filters: { minRating: 4, maxRating: 5, ... }
  })
})

// Or simple search
fetch('/api/restaurants/search?q=pizza&city=reykjavik')
```