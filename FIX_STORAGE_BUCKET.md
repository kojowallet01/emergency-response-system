# 🔧 Fix Storage Bucket Issue

## The Problem:
"Bucket not found" error when uploading files.

## Quick Fix:

### **Option 1: Verify Bucket Name in Supabase**

1. Go to: https://supabase.com/dashboard/project/gwsuuowozacvqfhvgstm
2. Click **"Storage"** in left sidebar
3. Check if you see a bucket called **"emergency-media"**

**If YES:** The bucket exists, just refresh the page
**If NO:** Follow Option 2 below

---

### **Option 2: Create the Bucket Again**

1. Go to Storage in Supabase dashboard
2. Click **"New bucket"**
3. Name: `emergency-media`
4. Public bucket: ✅ **Check this box**
5. Click **"Create bucket"**

---

### **Option 3: Test Without Files (Temporary)**

The app now works WITHOUT file uploads! Just:

1. Go to http://localhost:3000
2. Click emergency button
3. **DON'T add voice or photos**
4. Just click "Send Alert"
5. It should work! ✅

---

## ✅ I've Already Fixed:

- File uploads are now **optional**
- If upload fails, report still goes through
- You can test the app without media files

---

## 🧪 Test Now:

1. Refresh http://localhost:3000
2. Click Fire/Medical/Crime button
3. Allow location
4. **Skip voice and photos for now**
5. Click "Send Alert"
6. Should work! ✅

Then check http://localhost:3000/admin to see the report!

---

**Try it and let me know!** 🚀
