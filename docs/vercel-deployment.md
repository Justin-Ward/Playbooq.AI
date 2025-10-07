# Vercel Deployment Guide for Playbooq.AI

## Overview
This guide will help you deploy the Playbooq.AI landing page to Vercel for public access while keeping development features private.

## Pre-Deployment Setup

### 1. Environment Variables for Production
Create a `.env.production` file with minimal required variables:

```env
# Minimal required for landing page
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_key
CLERK_SECRET_KEY=your_clerk_secret

# Optional - for future features
# NEXT_PUBLIC_SUPABASE_URL=
# NEXT_PUBLIC_SUPABASE_ANON_KEY=
# ANTHROPIC_API_KEY=
```

### 2. Remove Development Dependencies
The current setup includes many development dependencies that aren't needed for the landing page:

```bash
# These can be removed for production landing page:
npm uninstall @tiptap/react @tiptap/starter-kit @tiptap/extension-color
npm uninstall @tiptap/extension-text-style @tiptap/extension-highlight
npm uninstall @tiptap/extension-underline @tiptap/extension-text-align
npm uninstall @tiptap/extension-placeholder @tiptap/extension-link
npm uninstall pdf-parse mammoth formidable
npm uninstall @anthropic-ai/sdk isomorphic-dompurify
```

## Vercel Deployment Steps

### 1. Connect to Vercel
1. Go to [vercel.com](https://vercel.com)
2. Sign up/Login with GitHub
3. Click "New Project"
4. Import your GitHub repository

### 2. Configure Build Settings
- **Framework Preset**: Next.js
- **Root Directory**: `./` (default)
- **Build Command**: `npm run build`
- **Output Directory**: `.next` (default)

### 3. Environment Variables
Add these in Vercel dashboard:
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`

### 4. Deploy
- Click "Deploy"
- Vercel will automatically build and deploy

## Current Routing Setup

### Public Pages (Available)
- `/` - Landing page ✅
- `/coming-soon` - Coming soon page ✅

### Development Pages (Redirected to Coming Soon)
- `/playbooks` → `/coming-soon`
- `/marketplace` → `/coming-soon`
- `/sign-in` → `/coming-soon`
- `/sign-up` → `/coming-soon`

## Post-Deployment

### 1. Custom Domain (Optional)
1. In Vercel dashboard, go to Project Settings
2. Click "Domains"
3. Add your custom domain
4. Update DNS records as instructed

### 2. Analytics (Optional)
Enable Vercel Analytics for visitor insights:
1. Go to Project Settings
2. Enable Analytics
3. Add analytics code to track page views

## Development vs Production

### For Development
- Keep all dependencies
- Use full environment variables
- Access `/playbooks` for development

### For Production
- Minimal dependencies
- Only essential environment variables
- All feature links redirect to `/coming-soon`

## Switching Between Modes

To switch back to development mode:
1. Revert the link changes in `app/page.tsx` and `components/Navbar.tsx`
2. Change `/coming-soon` back to `/playbooks` and `/marketplace`
3. Reinstall development dependencies

## Benefits of This Setup

✅ **Clean Landing Page**: Professional landing page for visitors
✅ **Development Continuity**: Continue building features privately
✅ **Email Collection**: Capture interest before launch
✅ **SEO Ready**: Optimized for search engines
✅ **Fast Loading**: Minimal dependencies for quick load times
✅ **Professional**: Builds anticipation and credibility

## Next Steps

1. Deploy to Vercel using this guide
2. Share the landing page URL
3. Continue development on local/staging environment
4. When ready, switch links back to actual features
5. Update environment variables for full functionality
