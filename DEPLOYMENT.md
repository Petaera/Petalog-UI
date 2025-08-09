# Vercel Deployment Guide

## Environment Variables Setup

To fix the "no location selected" issue on Vercel, ensure these environment variables are properly set:

### Required Environment Variables

1. **VITE_SUPABASE_URL**
   - Your Supabase project URL
   - Format: `https://your-project-id.supabase.co`
   - Set this in Vercel Dashboard → Settings → Environment Variables

2. **VITE_SUPABASE_ANON_KEY**
   - Your Supabase anon/public key (NOT service role key)
   - Get this from Supabase Dashboard → Settings → API
   - Set this in Vercel Dashboard → Settings → Environment Variables

### How to Set in Vercel

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project
3. Go to Settings → Environment Variables
4. Add each variable:
   - **Name**: `VITE_SUPABASE_URL`
   - **Value**: `https://your-project-id.supabase.co`
   - **Environment**: Production, Preview, Development
5. Repeat for `VITE_SUPABASE_ANON_KEY`
6. Redeploy your application

## Vercel Configuration Fix

The error "The pattern 'src/**/*.tsx' defined in `functions` doesn't match any Serverless Functions" has been fixed by updating `vercel.json`:

- Removed unnecessary `functions` configuration (not needed for React apps)
- Added proper build configuration for Vite
- Added SPA routing support with `rewrites`

## Build and Deploy

### Step 1: Build Locally (Optional)
```bash
npm run build
# or
npm run build:prod
```

### Step 2: Deploy to Vercel
```bash
# If using Vercel CLI
vercel --prod

# Or push to your connected Git repository
git add .
git commit -m "Fix Vercel configuration and environment variables"
git push origin main
```

### Step 3: Verify Deployment
1. Check that the build completes without the functions error
2. Verify environment variables are loaded correctly
3. Test location selection functionality

## Common Issues

- **Missing Variables**: If either variable is missing, the app falls back to hardcoded values
- **Wrong Values**: Ensure you're using the correct Supabase project credentials
- **Environment Mismatch**: Make sure variables are set for all environments (Production, Preview, Development)
- **Functions Error**: This was caused by incorrect `vercel.json` configuration - now fixed

## Testing

After fixing environment variables and configuration:
1. Redeploy your application
2. Clear browser cache and localStorage
3. Test with both owner and manager accounts
4. Check browser console for any remaining errors
5. Use the debug panel to verify environment status

## Troubleshooting

If you still see issues after fixing the configuration:

1. **Check Build Logs**: Look for any build errors in Vercel dashboard
2. **Verify Environment Variables**: Use the debug panel to confirm they're loaded
3. **Check Network Tab**: Look for failed Supabase requests
4. **Console Errors**: Check for any JavaScript errors in browser console

## Debug Tools

The app now includes enhanced debugging:
- **Debug Panel**: Shows environment status and user information
- **Enhanced Logging**: Detailed console logs for location fetching
- **Environment Validation**: Automatic checks for missing variables
