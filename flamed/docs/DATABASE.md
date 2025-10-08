# Database Schema Documentation

## Authentication & Users

### `public.admins`
| Column     | Type                     | Constraints / Default             |
| ---------- | ------------------------ | --------------------------------- |
| user_id    | uuid                     | **PK**; **FK** → `auth.users(id)` |
| created_at | timestamp with time zone | DEFAULT `now()`                   |

### `public.profiles`
| Column     | Type                     | Constraints / Default             |
| ---------- | ------------------------ | --------------------------------- |
| id         | uuid                     | **PK**; **FK** → `auth.users(id)` |
| full_name  | text                     |                                   |
| avatar_url | text                     |                                   |
| created_at | timestamp with time zone | DEFAULT `now()`                   |
| updated_at | timestamp with time zone | DEFAULT `now()`                   |

## Groups & Social Features

### `public.groups`
| Column     | Type                     | Constraints / Default                     |
| ---------- | ------------------------ | ----------------------------------------- |
| id         | uuid                     | **PK**; DEFAULT `gen_random_uuid()`       |
| name       | text                     | NOT NULL; CHECK `2 <= length(name) <= 80` |
| created_by | uuid                     | **FK** → `auth.users(id)`                 |
| created_at | timestamp with time zone | DEFAULT `now()`                           |

### `public.group_members`
| Column     | Type                     | Constraints / Default                                                   |
| ---------- | ------------------------ | ----------------------------------------------------------------------- |
| group_id   | uuid                     | **PK (composite)**; **FK** → `public.groups(id)`                        |
| user_id    | uuid                     | **PK (composite)**; **FK** → `auth.users(id)`                           |
| role       | text                     | NOT NULL; DEFAULT `'member'`; CHECK `role ∈ {'owner','admin','member'}` |
| joined_at  | timestamp with time zone | DEFAULT `now()`                                                         |
| created_at | timestamp with time zone | NOT NULL; DEFAULT `now()`                                               |

### `public.group_invites`
| Column     | Type                     | Constraints / Default                          |
| ---------- | ------------------------ | ---------------------------------------------- |
| id         | uuid                     | **PK**; DEFAULT `gen_random_uuid()`            |
| group_id   | uuid                     | **FK** → `public.groups(id)`                   |
| code_hash  | text                     | NOT NULL                                       |
| max_uses   | integer                  | NOT NULL; DEFAULT `1`; CHECK `max_uses >= 1`   |
| used_count | integer                  | NOT NULL; DEFAULT `0`; CHECK `used_count >= 0` |
| expires_at | timestamp with time zone |                                                |
| created_by | uuid                     | **FK** → `auth.users(id)`                      |
| created_at | timestamp with time zone | DEFAULT `now()`                                |

### `public.group_messages`
| Column       | Type                     | Constraints / Default                                                  |
| ------------ | ------------------------ | ---------------------------------------------------------------------- |
| id           | bigint                   | **PK**; DEFAULT `nextval('group_messages_id_seq'::regclass)`           |
| group_id     | uuid                     | NOT NULL; **FK** → `public.groups(id)`                                 |
| user_id      | uuid                     | NOT NULL; **FK** → `auth.users(id)`                                    |
| content      | text                     | NOT NULL; CHECK `length(content) > 0 AND length(content) <= 4000`      |
| created_at   | timestamp with time zone | DEFAULT `now()`                                                        |
| edited_at    | timestamp with time zone |                                                                        |
| author_alias | text                     | CHECK `author_alias IS NULL OR 1 <= length(btrim(author_alias)) <= 40` |

## Restaurants & Location Data

### `public.restaurants`
| Column             | Type              | Constraints / Default               |
| ------------------ | ----------------- | ----------------------------------- |
| id                 | uuid              | **PK**; DEFAULT `gen_random_uuid()` |
| name               | character varying | NOT NULL                            |
| is_active          | boolean           | DEFAULT `true`                      |
| created_at         | timestamp with tz | DEFAULT `CURRENT_TIMESTAMP`         |
| updated_at         | timestamp with tz | DEFAULT `CURRENT_TIMESTAMP`         |
| external_id        | text              | UNIQUE                              |
| location_id        | bigint            |                                     |
| avg_rating         | numeric           |                                     |
| review_count       | integer           |                                     |
| status             | text              |                                     |
| status_text        | text              |                                     |
| price_tag          | text              |                                     |
| cuisines           | ARRAY             | (element type unspecified)          |
| has_menu           | boolean           |                                     |
| menu_url           | text              |                                     |
| parent_city        | text              |                                     |
| hero_img_url       | text              |                                     |
| square_img_url     | text              |                                     |
| thumbnail_template | text              |                                     |
| review_snippets    | jsonb             |                                     |
| raw                | jsonb             |                                     |

### `public.restaurant_geo`
| Column            | Type                     | Constraints / Default                     |
| ----------------- | ------------------------ | ----------------------------------------- |
| restaurant_id     | uuid                     | **PK**; **FK** → `public.restaurants(id)` |
| lat               | double precision         | NOT NULL                                  |
| lng               | double precision         | NOT NULL                                  |
| place_id          | text                     |                                           |
| formatted_address | text                     |                                           |
| provider          | text                     | DEFAULT `'google'`                        |
| accuracy          | text                     |                                           |
| updated_at        | timestamp with time zone | DEFAULT `now()`                           |
| geom              | USER-DEFINED             | (likely geometry)                         |


## Integrations

### Cron
Allows the database to automatically run scheduled tasks.

### GraphQL
Provides a modern API interface that lets applications request exact data.
### Vault
Securely stores and manages sensitive information behind authorization.


## Extensions

### uuid-ossp
Generates unique identifiers (UUIDs).

### pg_graphql
Automatically creates a GraphQL API from your database tables.

### pg_trgm
Enables fuzzy text searching, so users can find restaurants even with typos or partial names.

### pgcrypto
Provides encryption and password hashing functions to keep sensitive data secure.

### pg_stat_statemenets
Tracks database performance by monitoring which queries are slow or used frequently.

### postgis
Adds powerful location features like calculating distances between restaurants and users. Enables "find restaurants near me" functionality with precise geographic calculations.

### pg_cron
Schedules automated database tasks to run at specific times. Can automatically clean up old data, send notifications, or update statistics without manual intervention.

### tsm_system_rows
Provides efficient random sampling of database records.

## Geocoding Integration

The application integrates with Google Maps Geocoding API to populate restaurant location data. This is handled through a server-side API route for security.

### Prerequisites
- Supabase `restaurants` table with `id`, `name`, `parent_city` fields
- Google Maps API key configured in environment variables

### Environment Setup
```bash
# Supabase (client-side, public)
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-supabase-anon-key

# Google Maps (server-side only)
GOOGLE_MAPS_API_KEY=your-google-maps-server-key
```

### Geocoding API Endpoint
`GET /api/geocode`

**Query Parameters:**
- `limit` (number, default 20, max 50): Number of restaurants to process
- `offset` (number, default 0): Starting offset for pagination
- `active` (boolean, default true): Filter by `is_active = true`
- `id` (string): Geocode a single restaurant by ID (overrides limit/offset)

**Response Format:**
```json
{
  "items": [
    {
      "id": "<uuid>",
      "name": "Pizza Place",
      "parent_city": "Reykjavík", 
      "formatted_address": "Pizza Place, Reykjavík, Iceland",
      "place_id": "<google-place-id>",
      "lat": 64.123,
      "lng": -21.987,
      "status": "ok"
    }
  ],
  "count": 1
}
```

**Status Values:**
- `ok`: Geocoding succeeded
- `no_results`: Google returned no matches
- `skipped:missing_fields`: Missing `name` or `parent_city`
- `error`: Request error (see `error` field)

## RPC(Remote Procedure Call) Functions

### Restaurant functions

#### search_restaurants_by_radius

Searches for restaurants within a specified radius from a given location with advanced filtering options.

**Real usage example from `/app/api/restaurants/filter/search/route.ts`:**

```typescript
const { data, error } = await supa.rpc('search_restaurants_by_radius', {
  p_lat: center_lat,
  p_lng: center_lng,
  p_radius_km: radius_km,
  p_min_rating: min_rating,
  p_max_rating: max_rating,
  p_city: city,
  p_price_tags: price_tags,
  p_cuisines_any: cuisines_any,
  p_cuisines_all: cuisines_all,
  p_active_only: active_only,
  p_random: random,
  p_limit: limit,
  p_offset: offset,
})
```

#### get_random_restaurants

Retrieves a random selection of restaurants with a specified limit.

**Real usage example from `/lib/services/restaurants.ts`:**

```typescript
const { data, error } = await supa.rpc('get_random_restaurants', { p_limit: limit })
```

#### list_cuisines

Returns all available cuisine types from the restaurant database.

**Real usage example from `/app/api/restaurants/meta/cuisines/route.ts`:**

```typescript
const { data, error } = await supa.rpc('list_cuisines')
if (error) return NextResponse.json({ error: error.message }, { status: 400 })
return NextResponse.json({ items: data ?? [] }, { headers: { 'Cache-Control': 'no-store' } })
```

#### list_price_tags

Returns all available price tag categories.

**Real usage example from `/app/api/restaurants/meta/price-tags/route.ts`:**

```typescript
const { data, error } = await supa.rpc('list_price_tags')
if (error) return NextResponse.json({ error: error.message }, { status: 400 })
return NextResponse.json({ items: data ?? [] }, { headers: { 'Cache-Control': 'no-store' } })
```

#### list_restaurants_needing_geo

Returns restaurants that don't have geocoding data yet (used for admin geocoding tasks).

**Real usage example from `/app/api/admin/geo-batch/route.ts`:**

```typescript
const { data: candidates, error: listErr } = await admin.rpc('list_restaurants_needing_geo', {
  p_limit: lim, 
  p_max_age_days: maxAge
})
if (listErr) return where('rpc:list_restaurants_needing_geo', listErr)
```

### Groups

#### get_my_groups

Retrieves all groups that the current authenticated user is a member of.

**Real usage example from `/app/groups/page.tsx`:**

```typescript
const { data, error } = await supa.rpc('get_my_groups')

if (error) {
  setError(error.message)
  setGroups([])
  return
}
```

#### create_group

Creates a new group with the current user as the owner.

**Real usage example from `/app/api/groups/route.ts`:**

```typescript
const { data: groupId, error } = await supa.rpc('create_group', { 
  p_name: name.trim() 
})

if (error) {
  return NextResponse.json({ 
    error: error.message,
    // ... additional error handling
  })
}
```

#### rename_group

Updates the name of an existing group (requires admin/owner permissions).

**Real usage example from `/app/groups/page.tsx`:**

```typescript
const { data, error } = await supa.rpc('rename_group', {
  p_group_id: groupId,
  p_new_name: name,
})
```

#### create_group_invite

Creates an invitation code for a group that others can use to join.

**Real usage example from `/app/api/groups/[id]/invites/route.ts`:**

```typescript
const { data, error } = await supa.rpc('create_group_invite', {
  p_group_id: id, 
  p_max_uses: max_uses, 
  p_expires_at: expires_at
})
if (error) return NextResponse.json({ error: error.message }, { status: 400 })
return NextResponse.json({ code: data }) // raw shareable code
```

#### redeem_group_invite

Allows a user to join a group using an invitation code.

**Real usage example from `/app/api/groups/redeem/route.ts`:**

```typescript
const { data, error } = await supa.rpc('redeem_group_invite', { p_code: code })
if (error) return NextResponse.json({ error: error.message }, { status: 400 })

// Fire-and-forget: announce that the player has joined this group
const groupId = data as string | null
if (groupId && user?.id) {
  // Additional logic for group join notifications...
}
```
