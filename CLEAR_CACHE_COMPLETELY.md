# Clear Browser Cache - Complete Guide

## The diagonal "TRACKING ACTIVE" banner issue is caused by browser caching.

The code has been fixed, but your browser is showing an old cached version.

---

## ✅ Solution 1: Hard Refresh (Quickest)

**Windows:**
- Press `Ctrl + Shift + R` (Chrome, Firefox, Edge)
- Or `Ctrl + F5`

**Mac:**
- Press `Cmd + Shift + R`

---

## ✅ Solution 2: Clear Cache Completely

### Chrome:
1. Press `Ctrl + Shift + Delete`
2. Select "All time"
3. Check ONLY "Cached images and files"
4. Click "Clear data"
5. Refresh the page

### Firefox:
1. Press `Ctrl + Shift + Delete`
2. Select "Everything"
3. Check ONLY "Cache"
4. Click "Clear Now"
5. Refresh the page

### Edge:
1. Press `Ctrl + Shift + Delete`
2. Select "All time"
3. Check ONLY "Cached images and files"
4. Click "Clear now"
5. Refresh the page

---

## ✅ Solution 3: Incognito/Private Mode (100% Works)

This bypasses all cache:

**Chrome:**
- Press `Ctrl + Shift + N`
- Go to http://localhost:3000/responder

**Firefox:**
- Press `Ctrl + Shift + P`
- Go to http://localhost:3000/responder

**Edge:**
- Press `Ctrl + Shift + N`
- Go to http://localhost:3000/responder

---

## ✅ Solution 4: Disable Cache in DevTools

1. Press `F12` to open DevTools
2. Press `F1` to open Settings
3. Check "Disable cache (while DevTools is open)"
4. Keep DevTools open
5. Refresh the page

---

## ✅ Solution 5: Add Cache-Busting Query Parameter

Instead of:
```
http://localhost:3000/responder
```

Use:
```
http://localhost:3000/responder?v=2
```

Change the number each time to force a fresh load.

---

## 🎯 Why This Happens

Next.js caches JavaScript bundles for performance. When you rebuild, the browser may still use the old cached version. The solutions above force the browser to fetch the new version.

---

## ✅ Permanent Solution

After clearing cache once, the new version will be cached and you won't see the diagonal banner again.

---

## 🔍 Verify It's Fixed

After clearing cache, you should see:
- ✅ "TRACKING ACTIVE" as a horizontal badge (not diagonal)
- ✅ "STOP TRACKING" button below it
- ✅ No green diagonal banner overlapping content

---

## 📱 For Mobile Testing

If testing on iPhone:
1. Safari → Settings → Clear History and Website Data
2. Or use Private Browsing mode
3. Then access http://172.20.10.6:3000/responder
