# Netlify Deployment Guide - Emergency Response System

## 🚀 Problem Solved
The "page not found" error and missing `index.html` issue has been resolved by:
- Converting Next.js to **static export mode** (no Node.js runtime needed)
- Creating all static HTML files in the `frontend/out` directory
- Adding proper Netlify configuration

## 📋 Step-by-Step Deployment to Netlify

### Step 1: Prepare Your Repository
Everything is already configured in GitHub:
- ✅ `netlify.toml` - Netlify build configuration
- ✅ `next.config.js` - Next.js static export settings
- ✅ Static files in `frontend/out/` ready to deploy

### Step 2: Connect to Netlify

**Option A: Connect via GitHub (Recommended)**
1. Go to https://app.netlify.com
2. Click "Add new site" → "Import an existing project"
3. Select "GitHub"
4. Choose your repository: `emergency-response-system`
5. Configure build settings:
   - **Build command**: `cd frontend && npm run build`
   - **Publish directory**: `frontend/out`
6. Click "Deploy site"

**Option B: Deploy Manually**
1. Go to https://app.netlify.com
2. Drag and drop the `frontend/out` folder
3. Wait for deployment to complete

### Step 3: Environment Variables
Set environment variables in Netlify dashboard:
1. Go to "Site settings" → "Build & deploy" → "Environment"
2. Add the following variables:

```
NEXT_PUBLIC_API_BASE=https://your-backend-api.com
```

Replace `https://your-backend-api.com` with your actual backend URL (see Step 4)

### Step 4: Deploy Your Backend
The backend needs to be hosted separately on a Node.js platform:

**Option A: Railway.app (Easiest)**
1. Go to https://railway.app
2. Click "New Project" → "Deploy from GitHub"
3. Select the `emergency-response-system` repository
4. Railway auto-detects the backend
5. Add environment variables if needed
6. Deploy and get your API URL (e.g., `https://your-app.up.railway.app`)

**Option B: Render.com**
1. Go to https://render.com
2. Create new "Web Service" from GitHub
3. Set build command: `cd backend && npm install`
4. Set start command: `cd backend && node src/index.js`
5. Deploy and get your API URL

**Option C: Heroku (Free tier limited)**
1. Go to https://www.heroku.com/
2. Create new app and connect GitHub repository
3. Set start command in Procfile
4. Deploy

### Step 5: Update API Base URL
After backend deployment:
1. Copy your backend API URL (e.g., `https://your-api.up.railway.app`)
2. Go to Netlify site settings
3. Add/update environment variable:
   ```
   NEXT_PUBLIC_API_BASE=https://your-api.up.railway.app
   ```
4. Trigger a new deployment

### Step 6: Verify Deployment
Once deployed:
- ✅ Visit your Netlify URL to see the home page
- ✅ Click emergency buttons (Fire, Medical, Crime)
- ✅ Verify camera feature works (Take Photo button)
- ✅ Test voice recording
- ✅ Check file uploads
- ✅ Visit `/admin` for admin dashboard
- ✅ Visit `/reports` for reports archive

## 📁 What Gets Deployed

```
frontend/out/
├── index.html              (Home - Camera feature included)
├── admin/index.html        (Admin dashboard)
├── reports/index.html      (Reports archive with export)
├── user/index.html         (User page)
├── 404.html                (Error page)
└── _next/                  (JavaScript, CSS, fonts)
    ├── static/
    ├── chunks/
    └── ...
```

## 🔧 Local Testing Before Deployment

Test the static build locally:
```bash
cd frontend
npm run build      # Creates frontend/out/
npx serve out      # Serve locally on port 3000
```

## 🎯 Features Now Deployed

- ✅ Emergency alert submission with Fire/Medical/Crime types
- ✅ **NEW: Camera feature** - Users can take photos directly
- ✅ Voice message recording and playback
- ✅ Media upload (images, videos)
- ✅ GPS location tracking
- ✅ Real-time admin dashboard
- ✅ Reports archive with filtering and export (CSV/JSON/PDF)
- ✅ Responsive mobile-friendly UI
- ✅ Material Design icons

## 🐛 Troubleshooting

### "Page not found" error
→ Caused by old deployment. Clear cache and redeploy.

### Camera not working
→ Ensure `NEXT_PUBLIC_API_BASE` is set in Netlify environment.

### Images/media not showing
→ Check that backend is running and `NEXT_PUBLIC_API_BASE` URL is correct.

### Build fails
→ Check Netlify build logs: Site settings → Deploys → View build log

## 📞 Support
- Netlify docs: https://docs.netlify.com/
- Next.js static export: https://nextjs.org/docs/advanced-features/static-html-export
- GitHub repo: https://github.com/kojowallet01/emergency-response-system

---
**Last Updated**: April 10, 2026  
**System**: Emergency Response System with Camera Feature  
**Status**: ✅ Ready for Netlify Deployment
