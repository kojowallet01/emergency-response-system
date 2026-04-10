# ✅ Steps to Fix Admin Page 404 on Netlify

## What's Happening
Your site was deployed with the old build command that didn't install dependencies. You need to trigger a **new deploy** with the fixed command.

## 🔄 How to Redeploy on Netlify

### Step 1: Go to Netlify Dashboard
1. Visit https://app.netlify.com
2. Click on your Emergency Response System site

### Step 2: Find Your Site Name
Look at the top of the page - you'll see your site URL like:
- `https://emergency-response-abc123.netlify.app`
- Note: **emergency-response-abc123** is your site name (yours will be different)

### Step 3: Clear Cache & Redeploy
1. Click the **"Deploys"** tab
2. Click **"Clear cache and redeploy"** button (or just "Trigger deploy")
3. Wait for the build to complete (takes 2-5 minutes)
4. You'll see "Deploy published" when done

### Step 4: Test the Links
Once deployment is complete, visit:
- **Admin page**: `https://your-site-name.netlify.app/admin/`
- **Reports**: `https://your-site-name.netlify.app/reports/`
- **Home**: `https://your-site-name.netlify.app/`

## What Changed
The build command was updated from:
```
cd frontend && npm run build
```

To:
```
cd frontend && npm install && npm run build
```

This ensures dependencies are installed before building.

## If It Still Shows 404

1. Check the **Deploys** tab for build errors
2. Click the failed deploy to see the error log
3. Look for any red errors
4. If you see "npm: not found" - that means it's still using the old command
5. Contact me with the error message

## Expected Build Log Should Show
```
npm install ✓
next build ✓
Generating static pages (7/7) ✓
Deploy published ✓
```

---

**Your site URL will be visible in Netlify dashboard**  
Share your site name and I can give you the exact admin link!
