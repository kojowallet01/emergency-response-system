# 🚀 Deploy to Netlify

## Why Netlify?

✅ **HTTPS by default** - Safari will allow location access!  
✅ **Free hosting** - No credit card required  
✅ **Automatic deployments** - Push to Git and it deploys  
✅ **Custom domain** - Get a `.netlify.app` domain  
✅ **Fast CDN** - Global content delivery  

## 📋 Prerequisites

1. **GitHub Account** (or GitLab/Bitbucket)
2. **Netlify Account** (free) - Sign up at https://netlify.com

## 🎯 Deployment Steps

### Step 1: Push Code to GitHub

1. **Initialize Git** (if not already done):
```bash
cd frontend
git init
git add .
git commit -m "Initial commit - Emergency Response System"
```

2. **Create GitHub Repository**:
   - Go to https://github.com/new
   - Name: `emergency-response-system`
   - Make it **Private** (recommended)
   - Don't initialize with README
   - Click "Create repository"

3. **Push to GitHub**:
```bash
git remote add origin https://github.com/YOUR_USERNAME/emergency-response-system.git
git branch -M main
git push -u origin main
```

### Step 2: Deploy on Netlify

#### Option A: Netlify Dashboard (Recommended)

1. **Go to Netlify**: https://app.netlify.com
2. **Sign in** with GitHub
3. **Click "Add new site"** → "Import an existing project"
4. **Choose GitHub** and authorize Netlify
5. **Select your repository**: `emergency-response-system`
6. **Configure build settings**:
   - **Base directory**: `frontend`
   - **Build command**: `npm run build`
   - **Publish directory**: `.next`
   - **Click "Show advanced"** → "New variable"
   
7. **Add Environment Variables**:
   ```
   NEXT_PUBLIC_SUPABASE_URL = https://gwsuuowozacvqfhvgstm.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY = [your anon key from .env]
   ```

8. **Click "Deploy site"**

#### Option B: Netlify CLI (Alternative)

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login to Netlify
netlify login

# Deploy from frontend folder
cd frontend
netlify deploy --prod
```

### Step 3: Configure Environment Variables

After deployment, add your Supabase credentials:

1. **In Netlify Dashboard**:
   - Go to **Site settings** → **Environment variables**
   - Click **Add a variable**

2. **Add these variables**:
   ```
   NEXT_PUBLIC_SUPABASE_URL
   Value: https://gwsuuowozacvqfhvgstm.supabase.co

   NEXT_PUBLIC_SUPABASE_ANON_KEY
   Value: [copy from frontend/.env file]
   ```

3. **Trigger redeploy**:
   - Go to **Deploys** tab
   - Click **Trigger deploy** → **Deploy site**

### Step 4: Test on iPhone

1. **Get your Netlify URL**:
   - Example: `https://your-site-name.netlify.app`

2. **Open on iPhone**:
   ```
   https://your-site-name.netlify.app/responder
   ```

3. **Login with**: `FIRE001`

4. **Tap "START TRACKING"**

5. **Safari will ask**: "Allow location access?" → **Tap Allow**

6. **Success!** 🎉 GPS tracking will work!

## 🔧 Troubleshooting

### Issue: Build fails on Netlify

**Check build logs** in Netlify dashboard. Common fixes:

1. **Missing dependencies**:
```bash
cd frontend
npm install
git add package-lock.json
git commit -m "Add package-lock.json"
git push
```

2. **Wrong base directory**:
   - Site settings → Build & deploy → Build settings
   - Set **Base directory** to `frontend`

### Issue: Environment variables not working

1. **Check variable names** match exactly:
   - Must start with `NEXT_PUBLIC_`
   - Case-sensitive

2. **Redeploy after adding variables**:
   - Deploys → Trigger deploy → Clear cache and deploy

### Issue: Location still not working

1. **Verify HTTPS**: URL should start with `https://`
2. **Check browser console** for errors (Safari → Develop → iPhone)
3. **Clear Safari cache** on iPhone
4. **Try in Private browsing** mode first

## 📱 PWA Installation on Netlify

Once deployed with HTTPS:

1. **Open responder page** on iPhone
2. **Tap Share button**
3. **"Add to Home Screen"**
4. **App icon appears** on home screen
5. **Works offline** with service worker!

## 🎨 Custom Domain (Optional)

Want a custom domain like `emergency.yourdomain.com`?

1. **In Netlify Dashboard**:
   - Domain settings → Add custom domain
   - Follow DNS configuration steps

2. **HTTPS is automatic** with Let's Encrypt certificate

## 🔄 Automatic Deployments

Every time you push to GitHub:

```bash
git add .
git commit -m "Update responder features"
git push
```

Netlify automatically:
1. Detects the push
2. Builds the app
3. Deploys to production
4. Updates your live site

## 📊 Monitoring

**Netlify Dashboard shows**:
- Deploy status
- Build logs
- Analytics (page views)
- Error tracking
- Performance metrics

## 💰 Cost

**Free tier includes**:
- 100 GB bandwidth/month
- 300 build minutes/month
- Unlimited sites
- HTTPS included
- Perfect for this project!

## 🔐 Security Notes

**Environment Variables**:
- Never commit `.env` files to Git
- Use Netlify's environment variables
- Supabase anon key is safe to expose (RLS protects data)

**Supabase RLS**:
- Already configured
- Protects database access
- Only authenticated users can modify data

## 📝 Quick Reference

**Your Netlify Site**:
```
https://[your-site-name].netlify.app
```

**Responder Page**:
```
https://[your-site-name].netlify.app/responder
```

**Admin Dashboard**:
```
https://[your-site-name].netlify.app/admin
```

**Sample Responder IDs**:
- FIRE001, FIRE002
- MED001, MED002
- POLICE001, POLICE002

**Password**: `responder123`

---

## 🎯 Next Steps After Deployment

1. ✅ Test responder login on iPhone
2. ✅ Verify GPS tracking works
3. ✅ Install as PWA
4. ✅ Test admin dashboard
5. ✅ Share URL with team

**Ready to deploy? Follow Step 1 above!** 🚀
