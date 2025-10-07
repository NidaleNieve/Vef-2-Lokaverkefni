This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.js`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.


## Data accessible in supabase
### Restuarants
| Name | Format | type |
|---| ---| --- |
| id | uuid | string |
| name | varchar | string |
| is_active | boolean | boolean |
| created_at | timestamp with time zone | string | 
| updated_at | timestamp with time zone | string |
| external_id | text | string |
| location_id | bigint | number |
| avg_rating | numeric | number |
| review_count | integer | number |
| status | text | string |
| status_text | text | string |
| price_tag | text | string |
| cuisines | text[] | array |
| has_menu | boolean | boolean |
| menu_url | text | string |
| parent_city | text | string |
| hero_img_url | text | string |
| square_img_url | text | string |
| thumbnail_template | text | string |
| review_snippets | jsonb | json |
| raw | jsonb | json |

## Get location data (Google Maps Geocoding)

Use the server API route to geocode restaurants by combining their `name` and `parent_city` via the Google Maps Geocoding API.

### 1) Prerequisites
- Supabase `restaurants` table has `id`, `name`, `parent_city` (and optionally `is_active`).
- Add env vars in `./.env.local` (don’t commit this file):

```bash
# Supabase (client-side, public)
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-supabase-anon-key

# Google Maps (server-side only)
GOOGLE_MAPS_API_KEY=your-google-maps-server-key
```

### 2) Start the dev server
Run `npm run dev` and open http://localhost:3000.

### 3) Call the geocoding endpoint
GET `/api/geocode`

Query params:
- `limit` (number, default 20, max 50)
- `offset` (number, default 0)
- `active` (boolean, default true) – filters `is_active = true`
- `id` (string) – geocode a single restaurant by id (overrides limit/offset)

Examples:
- `/api/geocode` – first 20 active restaurants
- `/api/geocode?limit=50&offset=0` – first 50 active restaurants
- `/api/geocode?active=false` – include inactive rows too
- `/api/geocode?id=<uuid>` – single row by id

### 4) Response shape

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

Status values:
- `ok` – geocoding succeeded
- `no_results` – Google returned no matches
- `skipped:missing_fields` – missing `name` or `parent_city`
- `error` – request error (see `error` field)

Notes:
- The endpoint returns lat/lng but does not store them. If you want persistence, add a follow-up update step/server action.
- Ensure Geocoding API is enabled and billing is set on your Google Cloud project. The route uses small concurrency (5) per request to be polite to quotas.
- Keep `GOOGLE_MAPS_API_KEY` server-only. Do not expose it on the client.