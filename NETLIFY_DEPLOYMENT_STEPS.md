# 🚀 Deploy to Netlify - Step by Step

## ✅ Prerequisites Complete
- [x] Code pushed to GitHub
- [x] Supabase configured
- [x] Environment variables ready
- [x] Build configuration set

## 📋 Deployment Steps

### Step 1: Sign Up / Login to Netlify

1. Go to: **https://app.netlify.com/signup**
2. Click **"Sign up with GitHub"** (easiest option)
3. Authorize Netlify to access your GitHub account
4. You'll be redirected to Netlify dashboard

### Step 2: Import Your Project

1. Click **"Add new site"** button
2. Select **"Import an existing project"**
3. Click **"Deploy with GitHub"**
4. Find and select: **`kojowallet01/emergency-response-system`**
5. Click on the repository

### Step 3: Configure Build Settings

Netlify should auto-detect Next.js, but verify these settings:

**Build Settings:**
- **Base directory**: `frontend`
- **Build command**: `npm install && npm run build`
- **Publish directory**: `frontend/out`
- **Functions directory**: (leave empty)

### Step 4: Add Environment Variables

Click **"Add environment variables"** and add these:

**Variable 1:**
- **Key**: `NEXT_PUBLIC_SUPABASE_URL`
- **Value**: `https://gwsuuowozacvqfhvgstm.supabase.co`

**Variable 2:**
- **Key**: `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **Value**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd3c3V1b3dvemFjdnFmaHZnc3RtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcwNjE5NjQsImV4cCI6MjA5MjYzNzk2NH0.LWpIfyma09Xx1kvwaqZETsyPbJTVAEOMHEKEpv_9MDk`

### Step 5: Deploy!

1. Click **"Deploy [site-name]"** button
2. Wait 2-5 minutes for build to complete
3. Watch the build logs (optional)
4. When done, you'll see: **"Site is live"** ✅

### Step 6: Get Your URL

Your site will be live at:
```
https://[random-name].netlify.app
```

Example: `https://ghana-emergency-abc123.netlify.app`

---

## 🎯 After Deployment

### Test Your Live Site

1. **Open the URL** in your browser
2. **Test emergency reporting**:
   - Click Fire/Medical/Crime button
   - Location should work (HTTPS fixes iPhone!)
   - Test voice recording
   - Test photo upload
   - Submit a test report

3. **Test admin login**:
   - Go to: `https://your-site.netlify.app/login`
   - Login with: `kojowallet01@gmail.com`
   - Check dashboard loads
   - Check notifications work
   - Check map displays

4. **Test on mobile**:
   - Open on your iPhone
   - Test all features
   - Install as PWA (Add to Home Screen)

---

## 🔧 Optional: Custom Domain

### If you have a domain (e.g., emergency.com.gh):

1. In Netlify dashboard, go to **"Domain settings"**
2. Click **"Add custom domain"**
3. Enter your domain: `emergency.com.gh`
4. Follow DNS configuration instructions
5. Wait 24-48 hours for DNS propagation
6. SSL certificate auto-generated (free!)

### If you don't have a domain:

Your Netlify URL works perfectly! You can:
- Share it with users
- Use it in production
- Upgrade later to custom domain

---

## ⚙️ Netlify Configuration (Already Done)

Your `netlify.toml` file is already configured:

```toml
[build]
  command = "cd frontend && npm install && npm run build"
  publish = "frontend/out"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

This ensures:
- ✅ Correct build process
- ✅ Client-side routing works
- ✅ All pages accessible
- ✅ Static asset caching

---

## 🔄 Auto-Deploy Setup

**Already configured!** Every time you push to GitHub:

1. Netlify detects the push
2. Automatically builds your app
3. Deploys the new version
4. Takes 2-5 minutes

**To deploy updates:**
```bash
git add .
git commit -m "Your update message"
git push origin main
```

Netlify will auto-deploy! 🚀

---

## 📊 Monitor Your Site

### Netlify Dashboard Shows:

- ✅ **Deploy status** (success/failed)
- ✅ **Build logs** (for debugging)
- ✅ **Analytics** (page views, visitors)
- ✅ **Forms** (if you add contact forms)
- ✅ **Functions** (serverless functions)

### Access Dashboard:
https://app.netlify.com/sites/[your-site-name]

---

## 🐛 Troubleshooting

### Build Failed?

**Check build logs:**
1. Go to Netlify dashboard
2. Click on failed deploy
3. Read error messages
4. Common issues:
   - Missing environment variables
   - Wrong build command
   - Node version mismatch

**Fix:**
- Add missing env vars
- Check `netlify.toml` settings
- Push fix to GitHub

### Site Not Loading?

**Check:**
1. Build completed successfully?
2. Environment variables set correctly?
3. Supabase URL accessible?
4. Clear browser cache

### Location Still Not Working?

**Should work now with HTTPS!**
- HTTPS enables geolocation on all browsers
- Test on iPhone Safari
- Make sure to allow location permission

### Map Not Showing?

**Check:**
1. Leaflet CSS loaded?
2. Internet connection?
3. Browser console for errors?

---

## 💰 Pricing

### Free Tier (What You Get):
- ✅ **100GB bandwidth** per month
- ✅ **300 build minutes** per month
- ✅ **Unlimited sites**
- ✅ **Automatic HTTPS**
- ✅ **Global CDN**
- ✅ **Continuous deployment**

**Perfect for your emergency system!**

### When to Upgrade:
- If you exceed 100GB bandwidth
- If you need more build minutes
- If you want advanced features

**Pro Plan**: $19/month (1TB bandwidth)

---

## 🎉 Success Checklist

After deployment, verify:

- [ ] Site loads at Netlify URL
- [ ] Emergency reporting works
- [ ] Location permission works (HTTPS!)
- [ ] Voice recording works
- [ ] Photo upload works
- [ ] Admin login works
- [ ] Dashboard displays reports
- [ ] Real-time updates work
- [ ] Notifications work
- [ ] Map displays correctly
- [ ] Mobile responsive
- [ ] PWA installable

---

## 📱 Share Your App

Once deployed, share with:

**For Users (Report Emergencies):**
```
https://your-site.netlify.app
```

**For Admins (Dashboard):**
```
https://your-site.netlify.app/login
```

**Admin Credentials:**
- Fire: fire@emergency.com
- Medical: medical@emergency.com
- Crime: crime@emergency.com
- Super Admin: kojowallet01@gmail.com

---

## 🚀 Next Steps After Deployment

1. **Test thoroughly** on different devices
2. **Train admin users** on how to use dashboard
3. **Monitor usage** in Netlify analytics
4. **Collect feedback** from users
5. **Iterate and improve** based on feedback
6. **Consider custom domain** for professional look
7. **Set up monitoring** (error tracking)
8. **Plan for scaling** if usage grows

---

## 📞 Support

**Netlify Support:**
- Docs: https://docs.netlify.com
- Community: https://answers.netlify.com
- Status: https://www.netlifystatus.com

**Your App Issues:**
- Check Supabase dashboard
- Check browser console
- Check Netlify build logs
- Review error messages

---

**Deployment Time**: 10-15 minutes
**Status**: Ready to deploy! 🚀
**Last Updated**: 2026-04-25

