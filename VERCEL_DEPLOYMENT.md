# Vercel Deployment Configuration

## Project Settings

When importing your GitHub repository to Vercel, use these exact settings:

### Basic Configuration

| Field | Value |
|-------|-------|
| **Vercel Team** | Hobby (or your team name) |
| **Project Name** | `vef-2-lokaverkefni` (or your preferred name) |
| **Framework Preset** | Next.js |
| **Root Directory** | `flamed` |
| **Build Command** | `npm run build` (default) |
| **Output Directory** | `.next` (default) |
| **Install Command** | `npm install` (default) |

### Important: Root Directory

**You MUST set the Root Directory to `flamed`** because your Next.js app is in a subdirectory, not at the repository root.

## Environment Variables

Add these three environment variables in Vercel → Settings → Environment Variables:

### Required Variables

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
GOOGLE_MAPS_API_KEY=AIzaSy...
```

### How to Add Environment Variables in Vercel

1. Go to your project in Vercel
2. Click **Settings** → **Environment Variables**
3. Add each variable:
   - **Key**: Variable name (e.g., `NEXT_PUBLIC_SUPABASE_URL`)
   - **Value**: Your actual value
   - **Environment**: Select all (Production, Preview, Development)
4. Click **Save**

### Where to Find Your Values

- **NEXT_PUBLIC_SUPABASE_URL**: Supabase Dashboard → Settings → API → Project URL
- **NEXT_PUBLIC_SUPABASE_ANON_KEY**: Supabase Dashboard → Settings → API → Project API keys → anon/public key
- **GOOGLE_MAPS_API_KEY**: Google Cloud Console → APIs & Services → Credentials

## Quick Paste Method

You can also paste your entire `.env.local` file content into the environment variables form in Vercel:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
GOOGLE_MAPS_API_KEY=AIzaSy...
```

Vercel will automatically parse and populate the form.

## Build Fixes Applied

All build errors have been fixed:

✅ Removed deprecated `appDir` config (no longer needed in Next.js 15)
✅ Fixed unescaped apostrophe in `app/groups/page.tsx`
✅ Replaced `<img>` tags with Next.js `<Image>` component in `app/profile/page.tsx`
✅ Fixed `<a>` tag to use `<Link>` in `components/Navbar.js`
✅ Added ESLint suppression for stable useEffect dependency
✅ Added `api.dicebear.com` to allowed image domains

## Deployment Process

1. **Connect Repository**: Import `NidaleNieve/Vef-2-Lokaverkefni` from GitHub
2. **Configure Root**: Set Root Directory to `flamed`
3. **Add Environment Variables**: Copy the 3 required variables
4. **Deploy**: Click "Deploy"

After deployment, every push to `main` (or `hosted`) branch will automatically trigger a new deployment.

## Testing Locally Before Deploy

```bash
cd flamed
npm run build
npm start
```

Visit http://localhost:3000 to verify everything works.

## Troubleshooting

### Build fails with "Module not found"
- Ensure Root Directory is set to `flamed`
- Check that all dependencies are in `flamed/package.json`

### Runtime errors about missing env vars
- Verify all 3 environment variables are set in Vercel
- Make sure variables are enabled for Production environment

### Images not loading
- Check that image domains are configured in `next.config.mjs`
- Currently allowed: `dynamic-media-cdn.tripadvisor.com`, `api.dicebear.com`

## Post-Deployment

Once deployed, Vercel will provide:
- **Production URL**: `https://your-project.vercel.app`
- **Preview URLs**: For each pull request
- **Analytics**: View performance metrics in Vercel dashboard

You can also set up a custom domain in Vercel → Settings → Domains.
