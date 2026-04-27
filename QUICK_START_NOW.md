# 🚀 QUICK START - iPhone Responder Testing

## ⚡ 3 Steps to Get Running

### ✅ Step 1: Add Firewall Rule (REQUIRED)

**Option A: Run Batch File (Easiest)**
1. Right-click `add-firewall-rule.bat`
2. Select "Run as administrator"
3. Wait for "SUCCESS!" message

**Option B: Run PowerShell Script**
1. Right-click PowerShell
2. Select "Run as administrator"
3. Run: `.\add-firewall-rule.ps1`

**Option C: Manual Command**
```powershell
# In PowerShell (as Administrator):
New-NetFirewallRule -DisplayName "Next.js Dev Server" -Direction Inbound -LocalPort 3000 -Protocol TCP -Action Allow
```

---

### ✅ Step 2: Verify Server is Running

The dev server is already running on port 3000!

**Check status:**
```powershell
netstat -ano | findstr :3000
```

**Should see:**
```
TCP    0.0.0.0:3000           0.0.0.0:0              LISTENING
```

✅ Server is ready!

---

### ✅ Step 3: Test on iPhone

**Your URLs:**
- **Responder App:** `http://172.20.10.6:3000/responder`
- **Admin Dashboard:** `http://172.20.10.6:3000/admin`

**Test Steps:**
1. Open Safari on iPhone
2. Go to: `http://172.20.10.6:3000/responder`
3. You should see "🚑 Responder Login"
4. Enter: `FIRE001`
5. Tap "Login"

---

## 🎯 Assign Responder to Report

Before testing, assign FIRE001 to a fire report:

**In Supabase SQL Editor:**
```sql
-- Get a fire report ID
SELECT id, type, status, latitude, longitude 
FROM reports 
WHERE type = 'fire' 
ORDER BY created_at DESC 
LIMIT 1;

-- Assign FIRE001 to that report (replace YOUR_REPORT_ID)
UPDATE responders 
SET current_report_id = 'YOUR_REPORT_ID', 
    status = 'assigned' 
WHERE responder_id = 'FIRE001';
```

**OR use the test report:**
```sql
UPDATE responders 
SET current_report_id = '7efcce29-6847-41fb-be35-61735e888cc0', 
    status = 'assigned' 
WHERE responder_id = 'FIRE001';
```

---

## 📱 Full Testing Flow

### On iPhone:
1. Open: `http://172.20.10.6:3000/responder`
2. Login: `FIRE001`
3. See assignment details
4. Tap: "🚀 Start Tracking"
5. Allow location permissions
6. See "📍 Tracking Active"

### On Computer:
1. Open: `http://localhost:3000/admin`
2. Login as admin
3. Open the same fire report
4. Click: "📍 Track Responders"
5. See FIRE001 in the list
6. See responder marker (🚑) on map
7. Watch location update in real-time!

---

## ✅ Success Indicators

**On iPhone:**
- ✅ Page loads (not "can't connect")
- ✅ Login works
- ✅ Assignment shows
- ✅ Tracking starts
- ✅ Current coordinates display

**On Admin Dashboard:**
- ✅ Responder appears in list
- ✅ Shows "Fire Team Alpha"
- ✅ Shows "FIRE001"
- ✅ Distance updates
- ✅ Map shows 🚑 marker

---

## 🔧 Troubleshooting

### Still can't connect from iPhone?

**1. Verify same WiFi network**
```
iPhone Settings → WiFi → Check network name
Computer → WiFi icon → Check network name
```

**2. Test on computer first**
Open in browser: `http://172.20.10.6:3000/responder`

If this works → Firewall issue
If this doesn't work → Network issue

**3. Temporarily disable firewall (testing only)**
- Windows Security → Firewall & network protection
- Turn off for Private network
- Test iPhone connection
- Turn firewall back on
- Add proper rule

**4. Check IP address again**
```powershell
ipconfig
```
Look for IPv4 Address under your WiFi adapter

**5. Restart dev server**
```powershell
# Stop current server (Ctrl+C in terminal)
# Start again:
cd frontend
npm run dev -- -H 0.0.0.0
```

---

## 📞 Quick Reference

**Your IP:** `172.20.10.6`

**URLs:**
- Responder: `http://172.20.10.6:3000/responder`
- Admin: `http://172.20.10.6:3000/admin`

**Responder IDs:**
- FIRE001, FIRE002 (Fire)
- MED001, MED002 (Medical)
- POLICE001, POLICE002 (Crime)

**Test Report ID:**
```
7efcce29-6847-41fb-be35-61735e888cc0
```

---

## 🎊 You're Ready!

1. ✅ Run `add-firewall-rule.bat` as administrator
2. ✅ Open `http://172.20.10.6:3000/responder` on iPhone
3. ✅ Login with FIRE001
4. ✅ Start tracking
5. ✅ Watch on admin dashboard!

**Good luck! 🚀**
